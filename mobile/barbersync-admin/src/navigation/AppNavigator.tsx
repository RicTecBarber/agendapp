import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import ReportsHomeScreen from '../screens/reports/ReportsHomeScreen';
import ProfessionalPerformanceScreen from '../screens/reports/ProfessionalPerformanceScreen';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

// Stack navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ReportsStack = createNativeStackNavigator();

// Reports Stack Navigator
const ReportsNavigator = () => {
  return (
    <ReportsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.white,
        headerTitleStyle: {
          fontWeight: theme.fontWeights.semiBold,
        },
      }}
    >
      <ReportsStack.Screen
        name="ReportsHome"
        component={ReportsHomeScreen}
        options={{ title: 'Relatórios' }}
      />
      <ReportsStack.Screen
        name="ProfessionalPerformance"
        component={ProfessionalPerformanceScreen}
        options={{ title: 'Desempenho Profissional' }}
      />
    </ReportsStack.Navigator>
  );
};

// Main Tab Navigator (for authenticated users)
const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.white,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.white,
        headerTitleStyle: {
          fontWeight: theme.fontWeights.semiBold,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          title: 'Agendamentos',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="calendar" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsNavigator}
        options={{
          headerShown: false,
          title: 'Relatórios',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="chart" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={DashboardScreen} // Placeholder, replace with actual settings screen when created
        options={{
          title: 'Configurações',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="settings" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={DashboardScreen} // Placeholder, replace with actual profile screen when created
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="user" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// A simple tab bar icon component for demonstration
const TabBarIcon = ({ name, color, size }: { name: string, color: string, size: number }) => {
  // This would normally use an actual icon from a library
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, { color }]}>
        {name === 'dashboard' && '📊'}
        {name === 'calendar' && '📅'}
        {name === 'chart' && '📈'}
        {name === 'settings' && '⚙️'}
        {name === 'user' && '👤'}
      </Text>
    </View>
  );
};

// Root Navigator (handles authentication state)
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.primary,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
});

export default AppNavigator;