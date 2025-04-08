import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateRangePicker from '../../components/reports/DateRangePicker';
import ReportCard from '../../components/reports/ReportCard';
import BarChart from '../../components/charts/BarChart';
import LineChart from '../../components/charts/LineChart';
import PieChart from '../../components/charts/PieChart';
import { theme } from '../../styles/theme';
import { reportService } from '../../services/api';
import { format, subDays } from 'date-fns';

const ReportsHomeScreen = ({ navigation }: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(subDays(new Date(), 6));
  const [endDate, setEndDate] = useState(new Date());
  
  // Estados para os diferentes tipos de relatórios
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [servicePopularity, setServicePopularity] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [peakHoursData, setPeakHoursData] = useState<any>(null);
  
  // Formatar para a API
  const formatDateForApi = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  const fetchReportData = async () => {
    setIsLoading(true);
    
    try {
      // Simulação: Em produção, aqui seriam chamadas reais à API
      
      // Relatório de desempenho
      setTimeout(() => {
        setPerformanceData({
          total_appointments: 135,
          completed_appointments: 118,
          cancelled_appointments: 10,
          no_show_appointments: 7,
          completion_rate: 87.4,
          previous_completion_rate: 82.1,
          trend: 'up',
        });
        
        // Serviços mais populares
        setServicePopularity([
          { label: 'Corte de Cabelo', value: 42, color: theme.colors.primary },
          { label: 'Barba', value: 28, color: theme.colors.secondary },
          { label: 'Corte e Barba', value: 33, color: theme.colors.accent },
          { label: 'Desenho', value: 15, color: '#22C55E' },
          { label: 'Pigmentação', value: 12, color: '#F59E0B' },
        ]);
        
        // Receita por dia
        setRevenueData([
          { label: 'Seg', value: 520 },
          { label: 'Ter', value: 640 },
          { label: 'Qua', value: 580 },
          { label: 'Qui', value: 720 },
          { label: 'Sex', value: 950 },
          { label: 'Sáb', value: 1200 },
          { label: 'Dom', value: 0 },
        ]);
        
        // Horários de pico
        setPeakHoursData([
          { label: '09:00', value: 8 },
          { label: '10:00', value: 12 },
          { label: '11:00', value: 7 },
          { label: '12:00', value: 3 },
          { label: '13:00', value: 6 },
          { label: '14:00', value: 9 },
          { label: '15:00', value: 14 },
          { label: '16:00', value: 18 },
          { label: '17:00', value: 21 },
          { label: '18:00', value: 15 },
          { label: '19:00', value: 12 },
        ]);
        
        setIsLoading(false);
        setRefreshing(false);
      }, 1000);
      
      // Em produção, seriam estas chamadas:
      /*
      const [performance, services, revenue, peakHours] = await Promise.all([
        reportService.getPerformanceReport(formatDateForApi(startDate), formatDateForApi(endDate)),
        reportService.getPopularServices(formatDateForApi(startDate), formatDateForApi(endDate)),
        reportService.getRevenueReport(formatDateForApi(startDate), formatDateForApi(endDate), 'day'),
        reportService.getPeakHours(formatDateForApi(startDate), formatDateForApi(endDate))
      ]);
      
      setPerformanceData(performance);
      setServicePopularity(services);
      setRevenueData(revenue);
      setPeakHoursData(peakHours);
      
      setIsLoading(false);
      setRefreshing(false);
      */
    } catch (error) {
      console.error('Erro ao carregar dados dos relatórios:', error);
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReportData();
  };

  const handleDateRangeChange = (newStartDate: Date, newEndDate: Date) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  // Formatadores
  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };
  
  const formatPercentage = (value: number) => {
    return `${value}%`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando relatórios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Relatórios</Text>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Seletor de intervalo de datas */}
        <DateRangePicker
          onDateRangeChange={handleDateRangeChange}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />
        
        {/* Visão Geral do Desempenho */}
        <Text style={styles.sectionTitle}>Visão Geral do Desempenho</Text>
        
        <View style={styles.cardsRow}>
          <View style={styles.halfCard}>
            <ReportCard
              title="Total de Agendamentos"
              value={performanceData?.total_appointments || 0}
              color={theme.colors.primary}
            />
          </View>
          
          <View style={styles.halfCard}>
            <ReportCard
              title="Taxa de Conclusão"
              value={`${performanceData?.completion_rate || 0}%`}
              color={theme.colors.success}
              trend={
                performanceData ? {
                  direction: performanceData.completion_rate > performanceData.previous_completion_rate ? 'up' : 'down',
                  value: `${Math.abs(performanceData.completion_rate - performanceData.previous_completion_rate).toFixed(1)}%`
                } : undefined
              }
            />
          </View>
        </View>
        
        <View style={styles.cardsRow}>
          <View style={styles.halfCard}>
            <ReportCard
              title="Concluídos"
              value={performanceData?.completed_appointments || 0}
              color={theme.colors.success}
            />
          </View>
          
          <View style={styles.halfCard}>
            <ReportCard
              title="Cancelados"
              value={performanceData?.cancelled_appointments || 0}
              color={theme.colors.error}
            />
          </View>
        </View>
        
        {/* Serviços Mais Populares */}
        <Text style={styles.sectionTitle}>Serviços Mais Populares</Text>
        
        {servicePopularity && (
          <PieChart
            data={servicePopularity}
            donut={true}
            title="Distribuição de Serviços"
          />
        )}
        
        {/* Receita por Dia */}
        <Text style={styles.sectionTitle}>Receita por Dia</Text>
        
        {revenueData && (
          <View style={styles.chartCard}>
            <LineChart
              data={revenueData}
              height={200}
              title="Receita (R$)"
              formatYLabel={(value) => `R$ ${value}`}
            />
            
            <View style={styles.reportTotal}>
              <Text style={styles.reportTotalLabel}>Total no período:</Text>
              <Text style={styles.reportTotalValue}>
                {formatCurrency(revenueData.reduce((sum: number, item: any) => sum + item.value, 0))}
              </Text>
            </View>
          </View>
        )}
        
        {/* Horários de Pico */}
        <Text style={styles.sectionTitle}>Horários de Pico</Text>
        
        {peakHoursData && (
          <BarChart
            data={peakHoursData}
            height={200}
            title="Agendamentos por Horário"
          />
        )}
        
        {/* Botões para relatórios detalhados */}
        <Text style={styles.sectionTitle}>Relatórios Detalhados</Text>
        
        <View style={styles.reportButtonsContainer}>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => navigation.navigate('ProfessionalPerformance')}
          >
            <Text style={styles.reportButtonText}>Desempenho por Profissional</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => navigation.navigate('ClientAnalytics')}
          >
            <Text style={styles.reportButtonText}>Análise de Clientes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => navigation.navigate('ForecastReport')}
          >
            <Text style={styles.reportButtonText}>Previsão de Agendamentos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => navigation.navigate('LoyaltyReport')}
          >
            <Text style={styles.reportButtonText}>Relatório de Fidelidade</Text>
          </TouchableOpacity>
        </View>
        
        {/* Espaço extra no final */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: theme.spacing.lg,
  },
  headerTitle: {
    color: 'white',
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
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
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfCard: {
    width: '48%',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reportTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  reportTotalLabel: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
  },
  reportTotalValue: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  reportButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reportButton: {
    backgroundColor: 'white',
    width: '48%',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reportButtonText: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '500',
    color: theme.colors.primary,
    textAlign: 'center',
  },
});

export default ReportsHomeScreen;