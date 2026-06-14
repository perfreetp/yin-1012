import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useAppStore } from '../../store/useAppStore';

type TabType = 'cooperative' | 'base' | 'route';

const TABS: { value: TabType; label: string }[] = [
  { value: 'cooperative', label: '合作社' },
  { value: 'base', label: '基地' },
  { value: 'route', label: '线路' },
];

const getRankClass = (rank: number) => {
  if (rank === 1) return styles.rankTop1;
  if (rank === 2) return styles.rankTop2;
  if (rank === 3) return styles.rankTop3;
  return '';
};

const getLossClass = (rate: number) => {
  if (rate < 2) return styles.lossGood;
  if (rate < 5) return styles.lossNormal;
  return styles.lossBad;
};

const StatsPage: React.FC = () => {
  const { init, trips, getStatsByCooperative, getStatsByBase, getStatsByRoute } = useAppStore();
  const [tab, setTab] = useState<TabType>('cooperative');

  useEffect(() => {
    init();
  }, [init]);

  useDidShow(() => {
    init();
  });

  const overall = useMemo(() => {
    const totalTrips = trips.length;
    const totalBaskets = trips.reduce((s, t) => s + t.totalBaskets, 0);
    const totalLoss = trips.reduce((s, t) => s + (t.totalLossBaskets || 0), 0);
    const avgLoss = totalBaskets > 0 ? Number(((totalLoss / totalBaskets) * 100).toFixed(2)) : 0;
    const coops = new Set(trips.flatMap(t => t.batches.map(b => b.cooperative))).size;
    const bases = new Set(trips.flatMap(t => t.batches.map(b => b.base))).size;
    const routes = new Set(trips.filter(t => t.route).map(t => t.route)).size;
    return { totalTrips, totalBaskets, totalLoss, avgLoss, coops, bases, routes };
  }, [trips]);

  const coopStats = useMemo(() => getStatsByCooperative(), [trips]);
  const baseStats = useMemo(() => getStatsByBase(), [trips]);
  const routeStats = useMemo(() => getStatsByRoute(), [trips]);

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.overallCard}>
        <Text className={styles.overallTitle}>📊 累计运营数据（全部离线）</Text>
        <View className={styles.overallGrid}>
          <View className={styles.overallItem}>
            <Text className={styles.overallLabel}>总趟次</Text>
            <View className={styles.overallValue}>
              <Text>{overall.totalTrips}</Text>
              <Text className={styles.overallUnit}>趟</Text>
            </View>
          </View>
          <View className={styles.overallItem}>
            <Text className={styles.overallLabel}>总运量</Text>
            <View className={styles.overallValue}>
              <Text>{overall.totalBaskets}</Text>
              <Text className={styles.overallUnit}>筐</Text>
            </View>
          </View>
          <View className={styles.overallItem}>
            <Text className={styles.overallLabel}>平均损耗率</Text>
            <View className={styles.overallValue}>
              <Text style={{
                color: overall.avgLoss < 2 ? '#86EFAC' : overall.avgLoss < 5 ? '#FCD34D' : '#FCA5A5'
              }}>
                {overall.avgLoss}
              </Text>
              <Text className={styles.overallUnit}>%</Text>
            </View>
          </View>
          <View className={styles.overallItem}>
            <Text className={styles.overallLabel}>覆盖 / 合作社·基地·线路</Text>
            <View className={styles.overallValue}>
              <Text>{overall.coops}</Text>
              <Text className={styles.overallUnit}>社</Text>
              <Text style={{ fontSize: '28rpx', opacity: 0.5, margin: '0 8rpx' }}>·</Text>
              <Text>{overall.bases}</Text>
              <Text className={styles.overallUnit}>地</Text>
              <Text style={{ fontSize: '28rpx', opacity: 0.5, margin: '0 8rpx' }}>·</Text>
              <Text>{overall.routes}</Text>
              <Text className={styles.overallUnit}>线</Text>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.tabBar}>
        {TABS.map(t => (
          <View
            key={t.value}
            className={classnames(styles.tabItem, tab === t.value && styles.tabItemActive)}
            onClick={() => setTab(t.value)}
          >
            <Text>{t.label}</Text>
          </View>
        ))}
      </View>

      {tab === 'cooperative' && (
        <View className={styles.tableCard}>
          <View className={styles.tableHeader}>
            <Text className={styles.tableTitle}>合作社排名</Text>
            <Text className={styles.tableCount}>共 {coopStats.length} 家</Text>
          </View>
          {coopStats.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyText}>暂无合作社数据</Text>
            </View>
          ) : (
            <>
              <View className={classnames(styles.tableHead, styles.grid4)}>
                <Text className={styles.headCell}></Text>
                <Text className={styles.headCell}>合作社 / 批次</Text>
                <Text className={styles.headCell}>运量</Text>
                <Text className={styles.headCell}>损耗率</Text>
              </View>
              <View className={styles.tableBody}>
                {coopStats.map((item, idx) => (
                  <View key={item.cooperative} className={classnames(styles.tableRow, styles.grid4)}>
                    <View className={classnames(styles.rankBadge, getRankClass(idx + 1))}>
                      <Text>{idx + 1}</Text>
                    </View>
                    <View className={styles.rowCell}>
                      <Text className={styles.rowName}>{item.cooperative}</Text>
                      <Text className={styles.rowSub}>
                        {item.totalTrips}趟 · {item.batchCount}批
                      </Text>
                    </View>
                    <View className={styles.rowCell}>
                      <Text style={{ fontWeight: 600 }}>{item.totalBaskets}</Text>
                      <Text className={styles.rowSub}>筐</Text>
                    </View>
                    <View className={styles.rowCell}>
                      <Text className={getLossClass(item.avgLossRate)}>
                        {item.avgLossRate}%
                      </Text>
                      <Text className={styles.rowSub}>损{item.totalLossBaskets}筐</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {tab === 'base' && (
        <View className={styles.tableCard}>
          <View className={styles.tableHeader}>
            <Text className={styles.tableTitle}>基地排名</Text>
            <Text className={styles.tableCount}>共 {baseStats.length} 个</Text>
          </View>
          {baseStats.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyText}>暂无基地数据</Text>
            </View>
          ) : (
            <>
              <View className={classnames(styles.tableHead, styles.grid5)}>
                <Text className={styles.headCell}></Text>
                <Text className={styles.headCell}>基地 / 所属</Text>
                <Text className={styles.headCell}>趟次</Text>
                <Text className={styles.headCell}>运量</Text>
                <Text className={styles.headCell}>损耗率</Text>
              </View>
              <View className={styles.tableBody}>
                {baseStats.map((item, idx) => (
                  <View key={item.base} className={classnames(styles.tableRow, styles.grid5)}>
                    <View className={classnames(styles.rankBadge, getRankClass(idx + 1))}>
                      <Text>{idx + 1}</Text>
                    </View>
                    <View className={styles.rowCell}>
                      <Text className={styles.rowName}>{item.base}</Text>
                      <Text className={styles.rowSub}>{item.cooperative}</Text>
                    </View>
                    <View className={styles.rowCell}>
                      <Text style={{ fontWeight: 600 }}>{item.totalTrips}</Text>
                      <Text className={styles.rowSub}>趟</Text>
                    </View>
                    <View className={styles.rowCell}>
                      <Text style={{ fontWeight: 600 }}>{item.totalBaskets}</Text>
                      <Text className={styles.rowSub}>筐</Text>
                    </View>
                    <View className={styles.rowCell}>
                      <Text className={getLossClass(item.avgLossRate)}>
                        {item.avgLossRate}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {tab === 'route' && (
        <View className={styles.tableCard}>
          <View className={styles.tableHeader}>
            <Text className={styles.tableTitle}>线路排名</Text>
            <Text className={styles.tableCount}>共 {routeStats.length} 条</Text>
          </View>
          {routeStats.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyText}>暂无线路数据</Text>
            </View>
          ) : (
            <>
              <View className={classnames(styles.tableHead, styles.grid4)}>
                <Text className={styles.headCell}></Text>
                <Text className={styles.headCell}>线路</Text>
                <Text className={styles.headCell}>趟次 / 运量</Text>
                <Text className={styles.headCell}>损耗率</Text>
              </View>
              <View className={styles.tableBody}>
                {routeStats.map((item, idx) => (
                  <View key={item.route} className={classnames(styles.tableRow, styles.grid4)}>
                    <View className={classnames(styles.rankBadge, getRankClass(idx + 1))}>
                      <Text>{idx + 1}</Text>
                    </View>
                    <View className={styles.rowCell}>
                      <Text className={styles.rowName}>{item.route}</Text>
                    </View>
                    <View className={styles.rowCell}>
                      <Text style={{ fontWeight: 600 }}>{item.totalTrips}趟</Text>
                      <Text className={styles.rowSub}>{item.totalBaskets}筐</Text>
                    </View>
                    <View className={styles.rowCell}>
                      <Text className={getLossClass(item.avgLossRate)}>
                        {item.avgLossRate}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      )}

      <View style={{
        marginTop: '32rpx',
        padding: '24rpx 32rpx',
        background: 'rgba(14, 165, 233, 0.08)',
        borderRadius: '16rpx',
        display: 'flex',
        alignItems: 'center',
        gap: '16rpx',
      }}>
        <Text style={{ fontSize: '36rpx' }}>💡</Text>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: '24rpx',
            color: '#0369A1',
            lineHeight: 1.6,
            display: 'block',
          }}>
            所有数据均为本地离线存储，无需网络、无需登录。
            清除小程序缓存将一并清除所有账本数据。
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default StatsPage;
