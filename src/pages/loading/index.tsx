import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, Picker, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import { useAppStore } from '../../store/useAppStore';
import { Category, PrecoolStatus } from '../../types';
import { formatTime } from '../../utils/storage';
import { MARKETS, COOPERATIVES, BASES } from '../../data/mockData';
import QuickKeyboard from '../../components/QuickKeyboard';
import BatchItem from '../../components/BatchItem';

const PRECOOL_OPTIONS: { value: PrecoolStatus; label: string; color: string }[] = [
  { value: 'completed', label: '预冷完成', color: '#10B981' },
  { value: 'precooling', label: '预冷中', color: '#0EA5E9' },
  { value: 'pending', label: '待预冷', color: '#F59E0B' },
  { value: 'none', label: '未预冷', color: '#94A3B8' },
];

const LoadingPage: React.FC = () => {
  const {
    init,
    currentTrip,
    categories,
    createNewTrip,
    updateCurrentTrip,
    addBatch,
  } = useAppStore();

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [basketCount, setBasketCount] = useState<number>(30);
  const [plot, setPlot] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [cooperative, setCooperative] = useState('');
  const [base, setBase] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [precoolStatus, setPrecoolStatus] = useState<PrecoolStatus>('completed');
  const [pressureRisk, setPressureRisk] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useDidShow(() => {
    init();
  });

  const handleCreateTrip = () => {
    const trip = createNewTrip({
      driverName: '司机',
      plateNo: '',
      createdAt: formatTime(),
    });
    Taro.showToast({ title: '新趟次已创建', icon: 'success' });
    console.log('[LoadingPage] createTrip:', trip.id);
  };

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    setPressureRisk(cat.pressureRisk);
    const newBatchNo = `B${dayjs().format('MMDD')}-${String((currentTrip?.batches.length || 0) + 1).padStart(3, '0')}`;
    setBatchNo(newBatchNo);
    Taro.vibrateShort && Taro.vibrateShort({ type: 'light' });
  };

  const handleAddBatch = () => {
    if (!currentTrip) {
      Taro.showToast({ title: '请先创建趟次', icon: 'none' });
      return;
    }
    if (!selectedCategory) {
      Taro.showToast({ title: '请选择品类', icon: 'none' });
      return;
    }
    if (!basketCount || basketCount <= 0) {
      Taro.showToast({ title: '请输入筐数', icon: 'none' });
      return;
    }

    addBatch({
      tripId: currentTrip.id,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      categoryType: selectedCategory.type,
      plot: plot || `${currentTrip.batches.length + 1}号地`,
      batchNo: batchNo || `B${dayjs().format('MMDD')}-${String(currentTrip.batches.length + 1).padStart(3, '0')}`,
      cooperative: cooperative || COOPERATIVES[0],
      base: base || BASES[0],
      loadTime: formatTime(),
      precoolStatus,
      basketCount,
      targetMarket: targetMarket || MARKETS[0],
      loadOrder: currentTrip.batches.length + 1,
      pressureRisk: pressureRisk || selectedCategory.pressureRisk,
      notes: pressureRisk ? '注意不要重压' : '',
      status: 'loading',
      tempRecords: [],
      coolerRecords: [],
    });

    Taro.showToast({ title: `已录入 ${selectedCategory.name} ${basketCount}筐`, icon: 'success' });
    setSelectedCategory(null);
    setBasketCount(30);
    setPlot('');
    console.log('[LoadingPage] addBatch success:', selectedCategory.name, basketCount);
  };

  const sortedBatches = useMemo(() => {
    if (!currentTrip) return [];
    return [...currentTrip.batches].sort((a, b) => {
      const typeOrder = { root: 0, stem: 1, fruit: 2, flower: 3, leaf: 4 };
      const typeDiff = typeOrder[a.categoryType] - typeOrder[b.categoryType];
      if (typeDiff !== 0) return typeDiff;
      return b.loadOrder - a.loadOrder;
    });
  }, [currentTrip]);

  if (!currentTrip) {
    return (
      <View className={styles.page}>
        <View className={styles.tripCard}>
          <View className={styles.tripHeader}>
            <View>
              <Text className={styles.tripTitle}>暂无进行中的趟次</Text>
            </View>
          </View>
          <Text style={{ opacity: 0.8, fontSize: '28rpx', marginBottom: '32rpx', display: 'block' }}>
            点击下方按钮开始新的运输任务，开启装车录入
          </Text>
          <Button className={styles.primaryBtn} onClick={handleCreateTrip} style={{ width: '100%' }}>
            + 创建新趟次
          </Button>
        </View>
      </View>
    );
  }

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.loadingPlaceholder} />
      <View style={{ marginTop: '-500rpx' }}>
        <View className={styles.tripCard}>
          <View className={styles.tripHeader}>
            <View>
              <View className={styles.tripTitleRow}>
                <View className={styles.tripBadge}>装车中</View>
              </View>
              <Text className={styles.tripTitle} style={{ marginTop: '12rpx', display: 'block' }}>
                {currentTrip.route || `${currentTrip.startBase || '基地'} → ${currentTrip.endMarket || '市场'}`}
              </Text>
              <Text style={{ fontSize: '24rpx', opacity: 0.7, marginTop: '8rpx', display: 'block' }}>
                创建于 {currentTrip.createdAt}
              </Text>
            </View>
            <View className={styles.newTripBtn} onClick={handleCreateTrip}>
              <Text>新趟次</Text>
            </View>
          </View>
          <View className={styles.tripStats}>
            <View className={styles.tripStat}>
              <Text className={styles.tripStatLabel}>批次数量</Text>
              <View style={{ display: 'flex', alignItems: 'baseline' }}>
                <Text className={styles.tripStatValue}>{currentTrip.batches.length}</Text>
                <Text className={styles.tripStatUnit}>批</Text>
              </View>
            </View>
            <View className={styles.tripStat}>
              <Text className={styles.tripStatLabel}>装车总数</Text>
              <View style={{ display: 'flex', alignItems: 'baseline' }}>
                <Text className={styles.tripStatValue}>{currentTrip.totalBaskets}</Text>
                <Text className={styles.tripStatUnit}>筐</Text>
              </View>
            </View>
            <View className={styles.tripStat}>
              <Text className={styles.tripStatLabel}>风险批次</Text>
              <View style={{ display: 'flex', alignItems: 'baseline' }}>
                <Text className={styles.tripStatValue} style={{ color: currentTrip.batches.some(b => b.pressureRisk) ? '#FCA5A5' : '#fff' }}>
                  {currentTrip.batches.filter(b => b.pressureRisk).length}
                </Text>
                <Text className={styles.tripStatUnit}>批</Text>
              </View>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <QuickKeyboard
            categories={categories}
            selectedId={selectedCategory?.id}
            onSelect={handleSelectCategory}
          />
        </View>

        {selectedCategory && (
          <View className={styles.formCard}>
            <View style={{ display: 'flex', alignItems: 'center', marginBottom: '24rpx', paddingBottom: '24rpx', borderBottom: '1rpx solid #F1F5F9' }}>
              <Text style={{
                padding: '6rpx 16rpx', borderRadius: '8rpx', fontSize: '28rpx', fontWeight: 600,
                background: `linear-gradient(135deg, #0EA5E9, #38BDF8)`, color: '#fff', marginRight: '16rpx'
              }}>
                {selectedCategory.name}
              </Text>
              <Text style={{ fontSize: '24rpx', color: '#94A3B8' }}>
                适宜温度 {selectedCategory.tempMin}~{selectedCategory.tempMax}°C
              </Text>
            </View>

            <View className={styles.formRow}>
              <View className={styles.formItem}>
                <Text className={styles.formLabel}>筐数</Text>
                <View className={styles.inputRow}>
                  <View className={styles.numBtn} onClick={() => setBasketCount(Math.max(1, basketCount - 1))}>
                    <Text>−</Text>
                  </View>
                  <Input
                    className={styles.numInput}
                    type="number"
                    value={String(basketCount)}
                    onInput={(e) => setBasketCount(Number(e.detail.value) || 0)}
                  />
                  <View className={styles.numBtn} onClick={() => setBasketCount(basketCount + 1)}>
                    <Text>+</Text>
                  </View>
                </View>
              </View>
              <View className={styles.formItem}>
                <Text className={styles.formLabel}>批次号</Text>
                <Input
                  className={styles.formInput}
                  placeholder="自动生成"
                  value={batchNo}
                  onInput={(e) => setBatchNo(e.detail.value)}
                />
              </View>
            </View>

            <View className={styles.formRow}>
              <View className={styles.formItem}>
                <Text className={styles.formLabel}>地块</Text>
                <Input
                  className={styles.formInput}
                  placeholder="如：1号地-2区"
                  value={plot}
                  onInput={(e) => setPlot(e.detail.value)}
                />
              </View>
            </View>

            <View className={styles.formRow}>
              <View className={styles.formItem}>
                <Text className={styles.formLabel}>合作社</Text>
                <Picker
                  range={COOPERATIVES}
                  value={COOPERATIVES.indexOf(cooperative)}
                  onChange={(e) => setCooperative(COOPERATIVES[Number(e.detail.value)])}
                >
                  <View className={styles.formPicker}>
                    <Text className={classnames(!cooperative && styles.formPickerPlaceholder)}>
                      {cooperative || '选择合作社'}
                    </Text>
                  </View>
                </Picker>
              </View>
              <View className={styles.formItem}>
                <Text className={styles.formLabel}>基地</Text>
                <Picker
                  range={BASES}
                  value={BASES.indexOf(base)}
                  onChange={(e) => setBase(BASES[Number(e.detail.value)])}
                >
                  <View className={styles.formPicker}>
                    <Text className={classnames(!base && styles.formPickerPlaceholder)}>
                      {base || '选择基地'}
                    </Text>
                  </View>
                </Picker>
              </View>
            </View>

            <View className={styles.formRow}>
              <View className={styles.formItem}>
                <Text className={styles.formLabel}>目标市场</Text>
                <Picker
                  range={MARKETS}
                  value={MARKETS.indexOf(targetMarket)}
                  onChange={(e) => setTargetMarket(MARKETS[Number(e.detail.value)])}
                >
                  <View className={styles.formPicker}>
                    <Text className={classnames(!targetMarket && styles.formPickerPlaceholder)}>
                      {targetMarket || '选择市场'}
                    </Text>
                  </View>
                </Picker>
              </View>
            </View>

            <View className={styles.formRow}>
              <View className={styles.formItem}>
                <Text className={styles.formLabel}>预冷状态</Text>
                <View className={styles.precoolRow}>
                  {PRECOOL_OPTIONS.map((opt) => (
                    <View
                      key={opt.value}
                      className={classnames(
                        styles.precoolBtn,
                        precoolStatus === opt.value && styles.precoolBtnActive
                      )}
                      style={{
                        backgroundColor: precoolStatus === opt.value ? opt.color : undefined,
                      }}
                      onClick={() => setPrecoolStatus(opt.value)}
                    >
                      <Text>{opt.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View className={styles.formRow}>
              <View className={styles.formItem}>
                <Text className={styles.formLabel}>压筐风险</Text>
                <View
                  className={classnames(styles.precoolBtn, pressureRisk && styles.precoolBtnActive)}
                  style={{
                    backgroundColor: pressureRisk ? '#EF4444' : undefined,
                    maxWidth: '200rpx',
                  }}
                  onClick={() => setPressureRisk(!pressureRisk)}
                >
                  <Text>{pressureRisk ? '⚠ 有风险' : '无风险'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {currentTrip.batches.length > 0 && (
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle} style={{ fontSize: '32rpx', fontWeight: 600, color: '#0F172A' }}>
                装载顺序（{currentTrip.batches.length}批 / 共{currentTrip.totalBaskets}筐）
              </Text>
            </View>
            <View className={styles.sortHint}>
              <Text className={styles.sortHintText}>💡 按品类自动排序：根茎→茎类→果菜→花菜→叶菜（底部先装）</Text>
            </View>
            <View className={styles.listContainer}>
              {sortedBatches.map((batch) => (
                <BatchItem key={batch.id} batch={batch} showOrder={true} />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: '180rpx' }} />
      </View>

      <View className={styles.submitRow}>
        <Button
          className={styles.secondaryBtn}
          onClick={() => {
            Taro.switchTab({ url: '/pages/transport/index' });
          }}
        >
          <Text>开始运输</Text>
        </Button>
        <Button className={styles.primaryBtn} onClick={handleAddBatch}>
          <Text>+ 录入批次</Text>
        </Button>
      </View>
    </ScrollView>
  );
};

export default LoadingPage;
