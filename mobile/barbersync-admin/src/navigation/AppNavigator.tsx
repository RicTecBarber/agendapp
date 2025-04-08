import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import ReportsHomeScreen from '../screens/reports/ReportsHomeScreen';
import ProfessionalPerformanceScreen from '../screens/reports/ProfessionalPerformanceScreen';
import { Text, View, ActivityIndicator } from 'react-native';
import { theme } from '../styles/theme';

// Para implementação futura:
// import ProfessionalsScreen from '../screens/ProfessionalsScreen';
// import ServicesScreen from '../screens/ServicesScreen';
// import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ReportsStack = createNativeStackNavigator();

// Placeholder para telas futuras
const PlaceholderScreen = ({ route }: any) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 18 }}>Tela de {route.name} em desenvolvimento</Text>
  </View>
);

// Stack Navigator para as telas de relatórios
function ReportsNavigator() {
  return (
    <ReportsStack.Navigator screenOptions={{ headerShown: false }}>
      <ReportsStack.Screen name="ReportsHome" component={ReportsHomeScreen} />
      <ReportsStack.Screen name="ProfessionalPerformance" component={ProfessionalPerformanceScreen} />
      <ReportsStack.Screen name="ClientAnalytics" component={PlaceholderScreen} />
      <ReportsStack.Screen name="ForecastReport" component={PlaceholderScreen} />
      <ReportsStack.Screen name="LoyaltyReport" component={PlaceholderScreen} />
    </ReportsStack.Navigator>
  );
}

// Navegação para usuários autenticados
function AuthenticatedNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 5,
        },
        tabBarStyle: {
          height: 60,
          paddingBottom: 10,
          paddingTop: 10,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarLabel: 'Agendamentos',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="calendar" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsNavigator}
        options={{
          tabBarLabel: 'Relatórios',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="chart" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Professionals"
        component={PlaceholderScreen}
        options={{
          tabBarLabel: 'Profissionais',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="users" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={PlaceholderScreen}
        options={{
          tabBarLabel: 'Mais',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="menu" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Componente de ícone temporário (este seria substituído por um pacote de ícones real como React Native Vector Icons)
function TabBarIcon({ name, color, size }: { name: string; color: string; size: number }) {
  return (
    <View style={{
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Text style={{ color, fontSize: 10 }}>{name[0].toUpperCase()}</Text>
    </View>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="MainApp" component={AuthenticatedNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}