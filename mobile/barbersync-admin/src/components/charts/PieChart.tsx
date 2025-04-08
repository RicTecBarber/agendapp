import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { theme } from '../../styles/theme';

interface DataItem {
  label: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: DataItem[];
  size?: number;
  title?: string;
  showLabels?: boolean;
  donut?: boolean;
  formatValue?: (value: number) => string;
}

const PieChart: React.FC<PieChartProps> = ({
  data,
  size = 200,
  title,
  showLabels = true,
  donut = false,
  formatValue = (value) => value.toString(),
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height: size }]}>
        <Text style={styles.title}>{title || 'Dados não disponíveis'}</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Sem dados para exibir</Text>
        </View>
      </View>
    );
  }

  // Cores padrão para o gráfico
  const defaultColors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.accent,
    '#22C55E',
    '#F59E0B',
    '#EC4899',
    '#8B5CF6',
    '#06B6D4',
    '#6366F1',
    '#0EA5E9',
  ];

  // Calculando o valor total
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Centro do círculo
  const center = size / 2;
  // Raio do círculo
  const radius = (size / 2) * 0.8;
  // Espessura do donut
  const donutThickness = radius * 0.4;
  
  // Calculando os ângulos para cada fatia
  let startAngle = 0;
  const arcs = data.map((item, index) => {
    const percentage = item.value / total;
    const endAngle = startAngle + percentage * 2 * Math.PI;
    
    // Calculando coordenadas para o caminho SVG
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    
    // Flag de arco grande (1 se > 180 graus)
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
    
    // Gerando o caminho SVG para a fatia
    let path;
    
    if (donut) {
      const innerRadius = radius - donutThickness;
      const ix1 = center + innerRadius * Math.cos(startAngle);
      const iy1 = center + innerRadius * Math.sin(startAngle);
      const ix2 = center + innerRadius * Math.cos(endAngle);
      const iy2 = center + innerRadius * Math.sin(endAngle);
      
      path = `
        M ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        L ${ix2} ${iy2}
        A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}
        Z
      `;
    } else {
      path = `
        M ${center} ${center}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        Z
      `;
    }
    
    // Coordenadas para os labels (meio da fatia)
    const labelAngle = startAngle + (endAngle - startAngle) / 2;
    const labelRadius = radius * (donut ? 0.65 : 0.6); // Ajusta a posição do label
    const labelX = center + labelRadius * Math.cos(labelAngle);
    const labelY = center + labelRadius * Math.sin(labelAngle);
    
    // Atualizando ângulo inicial para a próxima fatia
    startAngle = endAngle;
    
    return {
      path,
      color: item.color || defaultColors[index % defaultColors.length],
      label: item.label,
      value: item.value,
      percentage,
      labelX,
      labelY,
    };
  });

  return (
    <View style={[styles.container, { minHeight: size + 50 }]}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={styles.chartContainer}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G>
            {arcs.map((arc, index) => (
              <Path
                key={`arc-${index}`}
                d={arc.path}
                fill={arc.color}
                stroke="white"
                strokeWidth="1"
              />
            ))}
            
            {donut && (
              <Circle
                cx={center}
                cy={center}
                r={radius - donutThickness}
                fill="white"
              />
            )}
            
            {showLabels && (
              <>
                {arcs.map((arc, index) => (
                  // Só mostra os labels para fatias com percentagem significativa
                  arc.percentage > 0.05 && (
                    <SvgText
                      key={`label-${index}`}
                      x={arc.labelX}
                      y={arc.labelY}
                      fontSize="10"
                      fontWeight="bold"
                      fill="white"
                      textAnchor="middle"
                    >
                      {Math.round(arc.percentage * 100)}%
                    </SvgText>
                  )
                ))}
              </>
            )}
          </G>
        </Svg>
      </View>
      
      {/* Legenda */}
      <View style={styles.legendContainer}>
        {arcs.map((arc, index) => (
          <View key={`legend-${index}`} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: arc.color }]} />
            <View style={styles.legendTextContainer}>
              <Text style={styles.legendLabel} numberOfLines={1}>{arc.label}</Text>
              <Text style={styles.legendValue}>{formatValue(arc.value)} ({Math.round(arc.percentage * 100)}%)</Text>
            </View>
          </View>
        ))}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    marginTop: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.sm,
  },
  legendTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.md,
  },
  legendValue: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
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

export default PieChart;