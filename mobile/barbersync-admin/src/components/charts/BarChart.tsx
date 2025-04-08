import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { theme } from '../../styles/theme';

interface BarChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
  }[];
  height?: number;
  title?: string;
  showValues?: boolean;
  maxValue?: number;
  formatValue?: (value: number) => string;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 200,
  title,
  showValues = true,
  maxValue,
  formatValue = (value) => value.toString(),
}) => {
  // Calculando o valor máximo para definir a escala do gráfico
  const calculatedMaxValue = maxValue || Math.max(...data.map((item) => item.value), 1);
  
  // Largura da tela para cálculos responsivos
  const screenWidth = Dimensions.get('window').width;
  
  // Verifica se há dados
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.title}>{title || 'Dados não disponíveis'}</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Sem dados para exibir</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: height + 50 }]}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={styles.chartContainer}>
        {/* Linhas de grade horizontais */}
        <View style={styles.gridContainer}>
          {[0.25, 0.5, 0.75].map((point) => (
            <View 
              key={`grid-${point}`} 
              style={[styles.gridLine, { bottom: height * point }]}
            />
          ))}
        </View>
        
        {/* Barras do gráfico */}
        <View style={styles.barsContainer}>
          {data.map((item, index) => {
            const barHeight = (item.value / calculatedMaxValue) * height;
            const barWidth = (screenWidth - 60) / data.length - 10;
            
            return (
              <View key={`bar-${index}`} style={styles.barWrapper}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: Math.max(barHeight, 2), 
                      width: barWidth,
                      backgroundColor: item.color || theme.colors.primary,
                    }
                  ]}
                />
                {showValues && (
                  <Text style={styles.barValue}>{formatValue(item.value)}</Text>
                )}
                <Text 
                  style={styles.barLabel}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  title: {
    fontSize: theme.fontSizes.md,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  chartContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
  },
  gridContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginTop: theme.spacing.md,
    paddingBottom: 25, // Espaço para as labels
  },
  barWrapper: {
    alignItems: 'center',
  },
  bar: {
    borderTopLeftRadius: theme.borderRadius.sm,
    borderTopRightRadius: theme.borderRadius.sm,
  },
  barValue: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  barLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text,
    marginTop: 4,
    position: 'absolute',
    bottom: -20,
    width: 60,
    textAlign: 'center',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.md,
  },
});

export default BarChart;