import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../styles/theme';
import { appointmentService } from '../services/api';

// Tipos
interface Appointment {
  id: number;
  client_name: string;
  client_phone: string;
  service_name: string;
  professional_name: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
}

export default function AppointmentsScreen({ navigation }: any) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateString, setDateString] = useState('');

  useEffect(() => {
    const formattedDate = selectedDate.toISOString().split('T')[0];
    setDateString(formattedDate);
    fetchAppointments(formattedDate);
  }, [selectedDate]);

  const fetchAppointments = async (date: string) => {
    try {
      // Em uma implementação real, isso seria substituído pela chamada de API real
      // const data = await appointmentService.getByDate(date);
      // setAppointments(data);
      
      // Simulando dados para demonstração
      setTimeout(() => {
        const mockAppointments: Appointment[] = [
          {
            id: 1,
            client_name: 'João Silva',
            client_phone: '(11) 98765-4321',
            service_name: 'Corte de Cabelo',
            professional_name: 'Carlos Barbeiro',
            appointment_date: date,
            appointment_time: '09:00',
            status: 'confirmed',
            price: 40.0,
          },
          {
            id: 2,
            client_name: 'Pedro Oliveira',
            client_phone: '(11) 99876-5432',
            service_name: 'Barba',
            professional_name: 'André Barbeiro',
            appointment_date: date,
            appointment_time: '10:30',
            status: 'pending',
            price: 30.0,
          },
          {
            id: 3,
            client_name: 'Marcos Santos',
            client_phone: '(11) 97654-3210',
            service_name: 'Corte e Barba',
            professional_name: 'Carlos Barbeiro',
            appointment_date: date,
            appointment_time: '14:00',
            status: 'completed',
            price: 65.0,
          },
          {
            id: 4,
            client_name: 'Lucas Fernandes',
            client_phone: '(11) 98877-6655',
            service_name: 'Corte Degradê',
            professional_name: 'André Barbeiro',
            appointment_date: date,
            appointment_time: '16:30',
            status: 'cancelled',
            price: 45.0,
          },
        ];
        setAppointments(mockAppointments);
        setIsLoading(false);
        setRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments(dateString);
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.success;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.warning;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Pendente';
    }
  };

  const handleUpdateStatus = (appointment: Appointment, newStatus: string) => {
    Alert.alert(
      'Atualizar Status',
      `Deseja marcar como "${getStatusText(newStatus)}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              // Em uma implementação real, isso seria substituído pela chamada de API real
              // await appointmentService.updateStatus(appointment.id, newStatus);
              
              // Atualizando localmente para demonstração
              const updatedAppointments = appointments.map((app) =>
                app.id === appointment.id ? { ...app, status: newStatus as any } : app
              );
              setAppointments(updatedAppointments);
              
              Alert.alert('Sucesso', 'Status atualizado com sucesso!');
            } catch (error) {
              console.error('Erro ao atualizar status:', error);
              Alert.alert('Erro', 'Não foi possível atualizar o status.');
            }
          },
        },
      ]
    );
  };

  const renderAppointmentItem = ({ item }: { item: Appointment }) => (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <Text style={styles.clientName}>{item.client_name}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.status) },
            ]}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      
      <View style={styles.appointmentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Serviço:</Text>
          <Text style={styles.detailValue}>{item.service_name}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Profissional:</Text>
          <Text style={styles.detailValue}>{item.professional_name}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Horário:</Text>
          <Text style={styles.detailValue}>{item.appointment_time}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Telefone:</Text>
          <Text style={styles.detailValue}>{item.client_phone}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Valor:</Text>
          <Text style={styles.detailValue}>
            R$ {item.price.toFixed(2).replace('.', ',')}
          </Text>
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        {item.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => handleUpdateStatus(item, 'confirmed')}
            >
              <Text style={styles.actionButtonText}>Confirmar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleUpdateStatus(item, 'cancelled')}
            >
              <Text style={styles.actionButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}
        
        {item.status === 'confirmed' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleUpdateStatus(item, 'completed')}
            >
              <Text style={styles.actionButtonText}>Concluir</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleUpdateStatus(item, 'cancelled')}
            >
              <Text style={styles.actionButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agendamentos</Text>
      </View>
      
      <View style={styles.dateSelector}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => changeDate(-1)}
        >
          <Text style={styles.dateButtonText}>Anterior</Text>
        </TouchableOpacity>
        
        <Text style={styles.currentDate}>
          {selectedDate.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
          })}
        </Text>
        
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => changeDate(1)}
        >
          <Text style={styles.dateButtonText}>Próximo</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando agendamentos...</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAppointmentItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Nenhum agendamento encontrado para esta data.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

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
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dateButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.md,
  },
  dateButtonText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  currentDate: {
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  appointmentCard: {
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
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  clientName: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: theme.fontSizes.xs,
    fontWeight: '500',
  },
  appointmentDetails: {
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    width: 100,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    flex: 1,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  actionButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.sm,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary + '20',
  },
  completeButton: {
    backgroundColor: theme.colors.success + '20',
  },
  cancelButton: {
    backgroundColor: theme.colors.error + '20',
  },
  actionButtonText: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});