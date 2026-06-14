import React, { useState, useEffect } from 'react';
import { View, Text, Input, Button, ScrollView, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useAppStore } from '../../store/useAppStore';
import { formatTime } from '../../utils/storage';
import TempChart from '../../components/TempChart';

const TransportPage: React.FC = () => {
  const {
    init,
    currentTrip,
    trips,
    addTempRecord,
    addCoolerRecord,
    updateBatch,
    updateCurrentTrip,
  } = useAppStore();

  const [showTempModal, setShowTempModal] = useState(false);
  const [showSealModal, setShowSealModal] = useState(false);
  const [temperature, setTemperature] = useState<string>('3.5');
  const [humidity, setHumidity] = useState<string>('85');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [sealNo, setSealNo] = useState('');
  const [sealPhoto, setSealPhoto] = useState<string>('');
  const [coolerRunning, setCoolerRunning] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useDidShow(() => {
    init();
  });

  useEffect(() => {
    if (currentTrip && currentTrip.coolerRecords.length > 0) {
      const last = currentTrip.coolerRecords[currentTrip.coolerRecords.length - 1];
      setCoolerRunning(last.action === 'start');
    }
  }, [currentTrip]);

  const activeTrip = currentTrip || trips.find(t => t.status === 'transit' || t.status === 'loading');

  const lastTemp = activeTrip?.tempRecords[activeTrip.tempRecords.length - 1];
  const lastHum = activeTrip?.tempRecords[activeTrip.tempRecords.length - 1];

  const handleCoolerToggle = () => {
    if (!activeTrip) {
      Taro.showToast({ title: '请先创建趟次', icon: 'none' });
      return;
    }
    const action = coolerRunning ? 'stop' : 'start';
    addCoolerRecord({
      action: action as 'start' | 'stop',
      timestamp: formatTime(),
      tempAtAction: lastTemp?.temperature,
      note: action === 'start' ? '开启保温机' : '关闭保温机',
    }, activeTrip.id);
    setCoolerRunning(!coolerRunning);
    Taro.showToast({
      title: coolerRunning ? '已关闭保温机' : '已开启保温机',
      icon: 'success',
    });
    console.log('[TransportPage] cooler action:', action, 'trip:', activeTrip.id);

    if (!currentTrip && activeTrip.status !== 'transit') {
      updateCurrentTrip({ status: 'transit', departureTime: formatTime() });
    }
  };

  const handleSubmitTemp = () => {
    if (!activeTrip) {
      Taro.showToast({ title: '请先创建趟次', icon: 'none' });
      return;
    }
    const temp = parseFloat(temperature);
    const hum = parseFloat(humidity);
    if (isNaN(temp) || isNaN(hum)) {
      Taro.showToast({ title: '请输入有效数值', icon: 'none' });
      return;
    }

    addTempRecord({
      temperature: temp,
      humidity: hum,
      timestamp: formatTime(),
      batchId: selectedBatchId || undefined,
      note: selectedBatchId ? '批次补录' : '车厢检测',
    }, activeTrip.id, selectedBatchId || undefined);

    setShowTempModal(false);
    setTemperature('3.5');
    setHumidity('85');
    setSelectedBatchId('');
    Taro.showToast({ title: '温湿度已记录', icon: 'success' });
    console.log('[TransportPage] temp recorded:', temp, hum);
  };

  const handleTakeSealPhoto = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths || (res as any).tempFiles?.map((f: any) => f.path);
        if (tempFilePaths && tempFilePaths.length > 0) {
          Taro.getFileSystemManager().readFile({
            filePath: tempFilePaths[0],
            encoding: 'base64',
            success: (r) => {
              const base64 = 'data:image/jpeg;base64,' + r.data;
              setSealPhoto(base64);
              Taro.showToast({ title: '照片已拍摄', icon: 'success' });
            },
            fail: () => {
              setSealPhoto(tempFilePaths[0]);
            }
          });
        }
      }
    });
  };

  const handleSubmitSeal = () => {
    if (!selectedBatchId) {
      Taro.showToast({ title: '请选择批次', icon: 'none' });
      return;
    }
    if (!sealNo && !sealPhoto) {
      Taro.showToast({ title: '请输入封签号或拍摄照片', icon: 'none' });
      return;
    }
    updateBatch(selectedBatchId, {
      sealNo: sealNo || undefined,
      sealPhoto: sealPhoto || undefined,
    });
    setShowSealModal(false);
    setSealNo('');
    setSealPhoto('');
    setSelectedBatchId('');
    Taro.showToast({ title: '封签信息已保存', icon: 'success' });
    console.log('[TransportPage] seal recorded:', sealNo);
  };

  if (!activeTrip) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>🚚</Text>
          <Text className={styles.emptyText}>暂无进行中的运输任务</Text>
          <Text style={{ fontSize: '24rpx', color: '#94A3B8', marginTop: '16rpx', display: 'block' }}>
            请先在「装车」页面创建趟次并录入批次
          </Text>
        </View>
      </View>
    );
  }

  const timeline = [
    ...activeTrip.coolerRecords.map(r => ({
      type: r.action,
      time: r.timestamp,
      title: r.action === 'start' ? '开启保温机' : '关闭保温机',
      detail: r.tempAtAction ? `操作时温度：${r.tempAtAction}°C` : '',
      color: r.action === 'start' ? '#10B981' : '#F59E0B',
      icon: r.action === 'start' ? '❄' : '⏸',
    })),
    ...activeTrip.tempRecords.map(r => ({
      type: 'temp',
      time: r.timestamp,
      title: '温湿度记录',
      detail: `${r.temperature}°C / ${r.humidity}%${r.note ? `（${r.note}）` : ''}`,
      color: '#06B6D4',
      icon: '🌡',
    })),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.tripInfo}>
        <View className={styles.routeRow}>
          <View className={styles.routePoint}>
            <Text className={styles.routePointLabel}>起点</Text>
            <Text className={styles.routePointName}>{activeTrip.startBase || '基地'}</Text>
          </View>
          <View className={styles.routeLine} />
          <View className={styles.routePoint}>
            <Text className={styles.routePointLabel}>终点</Text>
            <Text className={styles.routePointName}>{activeTrip.endMarket || '市场'}</Text>
          </View>
        </View>

        <View className={styles.tempOverview}>
          <View className={styles.tempStat}>
            <View className={styles.tempIcon} style={{ background: coolerRunning ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)' }}>
              <Text>{coolerRunning ? '❄' : '⏸'}</Text>
            </View>
            <View className={styles.tempInfo}>
              <Text className={styles.tempLabel}>保温机</Text>
              <Text className={styles.tempValue} style={{ color: coolerRunning ? '#86EFAC' : '#FCD34D' }}>
                {coolerRunning ? '运行中' : '已停止'}
              </Text>
            </View>
          </View>
          <View className={styles.tempStat}>
            <View className={styles.tempIcon} style={{ background: 'rgba(6, 182, 212, 0.3)' }}>
              <Text>🌡</Text>
            </View>
            <View className={styles.tempInfo}>
              <Text className={styles.tempLabel}>最新温度</Text>
              <Text className={styles.tempValue}>
                {lastTemp ? `${lastTemp.temperature}°C` : '--'}
                {lastHum ? ` / ${lastHum.humidity}%` : ''}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>快捷操作</Text>
        </View>
        <View className={styles.actionGrid}>
          <View
            className={classnames(styles.actionCard, coolerRunning ? styles.actionStop : styles.actionStart)}
            onClick={handleCoolerToggle}
          >
            <View className={styles.actionHeader}>
              <View className={styles.actionIcon} style={{
                background: coolerRunning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: coolerRunning ? '#F59E0B' : '#10B981',
              }}>
                <Text>{coolerRunning ? '⏸' : '❄'}</Text>
              </View>
              <Text className={styles.actionName}>{coolerRunning ? '关闭保温机' : '开启保温机'}</Text>
            </View>
            <Text className={styles.actionDesc}>
              {coolerRunning ? '到达目的地前或需要通风时关闭' : '出发前或温度升高时开启'}
            </Text>
            <Button
              className={styles.actionBtn}
              style={{ background: coolerRunning
                ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
              }}
            >
              <Text>立即{coolerRunning ? '关闭' : '开启'}</Text>
            </Button>
          </View>

          <View className={classnames(styles.actionCard, styles.actionTemp)} onClick={() => setShowTempModal(true)}>
            <View className={styles.actionHeader}>
              <View className={styles.actionIcon} style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4' }}>
                <Text>🌡</Text>
              </View>
              <Text className={styles.actionName}>温湿度补录</Text>
            </View>
            <Text className={styles.actionDesc}>记录车厢当前温度和湿度，可选关联具体批次</Text>
            <Button
              className={styles.actionBtn}
              style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' }}
            >
              <Text>记录温湿度</Text>
            </Button>
          </View>

          <View className={classnames(styles.actionCard, styles.actionSeal)} onClick={() => setShowSealModal(true)}>
            <View className={styles.actionHeader}>
              <View className={styles.actionIcon} style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#0EA5E9' }}>
                <Text>🔒</Text>
              </View>
              <Text className={styles.actionName}>封签记录</Text>
            </View>
            <Text className={styles.actionDesc}>拍摄或输入封签号，关联批次作为收货凭证</Text>
            <Button
              className={styles.actionBtn}
              style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)' }}
            >
              <Text>录入封签号</Text>
            </Button>
          </View>

          <View className={styles.actionCard} style={{ borderTopColor: '#8B5CF6' }}>
            <View className={styles.actionHeader}>
              <View className={styles.actionIcon} style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}>
                <Text>⚠</Text>
              </View>
              <Text className={styles.actionName}>风险标记</Text>
            </View>
            <Text className={styles.actionDesc}>查看有压筐风险的批次，途中检查卸货顺序</Text>
            <View style={{
              padding: '12rpx 16rpx',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '12rpx',
              display: 'inline-block',
            }}>
              <Text style={{ fontSize: '24rpx', color: '#EF4444', fontWeight: 500 }}>
                {activeTrip.batches.filter(b => b.pressureRisk).length} 批需注意
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <TempChart records={activeTrip.tempRecords} />
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>操作时间线（{timeline.length}条）</Text>
        </View>
        <View className={styles.timeline}>
          {timeline.slice().reverse().slice(0, 10).map((item, idx) => (
            <View key={idx} className={styles.timelineItem}>
              <View className={styles.timelineDot} style={{ backgroundColor: item.color }}>
                <Text>{item.icon}</Text>
              </View>
              <View className={styles.timelineContent}>
                <Text className={styles.timelineTitle}>{item.title}</Text>
                <Text className={styles.timelineMeta}>{item.time}</Text>
                {item.detail && <Text className={styles.timelineDetail}>{item.detail}</Text>}
              </View>
            </View>
          ))}
          {timeline.length === 0 && (
            <View style={{ padding: '48rpx', textAlign: 'center' }}>
              <Text style={{ fontSize: '28rpx', color: '#94A3B8' }}>暂无操作记录</Text>
            </View>
          )}
        </View>
      </View>

      {showTempModal && (
        <View style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '32rpx',
        }} onClick={() => setShowTempModal(false)}>
          <View onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '24rpx', padding: '48rpx 32rpx',
            width: '100%', maxWidth: '640rpx',
          }}>
            <Text style={{ fontSize: '34rpx', fontWeight: 600, color: '#0F172A', marginBottom: '32rpx', display: 'block' }}>
              🌡 记录温湿度
            </Text>
            <View className={styles.batchSelectCard}>
              <Text style={{ fontSize: '24rpx', color: '#94A3B8', marginBottom: '16rpx', display: 'block' }}>选择关联批次（可选）</Text>
              {activeTrip.batches.slice(0, 6).map(b => (
                <View
                  key={b.id}
                  className={styles.batchTag}
                  style={{
                    background: selectedBatchId === b.id ? '#0EA5E9' : '#F1F5F9',
                    color: selectedBatchId === b.id ? '#fff' : '#475569',
                  }}
                  onClick={() => setSelectedBatchId(selectedBatchId === b.id ? '' : b.id)}
                >
                  <Text>{b.categoryName} {b.basketCount}筐</Text>
                </View>
              ))}
            </View>
            <View className={styles.inputGroup}>
              <View className={styles.inputItem}>
                <Text className={styles.inputLabel}>温度 (°C)</Text>
                <Input
                  className={styles.inputField}
                  type="digit"
                  value={temperature}
                  onInput={e => setTemperature(e.detail.value)}
                />
              </View>
              <View className={styles.inputItem}>
                <Text className={styles.inputLabel}>湿度 (%)</Text>
                <Input
                  className={styles.inputField}
                  type="digit"
                  value={humidity}
                  onInput={e => setHumidity(e.detail.value)}
                />
              </View>
            </View>
            <View style={{ display: 'flex', gap: '24rpx', marginTop: '32rpx' }}>
              <Button
                onClick={() => setShowTempModal(false)}
                style={{
                  flex: 1, height: '80rpx', borderRadius: '48rpx',
                  background: '#F1F5F9', color: '#475569', fontSize: '28rpx', fontWeight: 500,
                }}
              >取消</Button>
              <Button
                onClick={handleSubmitTemp}
                style={{
                  flex: 1, height: '80rpx', borderRadius: '48rpx',
                  background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', color: '#fff', fontSize: '28rpx', fontWeight: 600,
                }}
              >确认记录</Button>
            </View>
          </View>
        </View>
      )}

      {showSealModal && (
        <View style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '32rpx',
        }} onClick={() => setShowSealModal(false)}>
          <View onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '24rpx', padding: '48rpx 32rpx',
            width: '100%', maxWidth: '640rpx',
          }}>
            <Text style={{ fontSize: '34rpx', fontWeight: 600, color: '#0F172A', marginBottom: '32rpx', display: 'block' }}>
              🔒 录入封签号
            </Text>
            <View className={styles.batchSelectCard}>
              <Text style={{ fontSize: '24rpx', color: '#94A3B8', marginBottom: '16rpx', display: 'block' }}>选择批次 *</Text>
              {activeTrip.batches.map(b => (
                <View
                  key={b.id}
                  className={styles.batchTag}
                  style={{
                    background: selectedBatchId === b.id ? '#0EA5E9' : '#F1F5F9',
                    color: selectedBatchId === b.id ? '#fff' : '#475569',
                  }}
                  onClick={() => {
                    setSelectedBatchId(b.id);
                    if (b.sealNo) setSealNo(b.sealNo);
                    if (b.sealPhoto) setSealPhoto(b.sealPhoto);
                  }}
                >
                  <Text>{b.categoryName} · {b.batchNo}</Text>
                </View>
              ))}
            </View>
            <View style={{ marginBottom: '24rpx' }}>
              <Text className={styles.inputLabel}>封签号</Text>
              <Input
                className={styles.inputField}
                placeholder="输入或扫描封签编号"
                value={sealNo}
                onInput={e => setSealNo(e.detail.value)}
              />
            </View>
            <View style={{ marginBottom: '24rpx' }}>
              <Text className={styles.inputLabel}>封签照片</Text>
              <View style={{ display: 'flex', alignItems: 'center', gap: '24rpx' }}>
                <Button
                  onClick={handleTakeSealPhoto}
                  style={{
                    height: '120rpx',
                    width: '180rpx',
                    borderRadius: '16rpx',
                    background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                    color: '#fff',
                    fontSize: '26rpx',
                    fontWeight: 500,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  📷 拍照片
                </Button>
                {sealPhoto ? (
                  <View style={{ position: 'relative' }}>
                    <Image
                      src={sealPhoto}
                      style={{ width: '180rpx', height: '120rpx', borderRadius: '16rpx' }}
                      mode="aspectFill"
                    />
                    <View
                      onClick={() => setSealPhoto('')}
                      style={{
                        position: 'absolute',
                        top: '-12rpx',
                        right: '-12rpx',
                        width: '40rpx',
                        height: '40rpx',
                        borderRadius: '50%',
                        background: '#EF4444',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24rpx',
                        fontWeight: 'bold',
                      }}
                    >
                      <Text>×</Text>
                    </View>
                  </View>
                ) : (
                  <View style={{
                    width: '180rpx', height: '120rpx', borderRadius: '16rpx',
                    border: '2rpx dashed #CBD5E1', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#94A3B8', fontSize: '24rpx',
                  }}>
                    <Text>暂无照片</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: '22rpx', color: '#94A3B8', marginTop: '12rpx', display: 'block' }}>
                建议将封签号对准镜头拍摄，收货时便于核对
              </Text>
            </View>
            <View style={{ display: 'flex', gap: '24rpx', marginTop: '32rpx' }}>
              <Button
                onClick={() => setShowSealModal(false)}
                style={{
                  flex: 1, height: '80rpx', borderRadius: '48rpx',
                  background: '#F1F5F9', color: '#475569', fontSize: '28rpx', fontWeight: 500,
                }}
              >取消</Button>
              <Button
                onClick={handleSubmitSeal}
                style={{
                  flex: 1, height: '80rpx', borderRadius: '48rpx',
                  background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', color: '#fff', fontSize: '28rpx', fontWeight: 600,
                }}
              >确认保存</Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default TransportPage;
