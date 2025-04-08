import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../styles/theme';
import { dashboardService } from '../services/api';

interface DashboardStats {
  total_appointments: number;
  pending_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  total_revenue: number;
  today_appointments: number;
}

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Em uma implementação real, isso seria substituído pela chamada de API real
      // const response = await dashboardService.getStats();
      // setStats(response);
      
      // Simulando dados para demonstração
      setStats({
        total_appointments: 238,
        pending_appointments: 12,
        completed_appointments: 220,
        cancelled_appointments: 6,
        total_revenue: 5840,
        today_appointments: 8
      });
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Olá, {user?.name || 'Admin'}</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Resumo</Text>
        
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.statValue}>{stats?.today_appointments || 0}</Text>
            <Text style={styles.statLabel}>Agendamentos hoje</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: theme.colors.success }]}>
            <Text style={styles.statValue}>
              R$ {stats?.total_revenue?.toFixed(2).replace('.', ',') || '0,00'}
            </Text>
            <Text style={styles.statLabel}>Receita Total</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{stats?.total_appointments || 0}</Text>
            <Text style={styles.statBoxLabel}>Total</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{stats?.pending_appointments || 0}</Text>
            <Text style={styles.statBoxLabel}>Pendentes</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{stats?.completed_appointments || 0}</Text>
            <Text style={styles.statBoxLabel}>Concluídos</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{stats?.cancelled_appointments || 0}</Text>
            <Text style={styles.statBoxLabel}>Cancelados</Text>
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>Acesso Rápido</Text>
        
        <View style={styles.quickLinksContainer}>
          <TouchableOpacity
            style={styles.quickLinkButton}
            onPress={() => navigation.navigate('Appointments')}
          >
            <Text style={styles.quickLinkText}>Agendamentos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickLinkButton}
            onPress={() => navigation.navigate('Professionals')}
          >
            <Text style={styles.quickLinkText}>Profissionais</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickLinkButton}
            onPress={() => navigation.navigate('Services')}
          >
            <Text style={styles.quickLinkText}>Serviços</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickLinkButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.quickLinkText}>Configurações</Text>
          </TouchableOpacity>
        </View>
        
        {/* Espaço adicional no final do scroll */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: 'white',
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: theme.fontSizes.sm,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    height: 100,
  },
  statValue: {
    color: 'white',
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: 'white',
    fontSize: theme.fontSizes.sm,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  statBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    width: '22%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statBoxValue: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  statBoxLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  quickLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickLinkButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    marginBottom: theme.spacing.md,
    height: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickLinkText: {
    fontSize: theme.fontSizes.md,
    fontWeight: '500',
    color: theme.colors.text,
  },
});