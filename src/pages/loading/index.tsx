import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, Input, Picker, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, useDidHide } from '@tarojs/taro';
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

  const [showNewTripModal, setShowNewTripModal] = useState(false);
  const [newTripRoute, setNewTripRoute] = useState('');
  const [newTripStartBase, setNewTripStartBase] = useState('');
  const [newTripEndMarket, setNewTripEndMarket] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [basketCount, setBasketCount] = useState<number>(30);
  const [plot, setPlot] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [cooperative, setCooperative] = useState('');
  const [base, setBase] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [precoolStatus, setPrecoolStatus] = useState<PrecoolStatus>('completed');
  const [pressureRisk, setPressureRisk] = useState(false);

  const basketInputRef = useRef<any>(null);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    const key = e.key.toUpperCase();
    const matched = categories.find(c => c.shortKey.toUpperCase() === key);
    if (matched) {
      e.preventDefault();
      setSelectedCategory(matched);
      setPressureRisk(matched.pressureRisk);
      const newBatchNo = `B${dayjs().format('MMDD')}-${String((currentTrip?.batches.length || 0) + 1).padStart(3, '0')}`;
      setBatchNo(newBatchNo);
      Taro.vibrateShort && Taro.vibrateShort({ type: 'light' });
      setTimeout(() => {
        if (basketInputRef.current) {
          const inputEl = basketInputRef.current;
          if (inputEl.focus) inputEl.focus();
          if (inputEl.setSelectionRange && String(basketCount).length > 0) {
            try { inputEl.setSelectionRange(0, String(basketCount).length); } catch {}
          }
        }
      }, 50);
      console.log('[LoadingPage] quick key selected:', matched.shortKey, matched.name);
    }
  }, [categories, currentTrip, basketCount]);

  useEffect(() => {
    init();
  }, [init]);

  useDidShow(() => {
    init();
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyPress);
    }
  });

  useDidHide(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeyPress);
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [handleKeyPress]);

  const handleCreateTrip = () => {
    setShowNewTripModal(true);
    setNewTripStartBase('');
    setNewTripEndMarket('');
    setNewTripRoute('');
  };

  const handleConfirmCreateTrip = () => {
    const startBase = newTripStartBase || BASES[0];
    const endMarket = newTripEndMarket || MARKETS[0];
    const route = newTripRoute || `${startBase} → ${endMarket}`;

    const trip = createNewTrip({
      driverName: '司机',
      plateNo: '',
      createdAt: formatTime(),
      route,
      startBase,
      endMarket,
      status: 'loading',
    });
    setShowNewTripModal(false);
    setBase(startBase);
    setTargetMarket(endMarket);
    Taro.showToast({ title: '新趟次已创建', icon: 'success' });
    console.log('[LoadingPage] createTrip:', trip.id, route);
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
                    ref={basketInputRef}
                    className={styles.numInput}
                    type="number"
                    value={String(basketCount)}
                    focus={!!selectedCategory}
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

      {currentTrip && (
        <View className={styles.submitRow}>
          <Button
            className={styles.secondaryBtn}
            onClick={() => {
              if (currentTrip.batches.length > 0) {
                updateCurrentTrip({
                  status: 'transit',
                  departureTime: formatTime(),
                  batches: currentTrip.batches.map(b => ({ ...b, status: 'transit' }))
                });
                Taro.showToast({ title: '已发车，状态更新为运输中', icon: 'success' });
                console.log('[LoadingPage] start transit, trip:', currentTrip.id);
              }
              Taro.switchTab({ url: '/pages/transport/index' });
            }}
          >
            <Text>开始运输</Text>
          </Button>
          <Button className={styles.primaryBtn} onClick={handleAddBatch}>
            <Text>+ 录入批次</Text>
          </Button>
        </View>
      )}

      {showNewTripModal && (
        <View style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '32rpx',
        }} onClick={() => setShowNewTripModal(false)}>
          <View onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '24rpx', padding: '48rpx 32rpx',
            width: '100%', maxWidth: '640rpx',
          }}>
            <Text style={{ fontSize: '34rpx', fontWeight: 600, color: '#0F172A', marginBottom: '12rpx', display: 'block' }}>
              🚛 新建运输趟次
            </Text>
            <Text style={{ fontSize: '24rpx', color: '#94A3B8', marginBottom: '32rpx', display: 'block' }}>
              请填写本趟运输的基础信息，后续统计会按这些维度汇总
            </Text>

            <View style={{ marginBottom: '24rpx' }}>
              <Text style={{ fontSize: '26rpx', color: '#475569', marginBottom: '12rpx', display: 'block', fontWeight: 500 }}>
                起始基地
              </Text>
              <Picker
                range={BASES}
                value={BASES.indexOf(newTripStartBase)}
                onChange={(e) => {
                  const val = BASES[Number(e.detail.value)];
                  setNewTripStartBase(val);
                  if (!newTripRoute && newTripEndMarket) {
                    setNewTripRoute(`${val} → ${newTripEndMarket}`);
                  } else if (!newTripRoute) {
                    setNewTripRoute(val);
                  }
                }}
              >
                <View style={{
                  padding: '24rpx 28rpx', borderRadius: '16rpx',
                  background: '#F8FAFC', fontSize: '28rpx', color: newTripStartBase ? '#0F172A' : '#94A3B8',
                }}>
                  {newTripStartBase || '请选择起始基地'}
                </View>
              </Picker>
            </View>

            <View style={{ marginBottom: '24rpx' }}>
              <Text style={{ fontSize: '26rpx', color: '#475569', marginBottom: '12rpx', display: 'block', fontWeight: 500 }}>
                目标市场
              </Text>
              <Picker
                range={MARKETS}
                value={MARKETS.indexOf(newTripEndMarket)}
                onChange={(e) => {
                  const val = MARKETS[Number(e.detail.value)];
                  setNewTripEndMarket(val);
                  if (!newTripRoute && newTripStartBase) {
                    setNewTripRoute(`${newTripStartBase} → ${val}`);
                  } else if (!newTripRoute) {
                    setNewTripRoute(val);
                  }
                }}
              >
                <View style={{
                  padding: '24rpx 28rpx', borderRadius: '16rpx',
                  background: '#F8FAFC', fontSize: '28rpx', color: newTripEndMarket ? '#0F172A' : '#94A3B8',
                }}>
                  {newTripEndMarket || '请选择目标市场'}
                </View>
              </Picker>
            </View>

            <View style={{ marginBottom: '32rpx' }}>
              <Text style={{ fontSize: '26rpx', color: '#475569', marginBottom: '12rpx', display: 'block', fontWeight: 500 }}>
                线路名称
              </Text>
              <Input
                placeholder="如：寿光-北京新发地"
                value={newTripRoute}
                onInput={e => setNewTripRoute(e.detail.value)}
                style={{
                  padding: '24rpx 28rpx', borderRadius: '16rpx',
                  background: '#F8FAFC', fontSize: '28rpx',
                }}
              />
            </View>

            <View style={{ display: 'flex', gap: '24rpx' }}>
              <Button
                onClick={() => setShowNewTripModal(false)}
                style={{
                  flex: 1, height: '80rpx', borderRadius: '48rpx',
                  background: '#F1F5F9', color: '#475569', fontSize: '28rpx', fontWeight: 500,
                }}
              >取消</Button>
              <Button
                onClick={handleConfirmCreateTrip}
                style={{
                  flex: 1, height: '80rpx', borderRadius: '48rpx',
                  background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', color: '#fff', fontSize: '28rpx', fontWeight: 600,
                }}
              >创建趟次</Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default LoadingPage;
