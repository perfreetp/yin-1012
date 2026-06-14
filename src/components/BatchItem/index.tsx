import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { LoadBatch, CategoryType } from '../../types';

interface BatchItemProps {
  batch: LoadBatch;
  showOrder?: boolean;
  onClick?: () => void;
}

const typeColors: Record<CategoryType, { bg: string; text: string }> = {
  leaf: { bg: '#DCFCE7', text: '#15803D' },
  fruit: { bg: '#FFEDD5', text: '#C2410C' },
  root: { bg: '#F3E8FF', text: '#7E22CE' },
  stem: { bg: '#CFFAFE', text: '#0E7490' },
  flower: { bg: '#FCE7F3', text: '#BE185D' },
};

const precoolLabels: Record<string, { text: string; color: string }> = {
  completed: { text: '预冷完成', color: '#10B981' },
  precooling: { text: '预冷中', color: '#0EA5E9' },
  pending: { text: '待预冷', color: '#F59E0B' },
  none: { text: '未预冷', color: '#94A3B8' },
};

const statusLabels: Record<string, { text: string; color: string; bg: string }> = {
  loading: { text: '装货中', color: '#0EA5E9', bg: '#E0F2FE' },
  transit: { text: '运输中', color: '#F59E0B', bg: '#FEF3C7' },
  arrived: { text: '已到站', color: '#8B5CF6', bg: '#EDE9FE' },
  completed: { text: '已完成', color: '#10B981', bg: '#DCFCE7' },
};

const BatchItem: React.FC<BatchItemProps> = ({ batch, showOrder = true, onClick }) => {
  const typeColor = typeColors[batch.categoryType];
  const precoolInfo = precoolLabels[batch.precoolStatus];
  const statusInfo = statusLabels[batch.status];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({
        url: `/pages/batch-detail/index?id=${batch.id}&tripId=${batch.tripId}`,
      });
    }
  };

  return (
    <View className={styles.item} onClick={handleClick}>
      {showOrder && (
        <View className={styles.orderBadge}>
          <Text className={styles.orderNum}>{String(batch.loadOrder).padStart(2, '0')}</Text>
        </View>
      )}
      <View className={styles.content}>
        <View className={styles.header}>
          <View className={styles.categoryRow}>
            <View
              className={styles.categoryTag}
              style={{ backgroundColor: typeColor.bg }}
            >
              <Text style={{ color: typeColor.text }}>{batch.categoryName}</Text>
            </View>
            <Text className={styles.batchNo}>{batch.batchNo}</Text>
            {batch.pressureRisk && (
              <View className={styles.riskTag}>
                <Text className={styles.riskText}>⚠ 压筐</Text>
              </View>
            )}
          </View>
          <View
            className={styles.statusTag}
            style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
          >
            {statusInfo.text}
          </View>
        </View>

        <View className={styles.meta}>
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>地块</Text>
            <Text className={styles.metaValue}>{batch.plot}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>基地</Text>
            <Text className={styles.metaValue}>{batch.base}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>合作社</Text>
            <Text className={styles.metaValue}>{batch.cooperative}</Text>
          </View>
        </View>

        <View className={styles.footer}>
          <View className={styles.footerLeft}>
            <View
              className={styles.precoolTag}
              style={{ backgroundColor: `${precoolInfo.color}15`, color: precoolInfo.color }}
            >
              {precoolInfo.text}
            </View>
            <Text className={styles.timeText}>{batch.loadTime}</Text>
          </View>
          <View className={styles.footerRight}>
            <Text className={styles.basketCount}>{batch.basketCount}</Text>
            <Text className={styles.basketUnit}>筐</Text>
            {batch.lossBasketCount ? (
              <Text className={styles.lossText}>-{batch.lossBasketCount}</Text>
            ) : null}
            <View className={styles.arrow}>
              <Text>›</Text>
            </View>
          </View>
        </View>

        {batch.targetMarket && (
          <View className={styles.marketRow}>
            <Text className={styles.marketLabel}>→ 发往：</Text>
            <Text className={styles.marketValue}>{batch.targetMarket}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default BatchItem;
