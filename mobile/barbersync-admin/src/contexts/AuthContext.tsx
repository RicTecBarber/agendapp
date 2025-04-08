import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      setLoading(true);
      try {
        const storedUser = await AsyncStorage.getItem('@AgendApp:user');
        const storedToken = await AsyncStorage.getItem('@AgendApp:token');
        
        if (storedUser && storedToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading auth data from storage:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadStorageData();
  }, []);

  async function signIn(username: string, password: string) {
    try {
      const response = await api.post('/api/login', { username, password });
      const userData = response.data;
      
      // Store token if your API returns it
      // const { token } = response.data;
      // await AsyncStorage.setItem('@AgendApp:token', token);
      
      // For now, we'll store the user data without a separate token
      await AsyncStorage.setItem('@AgendApp:user', JSON.stringify(userData));
      
      setUser(userData);
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await api.post('/api/logout');
      
      await AsyncStorage.removeItem('@AgendApp:user');
      await AsyncStorage.removeItem('@AgendApp:token');
      
      setUser(null);
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading,
        signIn,
        signOut,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}