import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { theme } from '../styles/theme';
import BarChart from '../components/charts/BarChart';
import api from '../services/api';

interface DashboardStats {
  total_revenue: number;
  total_appointments: number;
  pending_appointments: number;
  completed_appointments: number;
  canceled_appointments: number;
  total_clients: number;
}

interface ChartData {
  date: string;
  revenue: number;
  appointments: number;
}

const DashboardScreen = ({ navigation }: any) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsResponse, chartResponse] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/dashboard/chart')
      ]);
      
      setStats(statsResponse.data);
      setChartData(chartResponse.data);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando informações...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  // Format chart data for the bar chart
  const revenueData = chartData.map(item => ({
    label: item.date,
    value: item.revenue
  }));

  const appointmentsData = chartData.map(item => ({
    label: item.date,
    value: item.appointments
  }));

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Dashboard</Text>
          <Text style={styles.dateText}>
            {format(new Date(), "'Hoje é' EEEE, dd 'de' MMMM", { locale: ptBR })}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.total_appointments || 0}</Text>
            <Text style={styles.statLabel}>Agendamentos</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(stats?.total_revenue || 0)}</Text>
            <Text style={styles.statLabel}>Faturamento</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.total_clients || 0}</Text>
            <Text style={styles.statLabel}>Clientes</Text>
          </View>
        </View>

        <View style={styles.appointmentStatusContainer}>
          <View style={[styles.statusCard, styles.pendingCard]}>
            <Text style={styles.statusValue}>{stats?.pending_appointments || 0}</Text>
            <Text style={styles.statusLabel}>Pendentes</Text>
          </View>
          
          <View style={[styles.statusCard, styles.completedCard]}>
            <Text style={styles.statusValue}>{stats?.completed_appointments || 0}</Text>
            <Text style={styles.statusLabel}>Concluídos</Text>
          </View>
          
          <View style={[styles.statusCard, styles.canceledCard]}>
            <Text style={styles.statusValue}>{stats?.canceled_appointments || 0}</Text>
            <Text style={styles.statusLabel}>Cancelados</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Agendamentos por Dia</Text>
        <BarChart 
          data={appointmentsData} 
          title="Últimos 7 dias" 
          barColor={theme.colors.primary}
        />

        <Text style={styles.sectionTitle}>Faturamento por Dia</Text>
        <BarChart 
          data={revenueData} 
          title="Últimos 7 dias" 
          barColor={theme.colors.secondary}
          formatYLabel={(value) => `R$ ${value}`}
        />

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Reports')}
          >
            <Text style={styles.actionButtonText}>Ver Relatórios Detalhados</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('Appointments')}
          >
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              Gerenciar Agendamentos
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.md,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  pageTitle: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  dateText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: 4,
    ...theme.shadows.sm,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  appointmentStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  statusCard: {
    flex: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: 4,
    ...theme.shadows.sm,
    alignItems: 'center',
  },
  pendingCard: {
    backgroundColor: theme.colors.warning,
  },
  completedCard: {
    backgroundColor: theme.colors.success,
  },
  canceledCard: {
    backgroundColor: theme.colors.error,
  },
  statusValue: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.white,
    marginBottom: theme.spacing.xs,
  },
  statusLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.white,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semiBold,
    color: theme.colors.text,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  actionButtonsContainer: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  actionButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.medium,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
  },
});

export default DashboardScreen;