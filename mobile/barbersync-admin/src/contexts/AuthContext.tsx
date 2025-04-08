import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Definindo os tipos
interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  signIn: (credentials: { username: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Criando o contexto
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Hook para usar o contexto
export function useAuth() {
  return useContext(AuthContext);
}

// Provider do contexto
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      setIsLoading(true);
      try {
        const storedUser = await AsyncStorage.getItem('@BarberSync:user');
        const storedToken = await AsyncStorage.getItem('@BarberSync:token');

        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading storage data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStorageData();
  }, []);

  async function signIn(credentials: { username: string; password: string }) {
    try {
      // TODO: Implementar a chamada real à API
      // Simulação básica para exemplificar
      const response = {
        user: {
          id: 1,
          username: credentials.username,
          name: 'Admin BarberSync',
          role: 'admin',
        },
        token: 'fake-jwt-token',
      };

      setUser(response.user);

      await AsyncStorage.setItem('@BarberSync:user', JSON.stringify(response.user));
      await AsyncStorage.setItem('@BarberSync:token', response.token);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await AsyncStorage.removeItem('@BarberSync:user');
      await AsyncStorage.removeItem('@BarberSync:token');
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
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
}