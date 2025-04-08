import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Endereço da API - altere conforme necessário
const API_URL = 'http://localhost:5000/api';

// Criando a instância do axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para incluir o token de autenticação
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@BarberSync:token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Se o erro for 401 (Não Autorizado), faça logout
    if (error.response && error.response.status === 401) {
      await AsyncStorage.removeItem('@BarberSync:user');
      await AsyncStorage.removeItem('@BarberSync:token');
    }
    
    return Promise.reject(error);
  }
);

// Serviços de autenticação
export const authService = {
  login: async (username: string, password: string) => {
    const response = await api.post('/login', { username, password });
    return response.data;
  },
  logout: async () => {
    await api.post('/logout');
  },
  getCurrentUser: async () => {
    const response = await api.get('/user');
    return response.data;
  },
};

// Serviços de profissionais
export const professionalService = {
  getAll: async () => {
    const response = await api.get('/professionals');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/professionals/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/professionals', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/professionals/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/professionals/${id}`);
  },
};

// Serviços de agendamentos
export const appointmentService = {
  getAll: async () => {
    const response = await api.get('/appointments');
    return response.data;
  },
  getByDate: async (date: string) => {
    const response = await api.get(`/appointments?date=${date}`);
    return response.data;
  },
  updateStatus: async (id: number, status: string) => {
    const response = await api.put(`/appointments/${id}/status`, { status });
    return response.data;
  },
};

// Serviços de serviços
export const serviceService = {
  getAll: async () => {
    const response = await api.get('/services');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/services/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/services', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/services/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/services/${id}`);
  },
};

// Serviços de dashboard
export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
  getChartData: async () => {
    const response = await api.get('/dashboard/chart');
    return response.data;
  },
};

// Serviços de relatórios e análises
export const reportService = {
  // Relatório de desempenho por período
  getPerformanceReport: async (startDate: string, endDate: string) => {
    const response = await api.get(`/reports/performance?start_date=${startDate}&end_date=${endDate}`);
    return response.data;
  },
  
  // Relatório de desempenho por profissional
  getProfessionalPerformance: async (professionalId: number, startDate: string, endDate: string) => {
    const response = await api.get(`/reports/professional/${professionalId}?start_date=${startDate}&end_date=${endDate}`);
    return response.data;
  },
  
  // Relatório de serviços mais populares
  getPopularServices: async (startDate: string, endDate: string) => {
    const response = await api.get(`/reports/popular-services?start_date=${startDate}&end_date=${endDate}`);
    return response.data;
  },
  
  // Relatório de horários de pico
  getPeakHours: async (startDate: string, endDate: string) => {
    const response = await api.get(`/reports/peak-hours?start_date=${startDate}&end_date=${endDate}`);
    return response.data;
  },
  
  // Previsão de agendamentos para os próximos dias
  getForecast: async (days: number) => {
    const response = await api.get(`/reports/forecast?days=${days}`);
    return response.data;
  },
  
  // Análise de clientes por região
  getClientsByRegion: async () => {
    const response = await api.get('/reports/clients-by-region');
    return response.data;
  },
  
  // Análise de fidelidade de clientes
  getClientLoyalty: async () => {
    const response = await api.get('/reports/client-loyalty');
    return response.data;
  },
  
  // Relatório de receita por período
  getRevenueReport: async (startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month') => {
    const response = await api.get(`/reports/revenue?start_date=${startDate}&end_date=${endDate}&group_by=${groupBy}`);
    return response.data;
  },
};

export default api;