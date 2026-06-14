import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useAppStore } from '../../store/useAppStore';
import { formatTime } from '../../utils/storage';
import { LoadBatch } from '../../types';

interface BatchLossState {
  [batchId: string]: number;
}

interface BatchConfirmedState {
  [batchId: string]: boolean;
}

const ArrivalPage: React.FC = () => {
  const {
    init,
    currentTrip,
    trips,
    markBatchArrived,
    markTripCompleted,
  } = useAppStore();

  const [lossState, setLossState] = useState<BatchLossState>({});
  const [confirmedState, setConfirmedState] = useState<BatchConfirmedState>({});

  useEffect(() => {
    init();
  }, [init]);

  useDidShow(() => {
    init();
  });

  const activeTrip = currentTrip || trips.find(t => t.status === 'transit' || t.status === 'arrived' || t.status === 'loading');

  useEffect(() => {
    if (activeTrip) {
      const initLoss: BatchLossState = {};
      const initConfirmed: BatchConfirmedState = {};
      activeTrip.batches.forEach(b => {
        initLoss[b.id] = b.lossBasketCount || 0;
        initConfirmed[b.id] = b.status === 'completed';
      });
      setLossState(initLoss);
      setConfirmedState(initConfirmed);
    }
  }, [activeTrip?.id]);

  const totalStats = useMemo(() => {
    if (!activeTrip) return { loaded: 0, arrived: 0, loss: 0, lossRate: 0, confirmed: 0, total: 0 };
    let loaded = 0;
    let arrived = 0;
    let confirmed = 0;
    activeTrip.batches.forEach(b => {
      loaded += b.basketCount;
      const loss = lossState[b.id] || 0;
      arrived += b.basketCount - loss;
      if (confirmedState[b.id]) confirmed += 1;
    });
    const loss = loaded - arrived;
    return {
      loaded,
      arrived,
      loss,
      lossRate: loaded > 0 ? Number(((loss / loaded) * 100).toFixed(2)) : 0,
      confirmed,
      total: activeTrip.batches.length,
    };
  }, [activeTrip, lossState, confirmedState]);

  const handleLossChange = (batchId: string, value: number) => {
    const batch = activeTrip?.batches.find(b => b.id === batchId);
    if (!batch) return;
    const clamped = Math.max(0, Math.min(batch.basketCount, value));
    setLossState(prev => ({ ...prev, [batchId]: clamped }));
  };

  const handleQuickLoss = (batchId: string, delta: number) => {
    const current = lossState[batchId] || 0;
    handleLossChange(batchId, current + delta);
  };

  const handleConfirmBatch = (batch: LoadBatch) => {
    const loss = lossState[batch.id] || 0;
    markBatchArrived(batch.id, {
      lossBasketCount: loss,
      arrivalTime: formatTime(),
    });
    setConfirmedState(prev => ({ ...prev, [batch.id]: true }));
    Taro.showToast({ title: `${batch.categoryName} 核对完成`, icon: 'success' });
    console.log('[ArrivalPage] confirmBatch:', batch.id, 'loss:', loss);
  };

  const handleCompleteTrip = () => {
    if (!activeTrip) return;
    const allConfirmed = activeTrip.batches.every(b => confirmedState[b.id]);
    if (!allConfirmed) {
      Taro.showModal({
        title: '提示',
        content: `还有 ${totalStats.total - totalStats.confirmed} 个批次未核对，确定要完成吗？`,
        success: (res) => {
          if (res.confirm) {
            activeTrip.batches.forEach(b => {
              if (!confirmedState[b.id]) {
                const loss = lossState[b.id] || 0;
                markBatchArrived(b.id, {
                  lossBasketCount: loss,
                  arrivalTime: formatTime(),
                });
              }
            });
            markTripCompleted(activeTrip.id);
            Taro.showToast({ title: '运输已完成', icon: 'success' });
          }
        }
      });
      return;
    }
    markTripCompleted(activeTrip.id);
    Taro.showToast({ title: '运输已完成！', icon: 'success' });
    console.log('[ArrivalPage] completeTrip:', activeTrip.id);
  };

  if (!activeTrip) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📦</Text>
          <Text className={styles.emptyText}>暂无进行中的运输</Text>
          <Text className={styles.emptyHint}>完成装车和运输后，在此进行到站损耗核对</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.summaryCard}>
        <Text className={styles.summaryTitle}>到站核对</Text>
        <Text className={styles.summaryRoute}>
          {activeTrip.startBase || '基地'} → {activeTrip.endMarket || '市场'}
        </Text>
        <View className={styles.summaryStats}>
          <View className={styles.summaryStat}>
            <Text className={styles.summaryStatLabel}>装车总数</Text>
            <View style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
              <Text className={styles.summaryStatValue}>{totalStats.loaded}</Text>
              <Text className={styles.summaryStatUnit}>筐</Text>
            </View>
          </View>
          <View className={styles.summaryStat}>
            <Text className={styles.summaryStatLabel}>实到总数</Text>
            <View style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
              <Text className={styles.summaryStatValue} style={{ color: totalStats.arrived === totalStats.loaded ? '#86EFAC' : '#fff' }}>
                {totalStats.arrived}
              </Text>
              <Text className={styles.summaryStatUnit}>筐</Text>
            </View>
          </View>
          <View className={styles.summaryStat}>
            <Text className={styles.summaryStatLabel}>核对进度</Text>
            <View style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
              <Text className={styles.summaryStatValue}>{totalStats.confirmed}/{totalStats.total}</Text>
            </View>
          </View>
        </View>
      </View>

      {totalStats.loss > 0 && (
        <View className={styles.totalLossCard}>
          <View className={styles.lossHeader}>
            <Text className={styles.lossTitle}>合计损耗</Text>
            <View style={{ display: 'flex', alignItems: 'baseline' }}>
              <Text className={styles.lossValue}>{totalStats.loss}</Text>
              <Text style={{ fontSize: '24rpx', marginLeft: '8rpx', color: '#92400E' }}>
                筐 / {totalStats.lossRate}%
              </Text>
            </View>
          </View>
          <View className={styles.lossBreakdown}>
            <View className={styles.lossItem}>
              <Text className={styles.lossItemLabel}>完好率</Text>
              <Text className={styles.lossItemValue}>{(100 - totalStats.lossRate).toFixed(1)}%</Text>
            </View>
            <View className={styles.lossItem}>
              <Text className={styles.lossItemLabel}>损失价值参考</Text>
              <Text className={styles.lossItemValue}>≈ ¥{totalStats.loss * 30}</Text>
            </View>
          </View>
        </View>
      )}

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>批次核对（{activeTrip.batches.length}批）</Text>
        </View>
        <View className={styles.batchList}>
          {activeTrip.batches.map(batch => {
            const loss = lossState[batch.id] || 0;
            const arrived = batch.basketCount - loss;
            const lossRate = batch.basketCount > 0 ? (loss / batch.basketCount * 100).toFixed(1) : '0';
            const isConfirmed = confirmedState[batch.id];

            const categoryColors: Record<string, { bg: string; text: string }> = {
              leaf: { bg: '#DCFCE7', text: '#15803D' },
              fruit: { bg: '#FFEDD5', text: '#C2410C' },
              root: { bg: '#F3E8FF', text: '#7E22CE' },
              stem: { bg: '#CFFAFE', text: '#0E7490' },
              flower: { bg: '#FCE7F3', text: '#BE185D' },
            };
            const catColor = categoryColors[batch.categoryType] || categoryColors.leaf;

            return (
              <View key={batch.id} className={styles.batchCard}>
                <View className={styles.batchHeader}>
                  <View className={styles.batchLeft}>
                    <View
                      className={styles.batchCategory}
                      style={{ backgroundColor: catColor.bg, color: catColor.text }}
                    >
                      <Text>{batch.categoryName}</Text>
                    </View>
                    <Text className={styles.batchNo}>{batch.batchNo}</Text>
                    {batch.sealNo && (
                      <Text style={{ fontSize: '20rpx', color: '#0EA5E9', background: '#E0F2FE', padding: '2rpx 10rpx', borderRadius: '6rpx' }}>
                        封签:{batch.sealNo}
                      </Text>
                    )}
                  </View>
                  <View className={classnames(
                    styles.batchStatus,
                    isConfirmed ? styles.statusDone : styles.statusPending
                  )}>
                    <Text>{isConfirmed ? '✓ 已核对' : '待核对'}</Text>
                  </View>
                </View>

                <View className={styles.batchMeta}>
                  <View className={styles.metaItem}>
                    <Text className={styles.metaLabel}>装车:</Text>
                    <Text className={styles.metaValue} style={{ color: '#0EA5E9', fontWeight: 600 }}>{batch.basketCount}筐</Text>
                  </View>
                  <View className={styles.metaItem}>
                    <Text className={styles.metaLabel}>地块:</Text>
                    <Text className={styles.metaValue}>{batch.plot}</Text>
                  </View>
                  <View className={styles.metaItem}>
                    <Text className={styles.metaLabel}>合作社:</Text>
                    <Text className={styles.metaValue}>{batch.cooperative}</Text>
                  </View>
                </View>

                <View className={styles.arrivalForm}>
                  <View className={styles.formRow}>
                    <View className={styles.formItem}>
                      <Text className={styles.formLabel}>损耗筐数</Text>
                      <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
                        <View
                          style={{
                            width: '64rpx', height: '64rpx', borderRadius: '12rpx',
                            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '32rpx', fontWeight: 600, color: '#64748B',
                          }}
                          onClick={() => handleQuickLoss(batch.id, -1)}
                        >
                          <Text>−</Text>
                        </View>
                        <Input
                          className={styles.formInput}
                          type="number"
                          value={String(loss)}
                          onInput={(e) => handleLossChange(batch.id, Number(e.detail.value) || 0)}
                          style={{ flex: 1 }}
                        />
                        <View
                          style={{
                            width: '64rpx', height: '64rpx', borderRadius: '12rpx',
                            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '32rpx', fontWeight: 600, color: '#64748B',
                          }}
                          onClick={() => handleQuickLoss(batch.id, 1)}
                        >
                          <Text>+</Text>
                        </View>
                      </View>
                    </View>
                    <View className={styles.formItem}>
                      <Text className={styles.formLabel}>实到筐数</Text>
                      <View className={styles.formInput} style={{
                        background: loss > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        color: loss > 0 ? '#EF4444' : '#10B981',
                      }}>
                        <Text>{arrived}</Text>
                      </View>
                    </View>
                  </View>

                  <View className={styles.formCompare}>
                    <Text className={styles.compareItem}>装车 {batch.basketCount}筐</Text>
                    <Text>→</Text>
                    {loss > 0 ? (
                      <Text className={styles.compareLoss}>-{loss}筐 ({lossRate}%)</Text>
                    ) : (
                      <Text className={styles.compareOk}>✓ 无损耗</Text>
                    )}
                    {batch.pressureRisk && loss > 0 && (
                      <Text style={{
                        fontSize: '20rpx', color: '#EF4444',
                        background: 'rgba(239, 68, 68, 0.1)',
                        padding: '2rpx 10rpx', borderRadius: '6rpx',
                      }}>压筐风险</Text>
                    )}
                  </View>

                  {!isConfirmed && (
                    <View className={styles.batchActions}>
                      <View
                        className={styles.quickBtn}
                        onClick={() => handleLossChange(batch.id, 0)}
                      >
                        <Text>清零损耗</Text>
                      </View>
                      <Button className={styles.confirmBtn} onClick={() => handleConfirmBatch(batch)}>
                        <Text>确认核对</Text>
                      </Button>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ height: '160rpx' }} />

      <View className={styles.submitBar}>
        <Button
          style={{
            flex: 1, height: '96rpx', borderRadius: '48rpx',
            background: '#F1F5F9', color: '#475569', fontSize: '28rpx', fontWeight: 500,
          }}
          onClick={() => Taro.switchTab({ url: '/pages/records/index' })}
        >
          <Text>查看历史</Text>
        </Button>
        <Button
          style={{
            flex: 2, height: '96rpx', borderRadius: '48rpx',
            background: totalStats.confirmed === totalStats.total
              ? 'linear-gradient(135deg, #10B981, #059669)'
              : 'linear-gradient(135deg, #0EA5E9, #0284C7)',
            color: '#fff', fontSize: '30rpx', fontWeight: 600,
          }}
          onClick={handleCompleteTrip}
        >
          <Text>
            {totalStats.confirmed === totalStats.total ? '✓ 完成运输任务' : `完成核对 (${totalStats.confirmed}/${totalStats.total})`}
          </Text>
        </Button>
      </View>
    </ScrollView>
  );
};

export default ArrivalPage;
