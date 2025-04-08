import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Svg, Rect, Text as SvgText, Line, G } from 'react-native-svg';
import { theme } from '../../styles/theme';

interface DataPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: DataPoint[];
  height?: number;
  title?: string;
  barColor?: string;
  formatYLabel?: (value: number) => string;
}

const BarChart = ({
  data,
  height = 220,
  title,
  barColor = theme.colors.primary,
  formatYLabel = (value) => `${value}`,
}: BarChartProps) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noDataText}>Nenhum dado disponível</Text>
      </View>
    );
  }

  const width = Dimensions.get('window').width - 40;
  const chartWidth = width - 40;
  const chartHeight = height - 60;
  const barWidth = (chartWidth / data.length) * 0.6;
  const barSpacing = (chartWidth / data.length) * 0.4;
  
  const maxValue = Math.max(...data.map(item => item.value));
  const paddedMax = maxValue * 1.1; // Add 10% padding at the top
  
  // Calculate steps for Y axis
  const yAxisSteps = 5;
  const stepValue = paddedMax / yAxisSteps;

  return (
    <View style={[styles.container, { height }]}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <Svg width={width} height={chartHeight + 30}>
        {/* Y-axis lines and labels */}
        {Array.from({ length: yAxisSteps + 1 }).map((_, i) => {
          const y = chartHeight - (i * chartHeight) / yAxisSteps;
          const value = i * stepValue;
          
          return (
            <G key={`y-axis-${i}`}>
              <Line
                x1={30}
                y1={y}
                x2={width - 10}
                y2={y}
                stroke={theme.colors.border}
                strokeWidth={0.5}
                strokeDasharray={i === 0 ? [] : [3, 3]}
              />
              <SvgText
                x={25}
                y={y + 4}
                fontSize={10}
                textAnchor="end"
                fill={theme.colors.textSecondary}
              >
                {formatYLabel(value)}
              </SvgText>
            </G>
          );
        })}
        
        {/* X-axis line */}
        <Line
          x1={30}
          y1={chartHeight}
          x2={width - 10}
          y2={chartHeight}
          stroke={theme.colors.border}
          strokeWidth={1}
        />
        
        {/* Bars and labels */}
        {data.map((item, index) => {
          const barHeight = (item.value / paddedMax) * chartHeight;
          const x = 30 + index * (barWidth + barSpacing) + barSpacing / 2;
          
          return (
            <G key={`bar-${index}`}>
              <Rect
                x={x}
                y={chartHeight - barHeight}
                width={barWidth}
                height={barHeight}
                fill={barColor}
                rx={4}
              />
              
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight + 15}
                fontSize={10}
                textAnchor="middle"
                fill={theme.colors.text}
              >
                {item.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: theme.colors.text,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 40,
    color: theme.colors.textSecondary,
  },
});

export default BarChart;