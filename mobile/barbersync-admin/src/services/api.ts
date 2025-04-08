import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use specific IP address for development or production URL
let baseURL = 'https://agendapp-servicos.replit.app';

// In development, you might use your computer's IP address
if (__DEV__) {
  // You can configure this to your local development server
  // baseURL = 'http://192.168.1.X:3000';
}

const api = axios.create({
  baseURL,
  timeout: 10000,
});

// Add a request interceptor to include authentication token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@AgendApp:token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('Error setting auth token:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 (Unauthorized) and not already retrying
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token or handle authentication error
        // This depends on your specific authentication implementation
        
        // For now, just clear token and redirect to login
        await AsyncStorage.removeItem('@AgendApp:token');
        // You might want to add navigation here, but we'll leave it to the components
        
        return Promise.reject(error);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;