import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { Category, CategoryType } from '../../types';

interface QuickKeyboardProps {
  categories: Category[];
  selectedId?: string;
  onSelect: (category: Category) => void;
  showKey?: boolean;
}

const categoryTypeColors: Record<CategoryType, string> = {
  leaf: '#22C55E',
  fruit: '#F97316',
  root: '#A855F7',
  stem: '#06B6D4',
  flower: '#EC4899',
};

const QuickKeyboard: React.FC<QuickKeyboardProps> = ({
  categories,
  selectedId,
  onSelect,
  showKey = true,
}) => {
  const rows: Category[][] = [];
  const cols = 4;
  for (let i = 0; i < categories.length; i += cols) {
    rows.push(categories.slice(i, i + cols));
  }

  return (
    <View className={styles.keyboard}>
      <View className={styles.header}>
        <Text className={styles.title}>快速选品</Text>
        <Text className={styles.hint}>点击或按快捷键选择品类</Text>
      </View>
      <View className={styles.grid}>
        {rows.map((row, rIdx) => (
          <View key={rIdx} className={styles.row}>
            {row.map((cat) => {
              const color = categoryTypeColors[cat.type];
              const isSelected = selectedId === cat.id;
              return (
                <View
                  key={cat.id}
                  className={classnames(styles.key, isSelected && styles.keyActive)}
                  style={{
                    borderLeftColor: color,
                    backgroundColor: isSelected ? `${color}15` : undefined,
                  }}
                  onClick={() => onSelect(cat)}
                >
                  {showKey && (
                    <Text
                      className={styles.keyBadge}
                      style={{ backgroundColor: color }}
                    >
                      {cat.shortKey}
                    </Text>
                  )}
                  <Text
                    className={classnames(styles.keyLabel, isSelected && styles.keyLabelActive)}
                    style={{ color: isSelected ? color : undefined }}
                  >
                    {cat.name}
                  </Text>
                  <Text className={styles.keyTemp}>
                    {cat.tempMin}~{cat.tempMax}°C
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View className={styles.legend}>
        <View className={styles.legendItem}>
          <View className={styles.legendDot} style={{ backgroundColor: '#22C55E' }} />
          <Text className={styles.legendText}>叶菜</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={styles.legendDot} style={{ backgroundColor: '#F97316' }} />
          <Text className={styles.legendText}>果菜</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={styles.legendDot} style={{ backgroundColor: '#A855F7' }} />
          <Text className={styles.legendText}>根茎</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={styles.legendDot} style={{ backgroundColor: '#06B6D4' }} />
          <Text className={styles.legendText}>茎类</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={styles.legendDot} style={{ backgroundColor: '#EC4899' }} />
          <Text className={styles.legendText}>花菜</Text>
        </View>
      </View>
    </View>
  );
};

export default QuickKeyboard;
