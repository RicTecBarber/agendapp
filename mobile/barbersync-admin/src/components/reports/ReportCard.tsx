import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';

interface ReportCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
  onPress?: () => void;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
}

const ReportCard: React.FC<ReportCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = theme.colors.primary,
  onPress,
  trend,
}) => {
  const renderTrend = () => {
    if (!trend) return null;
    
    const trendColor = 
      trend.direction === 'up' 
        ? theme.colors.success 
        : trend.direction === 'down' 
          ? theme.colors.error 
          : theme.colors.textSecondary;
    
    const trendArrow = 
      trend.direction === 'up' 
        ? '↑' 
        : trend.direction === 'down' 
          ? '↓' 
          : '→';
    
    return (
      <View style={styles.trendContainer}>
        <Text style={[styles.trendArrow, { color: trendColor }]}>
          {trendArrow}
        </Text>
        <Text style={[styles.trendValue, { color: trendColor }]}>
          {trend.value}
        </Text>
      </View>
    );
  };

  const CardContent = () => (
    <View style={[styles.container, { borderLeftColor: color }]}>
      <View style={styles.leftContent}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>{value}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        {renderTrend()}
      </View>
      
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  leftContent: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  trendArrow: {
    fontSize: theme.fontSizes.sm,
    fontWeight: 'bold',
    marginRight: 2,
  },
  trendValue: {
    fontSize: theme.fontSizes.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReportCard;