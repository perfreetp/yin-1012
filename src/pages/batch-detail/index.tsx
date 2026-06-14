import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useAppStore } from '../../store/useAppStore';
import { LoadBatch, CategoryType } from '../../types';

const CATEGORY_TYPE_LABEL: Record<CategoryType, string> = {
  leaf: '叶菜类',
  fruit: '果菜类',
  root: '根茎类',
  stem: '茎菜类',
  flower: '花菜类'
};

const CATEGORY_COLOR_MAP: Record<CategoryType, string> = {
  leaf: '#10B981',
  fruit: '#F59E0B',
  root: '#8B5CF6',
  stem: '#06B6D4',
  flower: '#EC4899'
};

const PRECOOL_CONFIG: Record<string, { label: string; className: string; icon: string }> = {
  completed: { label: '预冷完成', className: 'precoolDone', icon: '✓' },
  precooling: { label: '预冷中', className: 'precoolDoing', icon: '⟳' },
  pending: { label: '待预冷', className: 'precoolDoing', icon: '⏳' },
  none: { label: '未预冷', className: 'precoolNone', icon: '✗' }
};

const BatchDetailPage: React.FC = () => {
  const router = useRouter();
  const { init, getBatchById, categories } = useAppStore();
  const [batch, setBatch] = useState<LoadBatch | null>(null);

  const batchId = router.params?.id || '';

  useEffect(() => {
    init();
    if (batchId) {
      const b = getBatchById(batchId);
      setBatch(b || null);
    }
  }, [init, batchId, getBatchById]);

  const category = useMemo(() => {
    if (!batch) return null;
    return categories.find(c => c.id === batch.categoryId) || null;
  }, [batch, categories]);

  const mergedRecords = useMemo(() => {
    if (!batch) return [];
    const all: Array<{
      id: string;
      type: 'temp' | 'cooler';
      timestamp: string;
      data: any
    }> = [];
    batch.tempRecords.forEach(r => {
      all.push({ id: r.id, type: 'temp', timestamp: r.timestamp, data: r });
    });
    batch.coolerRecords.forEach(r => {
      all.push({ id: r.id, type: 'cooler', timestamp: r.timestamp, data: r });
    });
    return all.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [batch]);

  const categoryColor = batch ? CATEGORY_COLOR_MAP[batch.categoryType] : '#0EA5E9';
  const precoolCfg = batch ? (PRECOOL_CONFIG[batch.precoolStatus] || PRECOOL_CONFIG.none) : PRECOOL_CONFIG.none;

  if (!batch) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View style={{ padding: '120rpx 32rpx', textAlign: 'center' }}>
          <Text style={{ fontSize: '64rpx', display: 'block', marginBottom: '24rpx' }}>🔍</Text>
          <Text style={{ fontSize: '28rpx', color: '#64748B' }}>未找到该批次信息</Text>
        </View>
      </ScrollView>
    );
  }

  const lossRate = batch.lossRate || 0;

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.heroCard} style={{ background: `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}CC 100%)` }}>
        <View className={styles.heroTop}>
          <View className={styles.heroCategory}>
            <View className={styles.categoryBadge}>
              {batch.categoryName.slice(0, 1)}
            </View>
            <View>
              <Text className={styles.heroCategoryName}>{batch.categoryName}</Text>
              <Text className={styles.heroCategoryType}>{CATEGORY_TYPE_LABEL[batch.categoryType]}</Text>
            </View>
          </View>
          <View className={styles.loadOrderBadge}>
            装载 #{batch.loadOrder}
          </View>
        </View>

        <View className={styles.heroInfo}>
          <View className={styles.heroInfoItem}>
            <Text className={styles.label}>批次号</Text>
            <Text className={styles.value}>{batch.batchNo}</Text>
          </View>
          <View className={styles.heroInfoItem}>
            <Text className={styles.label}>筐数</Text>
            <Text className={styles.value}>{batch.basketCount} 筐</Text>
          </View>
          <View className={styles.heroInfoItem}>
            <Text className={styles.label}>目标市场</Text>
            <Text className={styles.value}>{batch.targetMarket}</Text>
          </View>
          <View className={styles.heroInfoItem}>
            <Text className={styles.label}>上车时间</Text>
            <Text className={styles.value}>{batch.loadTime.slice(5, 16)}</Text>
          </View>
        </View>
      </View>

      {batch.arrivalBasketCount !== undefined && (
        <View className={styles.lossCard}>
          <Text className={styles.lossTitle}>📦 到站损耗核对</Text>
          <View className={styles.lossGrid}>
            <View className={styles.lossItem}>
              <Text className={styles.lossLabel}>装车</Text>
              <View style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                <Text className={styles.lossValue}>{batch.basketCount}</Text>
                <Text className={styles.lossUnit}>筐</Text>
              </View>
            </View>
            <View className={styles.lossItem}>
              <Text className={styles.lossLabel}>实到</Text>
              <View style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                <Text className={styles.lossValue}>{batch.arrivalBasketCount}</Text>
                <Text className={styles.lossUnit}>筐</Text>
              </View>
            </View>
            <View className={styles.lossItem}>
              <Text className={styles.lossLabel}>损耗率</Text>
              <View style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                <Text className={classnames(styles.lossValue, lossRate >= 5 && styles.high)}>{lossRate}</Text>
                <Text className={styles.lossUnit}>%</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <View className={styles.sectionCard}>
        <View className={styles.sectionTitle}>
          <Text className={styles.title}>📍 产地信息</Text>
        </View>
        <View className={styles.infoGrid}>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>地块</Text>
            <Text className={styles.infoValue}>{batch.plot}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>合作社</Text>
            <Text className={styles.infoValue}>{batch.cooperative}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>基地</Text>
            <Text className={styles.infoValue}>{batch.base}</Text>
          </View>
          {category && (
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>适宜温度</Text>
              <Text className={styles.infoValue}>{category.tempMin}°C ~ {category.tempMax}°C</Text>
            </View>
          )}
        </View>
        <View className={styles.statusTagRow}>
          <View className={classnames(styles.statusTag, styles[precoolCfg.className])}>
            <Text>{precoolCfg.icon} {precoolCfg.label}</Text>
          </View>
          {batch.pressureRisk ? (
            <View className={classnames(styles.statusTag, styles.riskTag)}>
              <Text>⚠ 压筐高风险</Text>
            </View>
          ) : (
            <View className={classnames(styles.statusTag, styles.safeTag)}>
              <Text>✓ 耐压强</Text>
            </View>
          )}
        </View>
      </View>

      {batch.sealNo && (
        <View className={styles.sectionCard}>
          <View className={styles.sectionTitle}>
            <Text className={styles.title}>🔒 封签信息</Text>
          </View>
          <View className={styles.sealCard}>
            <Text className={styles.sealIcon}>🔐</Text>
            <View className={styles.sealInfo}>
              <Text className={styles.sealLabel}>封签号</Text>
              <Text className={styles.sealValue}>{batch.sealNo}</Text>
            </View>
          </View>
        </View>
      )}

      <View className={styles.sectionCard}>
        <View className={styles.sectionTitle}>
          <Text className={styles.title}>📋 操作记录</Text>
          <Text className={styles.count}>{mergedRecords.length} 条</Text>
        </View>
        <View className={styles.recordList}>
          {mergedRecords.length === 0 ? (
            <View className={styles.emptyRecord}>
              暂无温湿度和保温机操作记录
            </View>
          ) : (
            mergedRecords.map(r => (
              <View key={r.id} className={styles.recordItem}>
                {r.type === 'temp' ? (
                  <>
                    <View className={classnames(styles.recordDot, styles.tempDot)} />
                    <View style={{ flex: 1 }}>
                      <Text className={styles.recordTime}>
                        {new Date(r.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <View className={styles.recordContent}>
                        <Text className={styles.tempVal}>🌡 {r.data.temperature}°C</Text>
                        <Text className={styles.humidityVal}>💧 {r.data.humidity}%</Text>
                      </View>
                      {r.data.note && (
                        <Text className={styles.recordNote}>备注：{r.data.note}</Text>
                      )}
                      {r.data.location && (
                        <Text className={styles.recordNote}>位置：{r.data.location}</Text>
                      )}
                    </View>
                  </>
                ) : (
                  <>
                    <View className={classnames(
                      styles.recordDot,
                      r.data.action === 'start' ? styles.coolerStartDot : styles.coolerStopDot
                    )} />
                    <View style={{ flex: 1 }}>
                      <Text className={styles.recordTime}>
                        {new Date(r.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <View className={styles.recordContent}>
                        {r.data.action === 'start' ? (
                          <Text className={styles.coolerStart}>❄ 保温机启动</Text>
                        ) : (
                          <Text className={styles.coolerStop}>⏹ 保温机停止</Text>
                        )}
                        {r.data.tempAtAction !== undefined && (
                          <Text style={{ marginLeft: '12rpx', color: '#64748B' }}>
                            （操作时 {r.data.tempAtAction}°C）
                          </Text>
                        )}
                      </View>
                      {r.data.note && (
                        <Text className={styles.recordNote}>备注：{r.data.note}</Text>
                      )}
                    </View>
                  </>
                )}
              </View>
            ))
          )}
        </View>
      </View>

      <View style={{ height: '80rpx' }} />
    </ScrollView>
  );
};

export default BatchDetailPage;
