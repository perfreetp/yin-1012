import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  color?: string;
  trend?: { value: string; positive?: boolean };
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  icon,
  color = '#0EA5E9',
  trend,
  onClick,
}) => {
  return (
    <View
      className={classnames(styles.card, onClick && styles.clickable)}
      style={{ borderTopColor: color }}
      onClick={onClick}
    >
      <View className={styles.header}>
        {icon && (
          <View className={styles.icon} style={{ backgroundColor: `${color}15` }}>
            <Text className={styles.iconText} style={{ color }}>{icon}</Text>
          </View>
        )}
        <Text className={styles.label}>{label}</Text>
      </View>
      <View className={styles.valueRow}>
        <Text className={styles.value} style={{ color }}>{value}</Text>
        {unit && <Text className={styles.unit}>{unit}</Text>}
      </View>
      {trend && (
        <View className={styles.trend}>
          <Text
            className={classnames(
              styles.trendText,
              trend.positive ? styles.trendUp : styles.trendDown
            )}
          >
            {trend.positive ? '↓' : '↑'} {trend.value}
          </Text>
        </View>
      )}
    </View>
  );
};

export default StatCard;
