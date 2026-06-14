import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useAppStore } from '../../store/useAppStore';
import { Trip, LoadBatch, CategoryType } from '../../types';
import TempChart from '../../components/TempChart';

const CATEGORY_TYPE_LABEL: Record<CategoryType, string> = {
  leaf: '叶菜',
  fruit: '果菜',
  root: '根茎',
  stem: '茎菜',
  flower: '花菜'
};

const CATEGORY_TYPE_COLOR: Record<CategoryType, string> = {
  leaf: '#10B981',
  fruit: '#F59E0B',
  root: '#8B5CF6',
  stem: '#06B6D4',
  flower: '#EC4899'
};

const STATUS_LABEL: Record<string, string> = {
  preparing: '准备中',
  loading: '装货中',
  transit: '运输中',
  arrived: '已到站',
  completed: '已完成'
};

const TripDetailPage: React.FC = () => {
  const router = useRouter();
  const { init, getTripById } = useAppStore();
  const [trip, setTrip] = useState<Trip | null>(null);

  const tripId = router.params?.id || '';

  useEffect(() => {
    init();
    if (tripId) {
      const t = getTripById(tripId);
      setTrip(t || null);
    }
  }, [init, tripId, getTripById]);

  const timeline = useMemo(() => {
    if (!trip) return [];
    const all: Array<{
      id: string;
      type: 'batch' | 'temp' | 'cooler';
      timestamp: string;
      data: any
    }> = [];
    trip.batches.forEach(b => {
      all.push({ id: `b-${b.id}`, type: 'batch', timestamp: b.loadTime, data: b });
    });
    trip.tempRecords.forEach(r => {
      all.push({ id: r.id, type: 'temp', timestamp: r.timestamp, data: r });
    });
    trip.coolerRecords.forEach(r => {
      all.push({ id: r.id, type: 'cooler', timestamp: r.timestamp, data: r });
    });
    return all.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [trip]);

  const tempStats = useMemo(() => {
    if (!trip || trip.tempRecords.length === 0) return null;
    const temps = trip.tempRecords.map(r => r.temperature);
    const hums = trip.tempRecords.map(r => r.humidity);
    return {
      avgTemp: Number((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)),
      maxTemp: Math.max(...temps),
      minTemp: Math.min(...temps),
      avgHumidity: Number((hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(0)),
    };
  }, [trip]);

  const handleBatchClick = (batch: LoadBatch) => {
    Taro.navigateTo({
      url: `/pages/batch-detail/index?id=${batch.id}`,
    });
    console.log('[TripDetail] view batch:', batch.id);
  };

  if (!trip) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View style={{ padding: '120rpx 32rpx', textAlign: 'center' }}>
          <Text style={{ fontSize: '64rpx', display: 'block', marginBottom: '24rpx' }}>🔍</Text>
          <Text style={{ fontSize: '28rpx', color: '#64748B' }}>未找到该趟次信息</Text>
        </View>
      </ScrollView>
    );
  }

  const lossRate = trip.totalLossRate || 0;
  const lossColor = lossRate < 2 ? 'good' : lossRate < 5 ? 'lossWarn' : 'lossBad';

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.routeHero}>
        <View className={styles.routeLine}>
          <View className={styles.routePoint}>
            <Text className={styles.pointLabel}>📍 基地</Text>
            <Text className={styles.pointName}>{trip.startBase || '-'}</Text>
          </View>
          <View className={styles.routeArrow}>→</View>
          <View className={styles.routePoint}>
            <Text className={styles.pointLabel}>🏪 市场</Text>
            <Text className={styles.pointName}>{trip.endMarket || '-'}</Text>
          </View>
        </View>

        <View className={styles.tripMeta}>
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>线路</Text>
            <Text className={styles.metaValue}>{trip.route || '-'}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>状态</Text>
            <Text className={styles.metaValue}>{STATUS_LABEL[trip.status] || trip.status}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>发车</Text>
            <Text className={styles.metaValue}>{trip.departureTime ? trip.departureTime.slice(5, 16) : '-'}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>到站</Text>
            <Text className={styles.metaValue}>{trip.arrivalTime ? trip.arrivalTime.slice(5, 16) : '-'}</Text>
          </View>
        </View>
      </View>

      <View className={styles.statsGrid}>
        <View className={classnames(styles.statBox, styles.goodStat)}>
          <Text className={styles.statBoxLabel}>批次</Text>
          <View className={styles.statBoxValue}>
            {trip.batches.length}<Text className={styles.unit}>批</Text>
          </View>
        </View>
        <View className={classnames(styles.statBox)}>
          <Text className={styles.statBoxLabel}>装车</Text>
          <View className={styles.statBoxValue}>
            {trip.totalBaskets}<Text className={styles.unit}>筐</Text>
          </View>
        </View>
        <View className={classnames(styles.statBox)}>
          <Text className={styles.statBoxLabel}>实到</Text>
          <View className={styles.statBoxValue}>
            {trip.currentBaskets}<Text className={styles.unit}>筐</Text>
          </View>
        </View>
        <View className={classnames(styles.statBox, lossColor)}>
          <Text className={styles.statBoxLabel}>损耗率</Text>
          <View className={styles.statBoxValue}>
            {lossRate}<Text className={styles.unit}>%</Text>
          </View>
        </View>
      </View>

      {trip.tempRecords.length > 0 && (
        <View className={styles.sectionCard}>
          <View className={styles.sectionTitle}>
            <Text className={styles.title}>🌡 温湿度曲线</Text>
            <Text className={styles.count}>{trip.tempRecords.length} 条</Text>
          </View>
          <TempChart records={trip.tempRecords} height={320} />
          {tempStats && (
            <View className={styles.tempSummary}>
              <View className={styles.summaryItem}>
                <Text className={styles.label}>均温</Text>
                <Text className={styles.val}>{tempStats.avgTemp}°C</Text>
              </View>
              <View className={styles.summaryItem}>
                <Text className={styles.label}>最高/最低</Text>
                <Text className={styles.val}>{tempStats.maxTemp}/{tempStats.minTemp}°C</Text>
              </View>
              <View className={styles.summaryItem}>
                <Text className={styles.label}>均湿</Text>
                <Text className={styles.val}>{tempStats.avgHumidity}%</Text>
              </View>
            </View>
          )}
        </View>
      )}

      <View className={styles.sectionCard}>
        <View className={styles.sectionTitle}>
          <Text className={styles.title}>📦 装载批次</Text>
          <Text className={styles.count}>{trip.batches.length} 批</Text>
        </View>
        <View className={styles.batchList}>
          {trip.batches.length === 0 ? (
            <View className={styles.emptyState}>暂无批次数据</View>
          ) : (
            trip.batches
              .sort((a, b) => a.loadOrder - b.loadOrder)
              .map(batch => {
                const lr = batch.lossRate || 0;
                const lrClass = lr < 2 ? 'good' : lr < 5 ? 'warn' : 'bad';
                return (
                  <View
                    key={batch.id}
                    className={styles.batchRow}
                    onClick={() => handleBatchClick(batch)}
                  >
                    <View className={styles.loadOrder}>{batch.loadOrder}</View>
                    <View className={styles.batchInfo}>
                      <View className={styles.batchTop}>
                        <Text className={styles.batchName}>{batch.categoryName}</Text>
                        <View
                          className={styles.batchType}
                          style={{ background: CATEGORY_TYPE_COLOR[batch.categoryType] }}
                        >
                          {CATEGORY_TYPE_LABEL[batch.categoryType]}
                        </View>
                        <Text className={styles.batchNo}>#{batch.batchNo}</Text>
                        {batch.pressureRisk && (
                          <Text className={styles.batchRisk}>⚠压筐</Text>
                        )}
                      </View>
                      <View className={styles.batchBottom}>
                        <Text>{batch.cooperative}</Text>
                        <Text>{batch.targetMarket}</Text>
                        <Text>{batch.basketCount}筐</Text>
                      </View>
                    </View>
                    <View className={styles.batchLoss}>
                      {batch.arrivalBasketCount !== undefined ? (
                        <>
                          <View className={classnames(styles.lossRateVal, styles[lrClass])}>
                            {lr}%
                          </View>
                          <Text className={styles.lossRateLabel}>
                            损{batch.lossBasketCount || 0}筐
                          </Text>
                        </>
                      ) : (
                        <Text className={styles.lossRateLabel} style={{ color: '#94A3B8' }}>
                          待核对
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
          )}
        </View>
      </View>

      <View className={styles.sectionCard}>
        <View className={styles.sectionTitle}>
          <Text className={styles.title}>📋 全程时间线</Text>
          <Text className={styles.count}>{timeline.length} 条</Text>
        </View>
        <View className={styles.timeline}>
          {timeline.length === 0 ? (
            <View className={styles.emptyState}>暂无操作记录</View>
          ) : (
            timeline.map(t => (
              <View key={t.id} className={styles.timelineItem}>
                <View className={classnames(
                  styles.timelineDot,
                  t.type === 'temp' && styles.tempDot,
                  t.type === 'cooler' && t.data.action === 'start' && styles.coolerStart,
                  t.type === 'cooler' && t.data.action === 'stop' && styles.coolerStop,
                  t.type === 'batch' && styles.batchDot
                )} />
                <Text className={styles.timelineTime}>
                  {new Date(t.timestamp).toLocaleString('zh-CN', {
                    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </Text>
                {t.type === 'batch' && (
                  <>
                    <Text className={styles.timelineContent}>
                      📦 装车：{t.data.categoryName} × {t.data.basketCount}筐
                    </Text>
                    <Text className={styles.timelineMeta}>
                      #{t.data.batchNo} · {t.data.cooperative} · 第{t.data.loadOrder}位
                    </Text>
                  </>
                )}
                {t.type === 'temp' && (
                  <>
                    <Text className={styles.timelineContent}>
                      🌡 {t.data.temperature}°C / 💧 {t.data.humidity}%
                    </Text>
                    {t.data.location && (
                      <Text className={styles.timelineMeta}>位置：{t.data.location}</Text>
                    )}
                  </>
                )}
                {t.type === 'cooler' && (
                  <>
                    <Text className={styles.timelineContent}>
                      {t.data.action === 'start' ? '❄ 保温机启动' : '⏹ 保温机停止'}
                      {t.data.tempAtAction !== undefined && `（${t.data.tempAtAction}°C）`}
                    </Text>
                    {t.data.note && (
                      <Text className={styles.timelineMeta}>备注：{t.data.note}</Text>
                    )}
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

export default TripDetailPage;
