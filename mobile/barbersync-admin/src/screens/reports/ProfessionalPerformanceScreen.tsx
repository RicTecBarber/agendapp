import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateRangePicker from '../../components/reports/DateRangePicker';
import BarChart from '../../components/charts/BarChart';
import PieChart from '../../components/charts/PieChart';
import { theme } from '../../styles/theme';
import { reportService } from '../../services/api';
import { format, subDays } from 'date-fns';

interface Professional {
  id: number;
  name: string;
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  completion_rate: number;
  total_revenue: number;
  average_rating: number;
}

interface ServiceBreakdown {
  label: string;
  value: number;
  color?: string;
}

interface ProfessionalDetailData {
  services: ServiceBreakdown[];
  hourlyPerformance: { label: string; value: number }[];
  weekdayPerformance: { label: string; value: number }[];
  customerSatisfaction: {
    average: number;
    breakdown: { label: string; value: number; color?: string }[];
  };
}

const ProfessionalPerformanceScreen = ({ navigation }: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [detailData, setDetailData] = useState<ProfessionalDetailData | null>(null);
  
  const formatDateForApi = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  useEffect(() => {
    fetchProfessionals();
  }, [startDate, endDate]);

  const fetchProfessionals = async () => {
    setIsLoading(true);
    
    try {
      // Simulação: Em produção, seria substituída por chamadas reais à API
      setTimeout(() => {
        const mockProfessionals: Professional[] = [
          {
            id: 1,
            name: 'Carlos Barbeiro',
            total_appointments: 85,
            completed_appointments: 76,
            cancelled_appointments: 9,
            completion_rate: 89.4,
            total_revenue: 3820,
            average_rating: 4.8,
          },
          {
            id: 2,
            name: 'André Barbeiro',
            total_appointments: 72,
            completed_appointments: 65,
            cancelled_appointments: 7,
            completion_rate: 90.3,
            total_revenue: 3250,
            average_rating: 4.7,
          },
          {
            id: 3,
            name: 'Pedro Barber',
            total_appointments: 68,
            completed_appointments: 60,
            cancelled_appointments: 8,
            completion_rate: 88.2,
            total_revenue: 3000,
            average_rating: 4.6,
          },
        ];
        
        setProfessionals(mockProfessionals);
        setIsLoading(false);
        setRefreshing(false);
      }, 1000);
      
      // Em produção, seria:
      /*
      const response = await reportService.getProfessionalPerformance(
        0, // 0 para todos os profissionais
        formatDateForApi(startDate), 
        formatDateForApi(endDate)
      );
      setProfessionals(response);
      setIsLoading(false);
      setRefreshing(false);
      */
    } catch (error) {
      console.error('Erro ao carregar dados dos profissionais:', error);
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchProfessionalDetail = async (professionalId: number) => {
    setIsLoading(true);
    
    try {
      // Simulação: Em produção, seria substituída por chamadas reais à API
      setTimeout(() => {
        const mockDetailData: ProfessionalDetailData = {
          services: [
            { label: 'Corte de Cabelo', value: 35, color: theme.colors.primary },
            { label: 'Barba', value: 18, color: theme.colors.secondary },
            { label: 'Corte e Barba', value: 20, color: theme.colors.accent },
            { label: 'Outros', value: 12, color: '#22C55E' },
          ],
          hourlyPerformance: [
            { label: '09:00', value: 6 },
            { label: '10:00', value: 8 },
            { label: '11:00', value: 5 },
            { label: '12:00', value: 2 },
            { label: '13:00', value: 4 },
            { label: '14:00', value: 7 },
            { label: '15:00', value: 9 },
            { label: '16:00', value: 12 },
            { label: '17:00', value: 14 },
            { label: '18:00', value: 10 },
            { label: '19:00', value: 8 },
          ],
          weekdayPerformance: [
            { label: 'Seg', value: 14 },
            { label: 'Ter', value: 12 },
            { label: 'Qua', value: 16 },
            { label: 'Qui', value: 15 },
            { label: 'Sex', value: 18 },
            { label: 'Sáb', value: 10 },
            { label: 'Dom', value: 0 },
          ],
          customerSatisfaction: {
            average: 4.8,
            breakdown: [
              { label: '5 estrelas', value: 58, color: '#22C55E' },
              { label: '4 estrelas', value: 14, color: '#84CC16' },
              { label: '3 estrelas', value: 3, color: '#FACC15' },
              { label: '2 estrelas', value: 1, color: '#F97316' },
              { label: '1 estrela', value: 0, color: '#EF4444' },
            ],
          },
        };
        
        setDetailData(mockDetailData);
        setIsLoading(false);
      }, 1000);
      
      // Em produção, seria:
      /*
      const response = await reportService.getProfessionalPerformance(
        professionalId,
        formatDateForApi(startDate), 
        formatDateForApi(endDate)
      );
      setDetailData(response.details);
      setIsLoading(false);
      */
    } catch (error) {
      console.error('Erro ao carregar detalhes do profissional:', error);
      setIsLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedProfessional) {
      fetchProfessionalDetail(selectedProfessional.id);
    } else {
      fetchProfessionals();
    }
  };

  const handleDateRangeChange = (newStartDate: Date, newEndDate: Date) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setSelectedProfessional(null);
    setDetailData(null);
  };

  const handleSelectProfessional = (professional: Professional) => {
    setSelectedProfessional(professional);
    fetchProfessionalDetail(professional.id);
  };

  const handleBack = () => {
    setSelectedProfessional(null);
    setDetailData(null);
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>
          {selectedProfessional 
            ? `Carregando detalhes de ${selectedProfessional.name}...` 
            : 'Carregando desempenho dos profissionais...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {selectedProfessional && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>← Voltar</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>
            {selectedProfessional 
              ? `Desempenho: ${selectedProfessional.name}` 
              : 'Desempenho de Profissionais'}
          </Text>
        </View>
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
        
        {!selectedProfessional ? (
          <>
            <Text style={styles.sectionTitle}>Resumo de Desempenho</Text>
            
            {professionals.map((professional) => (
              <TouchableOpacity 
                key={professional.id}
                style={styles.professionalCard}
                onPress={() => handleSelectProfessional(professional)}
              >
                <Text style={styles.professionalName}>{professional.name}</Text>
                
                <View style={styles.professionalStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{professional.total_appointments}</Text>
                    <Text style={styles.statLabel}>Agendamentos</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{`${professional.completion_rate}%`}</Text>
                    <Text style={styles.statLabel}>Taxa Conclusão</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{formatCurrency(professional.total_revenue)}</Text>
                    <Text style={styles.statLabel}>Receita</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{professional.average_rating}</Text>
                    <Text style={styles.statLabel}>Avaliação</Text>
                  </View>
                </View>
                
                <Text style={styles.viewDetailsText}>Toque para ver detalhes →</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            {detailData && (
              <>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Total de Agendamentos</Text>
                      <Text style={styles.summaryValue}>{selectedProfessional.total_appointments}</Text>
                    </View>
                    
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Taxa de Conclusão</Text>
                      <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                        {selectedProfessional.completion_rate}%
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Receita Total</Text>
                      <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
                        {formatCurrency(selectedProfessional.total_revenue)}
                      </Text>
                    </View>
                    
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Avaliação Média</Text>
                      <Text style={[styles.summaryValue, { color: theme.colors.warning }]}>
                        {selectedProfessional.average_rating} ★
                      </Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.sectionTitle}>Serviços Realizados</Text>
                <PieChart
                  data={detailData.services}
                  title="Distribuição de Serviços"
                  donut={true}
                  size={180}
                />
                
                <Text style={styles.sectionTitle}>Horários de Pico</Text>
                <BarChart
                  data={detailData.hourlyPerformance}
                  title="Agendamentos por Hora"
                  height={180}
                />
                
                <Text style={styles.sectionTitle}>Desempenho por Dia da Semana</Text>
                <BarChart
                  data={detailData.weekdayPerformance}
                  title="Agendamentos por Dia"
                  height={180}
                />
                
                <Text style={styles.sectionTitle}>Satisfação do Cliente</Text>
                <View style={styles.satisfactionCard}>
                  <View style={styles.satisfactionHeader}>
                    <Text style={styles.satisfactionTitle}>Avaliação Média</Text>
                    <Text style={styles.satisfactionRating}>{detailData.customerSatisfaction.average} ★</Text>
                  </View>
                  
                  <PieChart
                    data={detailData.customerSatisfaction.breakdown}
                    title="Distribuição de Avaliações"
                    size={180}
                  />
                </View>
              </>
            )}
          </>
        )}
        
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  backButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.md,
  },
  headerTitle: {
    color: 'white',
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
    flex: 1,
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
  professionalCard: {
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
  professionalName: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  professionalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  viewDetailsText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  summaryItem: {
    width: '48%',
  },
  summaryLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  satisfactionCard: {
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
  satisfactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  satisfactionTitle: {
    fontSize: theme.fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  satisfactionRating: {
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.warning,
  },
});

export default ProfessionalPerformanceScreen;