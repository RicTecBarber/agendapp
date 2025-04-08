import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText, Circle } from 'react-native-svg';
import { theme } from '../../styles/theme';

interface DataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  height?: number;
  title?: string;
  color?: string;
  showDots?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  formatYLabel?: (value: number) => string;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 200,
  title,
  color = theme.colors.primary,
  showDots = true,
  showLabels = true,
  showGrid = true,
  formatYLabel = (value) => value.toString(),
}) => {
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

  // Dimensões do gráfico
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 60; // Padding e margins
  const chartHeight = height - 50; // Espaço para título e eixos
  
  // Valores máximos e mínimos para escalar o gráfico
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  
  // Número de pontos no gráfico
  const numPoints = data.length;
  
  // Espaçamento entre os pontos
  const spacing = chartWidth / (numPoints - 1);
  
  // Função para calcular coordenadas no gráfico
  const getX = (index: number) => index * spacing;
  const getY = (value: number) => chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
  
  // Gerar pontos para o gráfico de linha
  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
  
  // Gerar valores para o eixo Y
  const yLabels = [minValue, (maxValue + minValue) / 2, maxValue];

  return (
    <View style={[styles.container, { height: height + 30 }]}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Grid do gráfico */}
          {showGrid && (
            <>
              {yLabels.map((value, index) => (
                <Line
                  key={`grid-${index}`}
                  x1="0"
                  y1={getY(value)}
                  x2={chartWidth}
                  y2={getY(value)}
                  stroke={theme.colors.border}
                  strokeWidth="1"
                  strokeDasharray="5,5"
                />
              ))}
              
              {data.map((_, index) => (
                <Line
                  key={`grid-x-${index}`}
                  x1={getX(index)}
                  y1="0"
                  x2={getX(index)}
                  y2={chartHeight}
                  stroke={index === 0 || index === numPoints - 1 ? 'transparent' : theme.colors.border}
                  strokeWidth="1"
                  strokeDasharray="5,5"
                />
              ))}
            </>
          )}
          
          {/* Linha do gráfico */}
          <Polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
          
          {/* Pontos do gráfico */}
          {showDots && (
            <>
              {data.map((d, i) => (
                <Circle
                  key={`dot-${i}`}
                  cx={getX(i)}
                  cy={getY(d.value)}
                  r="4"
                  fill="white"
                  stroke={color}
                  strokeWidth="2"
                />
              ))}
            </>
          )}
          
          {/* Rótulos do eixo Y */}
          {showLabels && (
            <>
              {yLabels.map((value, index) => (
                <SvgText
                  key={`y-label-${index}`}
                  x="5"
                  y={getY(value) + 5}
                  fontSize="10"
                  fill={theme.colors.textSecondary}
                >
                  {formatYLabel(value)}
                </SvgText>
              ))}
            </>
          )}
        </Svg>
        
        {/* Rótulos do eixo X */}
        {showLabels && (
          <View style={styles.xLabelContainer}>
            {data.map((d, i) => (
              <Text
                key={`x-label-${i}`}
                style={[
                  styles.xLabel, 
                  { 
                    width: spacing,
                    left: getX(i) - spacing / 2,
                  }
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {d.label}
              </Text>
            ))}
          </View>
        )}
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
    position: 'relative',
  },
  xLabelContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    height: 20,
  },
  xLabel: {
    fontSize: theme.fontSizes.xs,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    position: 'absolute',
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

export default LineChart;