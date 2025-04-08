import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { pt } from 'date-fns/locale';
import { theme } from '../../styles/theme';

interface DateRangePickerProps {
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
}

type PresetRange = 'today' | 'yesterday' | 'last7Days' | 'last30Days' | 'thisMonth' | 'lastMonth';

interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  onDateRangeChange,
  initialStartDate = new Date(),
  initialEndDate = new Date(),
}) => {
  const [startDate, setStartDate] = useState<Date>(initialStartDate);
  const [endDate, setEndDate] = useState<Date>(initialEndDate);
  const [selectedRange, setSelectedRange] = useState<string>('last7Days');
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const today = new Date();
  
  // Predefinições de intervalos de data
  const presets: Record<PresetRange, DateRange> = {
    today: {
      startDate: today,
      endDate: today,
      label: 'Hoje',
    },
    yesterday: {
      startDate: subDays(today, 1),
      endDate: subDays(today, 1),
      label: 'Ontem',
    },
    last7Days: {
      startDate: subDays(today, 6),
      endDate: today,
      label: 'Últimos 7 dias',
    },
    last30Days: {
      startDate: subDays(today, 29),
      endDate: today,
      label: 'Últimos 30 dias',
    },
    thisMonth: {
      startDate: startOfMonth(today),
      endDate: today,
      label: 'Este mês',
    },
    lastMonth: {
      startDate: startOfMonth(subMonths(today, 1)),
      endDate: endOfMonth(subMonths(today, 1)),
      label: 'Mês passado',
    },
  };

  const selectRange = (rangeKey: PresetRange) => {
    const range = presets[rangeKey];
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setSelectedRange(rangeKey);
    onDateRangeChange(range.startDate, range.endDate);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.dateDisplay} 
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.dateText}>
          {format(startDate, 'dd/MM/yyyy', { locale: pt })} - {format(endDate, 'dd/MM/yyyy', { locale: pt })}
        </Text>
        <Text style={styles.currentRange}>
          {presets[selectedRange as PresetRange]?.label || selectedRange}
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar período</Text>
            
            {Object.entries(presets).map(([key, range]) => (
              <TouchableOpacity 
                key={key} 
                style={[
                  styles.rangeOption,
                  selectedRange === key && styles.selectedRange
                ]}
                onPress={() => selectRange(key as PresetRange)}
              >
                <Text style={[
                  styles.rangeOptionText,
                  selectedRange === key && styles.selectedRangeText
                ]}>
                  {range.label}
                </Text>
                <Text style={styles.rangeDates}>
                  {format(range.startDate, 'dd/MM/yyyy', { locale: pt })}
                  {range.startDate.toDateString() !== range.endDate.toDateString() ? 
                    ` - ${format(range.endDate, 'dd/MM/yyyy', { locale: pt })}` : 
                    ''}
                </Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  dateDisplay: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateText: {
    fontSize: theme.fontSizes.md,
    fontWeight: '500',
    color: theme.colors.text,
  },
  currentRange: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  rangeOption: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectedRange: {
    backgroundColor: theme.colors.primary + '10',
  },
  rangeOptionText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text,
    marginBottom: 4,
  },
  selectedRangeText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  rangeDates: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  cancelButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
  },
  cancelButtonText: {
    fontSize: theme.fontSizes.md,
    fontWeight: '500',
    color: theme.colors.text,
  },
});

export default DateRangePicker;