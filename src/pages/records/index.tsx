import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useAppStore } from '../../store/useAppStore';
import { Trip } from '../../types';

type FilterType = 'all' | 'completed' | 'transit' | 'loading';

const FILTERS: { value: FilterType; label: string; count?: number }[] = [
  { value: 'all', label: '全部' },
  { value: 'completed', label: '已完成' },
  { value: 'transit', label: '运输中' },
  { value: 'loading', label: '装货中' },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed: { label: '已完成', className: 'statusCompleted' },
  transit: { label: '运输中', className: 'statusTransit' },
  loading: { label: '装货中', className: 'statusLoading' },
  arrived: { label: '已到站', className: 'statusArrived' },
  preparing: { label: '准备中', className: 'statusLoading' },
};

const RecordsPage: React.FC = () => {
  const { init, trips } = useAppStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    init();
  }, [init]);

  useDidShow(() => {
    init();
  });

  const filteredTrips = useMemo(() => {
    let result = [...trips];
    if (filter !== 'all') {
      result = result.filter(t => t.status === filter);
    }
    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      result = result.filter(t =>
        t.route.toLowerCase().includes(kw) ||
        t.startBase.toLowerCase().includes(kw) ||
        t.endMarket.toLowerCase().includes(kw) ||
        t.batches.some(b =>
          b.categoryName.toLowerCase().includes(kw) ||
          b.batchNo.toLowerCase().includes(kw) ||
          b.cooperative.toLowerCase().includes(kw)
        )
      );
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [trips, filter, search]);

  const totalStats = useMemo(() => {
    const totalTrips = trips.length;
    const totalBaskets = trips.reduce((s, t) => s + t.totalBaskets, 0);
    const totalLoss = trips.reduce((s, t) => s + (t.totalLossBaskets || 0), 0);
    const avgLoss = totalBaskets > 0 ? Number(((totalLoss / totalBaskets) * 100).toFixed(2)) : 0;
    return { totalTrips, totalBaskets, totalLoss, avgLoss };
  }, [trips]);

  const handleTripClick = (trip: Trip) => {
    Taro.navigateTo({
      url: `/pages/trip-detail/index?id=${trip.id}`,
    });
    console.log('[RecordsPage] view trip:', trip.id);
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.statsRow}>
        <View className={styles.statMini}>
          <Text className={styles.statMiniLabel}>累计趟次</Text>
          <View style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
            <Text className={styles.statMiniValue}>{totalStats.totalTrips}</Text>
            <Text className={styles.statMiniUnit}>趟</Text>
          </View>
        </View>
        <View className={styles.statMini}>
          <Text className={styles.statMiniLabel}>运量累计</Text>
          <View style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
            <Text className={styles.statMiniValue}>{totalStats.totalBaskets}</Text>
            <Text className={styles.statMiniUnit}>筐</Text>
          </View>
        </View>
        <View className={styles.statMini}>
          <Text className={styles.statMiniLabel}>平均损耗</Text>
          <View style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
            <Text
              className={styles.statMiniValue}
              style={{ color: totalStats.avgLoss < 2 ? '#10B981' : totalStats.avgLoss < 5 ? '#F59E0B' : '#EF4444' }}
            >
              {totalStats.avgLoss}
            </Text>
            <Text className={styles.statMiniUnit}>%</Text>
          </View>
        </View>
      </View>

      <View className={styles.searchBar}>
        <Input
          className={styles.searchInput}
          placeholder="搜索线路、市场、品类、合作社..."
          value={search}
          onInput={e => setSearch(e.detail.value)}
        />
      </View>

      <View className={styles.filterBar}>
        {FILTERS.map(f => {
          const count = f.value === 'all'
            ? trips.length
            : trips.filter(t => t.status === f.value).length;
          const isActive = filter === f.value;
          return (
            <View
              key={f.value}
              className={classnames(styles.filterTag, isActive && styles.filterTagActive)}
              onClick={() => setFilter(f.value)}
            >
              <Text>{f.label} ({count})</Text>
            </View>
          );
        })}
      </View>

      <View className={styles.tripList}>
        {filteredTrips.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyText}>暂无运输记录</Text>
            <Text style={{ fontSize: '24rpx', color: '#94A3B8', marginTop: '12rpx', display: 'block' }}>
              开始新的运输任务后，记录将在此显示
            </Text>
          </View>
        ) : (
          filteredTrips.map(trip => {
            const status = STATUS_CONFIG[trip.status] || STATUS_CONFIG.loading;
            const coops = Array.from(new Set(trip.batches.map(b => b.cooperative)));
            const bases = Array.from(new Set(trip.batches.map(b => b.base)));
            const lossRate = trip.totalLossRate || 0;

            return (
              <View
                key={trip.id}
                className={styles.tripCard}
                onClick={() => handleTripClick(trip)}
              >
                <View className={styles.tripHeader}>
                  <View className={styles.tripRoute}>
                    <Text className={styles.tripFromTo}>
                      {trip.startBase || '基地'} → {trip.endMarket || '市场'}
                    </Text>
                    <Text className={styles.tripTime}>
                      {trip.createdAt.slice(0, 16)}
                      {trip.arrivalTime ? ` ~ ${trip.arrivalTime.slice(5, 16)}` : ''}
                    </Text>
                  </View>
                  <View className={classnames(styles.tripStatus, styles[status.className])}>
                    <Text>{status.label}</Text>
                  </View>
                </View>

                <View className={styles.tripBody}>
                  <View className={styles.tripData}>
                    <Text className={styles.tripDataLabel}>批次</Text>
                    <View style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                      <Text className={styles.tripDataValue}>{trip.batches.length}</Text>
                      <Text className={styles.tripDataUnit}>批</Text>
                    </View>
                  </View>
                  <View className={styles.tripData}>
                    <Text className={styles.tripDataLabel}>装车</Text>
                    <View style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                      <Text className={styles.tripDataValue}>{trip.totalBaskets}</Text>
                      <Text className={styles.tripDataUnit}>筐</Text>
                    </View>
                  </View>
                  <View className={styles.tripData}>
                    <Text className={styles.tripDataLabel}>实到</Text>
                    <View style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                      <Text className={styles.tripDataValue}>{trip.currentBaskets}</Text>
                      <Text className={styles.tripDataUnit}>筐</Text>
                    </View>
                  </View>
                  <View className={styles.tripData}>
                    <Text className={styles.tripDataLabel}>损耗率</Text>
                    <View style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                      <Text
                        className={classnames(
                          styles.tripDataValue,
                          lossRate < 2 ? styles.tripLossGood : lossRate < 5 ? '' : styles.tripLossBad
                        )}
                      >
                        {lossRate}
                      </Text>
                      <Text className={styles.tripDataUnit}>%</Text>
                    </View>
                  </View>
                </View>

                <View className={styles.tripTags}>
                  {trip.route && (
                    <View className={classnames(styles.miniTag, styles.tagRoute)}>
                      <Text>{trip.route}</Text>
                    </View>
                  )}
                  {coops.slice(0, 2).map(c => (
                    <View key={c} className={classnames(styles.miniTag, styles.tagCoop)}>
                      <Text>{c}</Text>
                    </View>
                  ))}
                  {bases.slice(0, 1).map(b => (
                    <View key={b} className={classnames(styles.miniTag, styles.tagBase)}>
                      <Text>{b}</Text>
                    </View>
                  ))}
                  {trip.batches.some(b => b.pressureRisk) && (
                    <View className={styles.miniTag} style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                      <Text>⚠ 含压筐风险</Text>
                    </View>
                  )}
                  {trip.batches.some(b => b.sealNo) && (
                    <View className={styles.miniTag} style={{ background: 'rgba(14,165,233,0.1)', color: '#0284C7' }}>
                      <Text>🔒 有封签</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={{ height: '80rpx' }} />
    </ScrollView>
  );
};

export default RecordsPage;
