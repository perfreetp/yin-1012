import { Category, Trip, LoadBatch, TempRecord, CoolerRecord, PrecoolStatus } from '../types';
import { generateId, formatTime } from '../utils/storage';
import dayjs from 'dayjs';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c1', name: '生菜', shortKey: '1', type: 'leaf', tempMin: 0, tempMax: 4, pressureRisk: true },
  { id: 'c2', name: '油麦菜', shortKey: '2', type: 'leaf', tempMin: 0, tempMax: 4, pressureRisk: true },
  { id: 'c3', name: '菠菜', shortKey: '3', type: 'leaf', tempMin: 0, tempMax: 4, pressureRisk: true },
  { id: 'c4', name: '上海青', shortKey: '4', type: 'leaf', tempMin: 0, tempMax: 5, pressureRisk: true },
  { id: 'c5', name: '娃娃菜', shortKey: '5', type: 'leaf', tempMin: 0, tempMax: 5, pressureRisk: false },
  { id: 'c6', name: '番茄', shortKey: '6', type: 'fruit', tempMin: 8, tempMax: 12, pressureRisk: true },
  { id: 'c7', name: '黄瓜', shortKey: '7', type: 'fruit', tempMin: 7, tempMax: 13, pressureRisk: true },
  { id: 'c8', name: '茄子', shortKey: '8', type: 'fruit', tempMin: 7, tempMax: 13, pressureRisk: true },
  { id: 'c9', name: '辣椒', shortKey: '9', type: 'fruit', tempMin: 7, tempMax: 13, pressureRisk: false },
  { id: 'c10', name: '土豆', shortKey: '0', type: 'root', tempMin: 2, tempMax: 8, pressureRisk: false },
  { id: 'c11', name: '胡萝卜', shortKey: 'Q', type: 'root', tempMin: 0, tempMax: 5, pressureRisk: false },
  { id: 'c12', name: '白萝卜', shortKey: 'W', type: 'root', tempMin: 0, tempMax: 5, pressureRisk: false },
  { id: 'c13', name: '西蓝花', shortKey: 'E', type: 'flower', tempMin: 0, tempMax: 4, pressureRisk: true },
  { id: 'c14', name: '菜花', shortKey: 'R', type: 'flower', tempMin: 0, tempMax: 4, pressureRisk: true },
  { id: 'c15', name: '芹菜', shortKey: 'T', type: 'stem', tempMin: 0, tempMax: 4, pressureRisk: true },
  { id: 'c16', name: '芦笋', shortKey: 'Y', type: 'stem', tempMin: 0, tempMax: 4, pressureRisk: true },
];

const PRECOOL_STATUSES: PrecoolStatus[] = ['completed', 'precooling', 'none', 'completed'];

const generateMockBatch = (tripId: string, idx: number): LoadBatch => {
  const category = DEFAULT_CATEGORIES[idx % DEFAULT_CATEGORIES.length];
  const basketCount = 20 + Math.floor(Math.random() * 60);
  const lossCount = Math.random() > 0.7 ? Math.floor(Math.random() * 5) : 0;
  const now = dayjs();
  const loadTime = now.subtract(idx * 15, 'minute').toDate();
  const arrivalTime = now.add(4 + idx, 'hour').toDate();

  return {
    id: generateId(),
    tripId,
    categoryId: category.id,
    categoryName: category.name,
    categoryType: category.type,
    plot: `${Math.floor(idx / 4) + 1}号地-${(idx % 4) + 1}区`,
    batchNo: `B${dayjs().format('MMDD')}-${String(idx + 1).padStart(3, '0')}`,
    cooperative: ['绿源合作社', '青禾合作社', '新农合作社', '丰谷合作社'][idx % 4],
    base: ['东升基地', '朝阳基地', '永丰基地'][idx % 3],
    loadTime: formatTime(loadTime),
    precoolStatus: PRECOOL_STATUSES[idx % 4],
    basketCount,
    targetMarket: ['北京新发地', '上海江桥', '广州江南', '深圳海吉星'][idx % 4],
    loadOrder: idx + 1,
    pressureRisk: category.pressureRisk && Math.random() > 0.5,
    notes: category.pressureRisk ? '注意不要重压' : '',
    sealNo: idx % 3 === 0 ? `SEAL${10000 + idx}` : undefined,
    tempRecords: generateMockTempRecords(10),
    coolerRecords: generateMockCoolerRecords(),
    arrivalBasketCount: basketCount - lossCount,
    lossBasketCount: lossCount,
    lossRate: lossCount > 0 ? Number(((lossCount / basketCount) * 100).toFixed(2)) : 0,
    arrivalTime: formatTime(arrivalTime),
    status: idx < 10 ? 'completed' : 'transit',
    createdAt: formatTime(loadTime),
  };
};

const generateMockTempRecords = (count: number): TempRecord[] => {
  const records: TempRecord[] = [];
  const now = dayjs();
  for (let i = 0; i < count; i++) {
    records.push({
      id: generateId(),
      temperature: Number((1 + Math.random() * 6).toFixed(1)),
      humidity: Number((70 + Math.random() * 25).toFixed(1)),
      timestamp: formatTime(now.subtract(count - i, 'hour').toDate()),
    });
  }
  return records;
};

const generateMockCoolerRecords = (): CoolerRecord[] => {
  const now = dayjs();
  return [
    { id: generateId(), action: 'start', timestamp: formatTime(now.subtract(6, 'hour').toDate()), tempAtAction: 12 },
    { id: generateId(), action: 'stop', timestamp: formatTime(now.subtract(5, 'hour').toDate()), tempAtAction: 4 },
    { id: generateId(), action: 'start', timestamp: formatTime(now.subtract(4, 'hour').toDate()), tempAtAction: 8 },
    { id: generateId(), action: 'stop', timestamp: formatTime(now.subtract(1, 'hour').toDate()), tempAtAction: 3 },
  ];
};

export const generateMockTrip = (index: number): Trip => {
  const batchCount = 8 + Math.floor(Math.random() * 8);
  const batches: LoadBatch[] = [];
  for (let i = 0; i < batchCount; i++) {
    batches.push(generateMockBatch(`t${index}`, i));
  }
  const totalBaskets = batches.reduce((sum, b) => sum + b.basketCount, 0);
  const totalLoss = batches.reduce((sum, b) => sum + (b.lossBasketCount || 0), 0);
  const now = dayjs();
  const statuses: Trip['status'][] = ['completed', 'completed', 'arrived', 'transit', 'loading'];

  return {
    id: `t${index}`,
    driverName: '张师傅',
    plateNo: ['京A·88888', '沪B·66666', '粤C·99999'][index % 3],
    route: ['北京线', '上海线', '广州线', '深圳线'][index % 4],
    startBase: batches[0].base,
    endMarket: batches[0].targetMarket,
    departureTime: formatTime(now.subtract(index * 2, 'day').subtract(4, 'hour').toDate()),
    arrivalTime: index < 2 ? formatTime(now.subtract(index * 2, 'day').add(6, 'hour').toDate()) : undefined,
    status: statuses[index % 5],
    totalBaskets,
    currentBaskets: totalBaskets - totalLoss,
    batches,
    tempRecords: generateMockTempRecords(15),
    coolerRecords: generateMockCoolerRecords(),
    totalLossBaskets: totalLoss,
    totalLossRate: Number(((totalLoss / totalBaskets) * 100).toFixed(2)),
    createdAt: formatTime(now.subtract(index * 2, 'day').subtract(6, 'hour').toDate()),
  };
};

export const MOCK_TRIPS: Trip[] = [
  generateMockTrip(0),
  generateMockTrip(1),
  generateMockTrip(2),
  generateMockTrip(3),
  generateMockTrip(4),
];

export const MARKETS = ['北京新发地', '上海江桥', '广州江南', '深圳海吉星', '杭州勾庄', '南京众彩', '成都濛阳', '武汉白沙洲'];
export const COOPERATIVES = ['绿源合作社', '青禾合作社', '新农合作社', '丰谷合作社', '金源合作社'];
export const BASES = ['东升基地', '朝阳基地', '永丰基地', '太平基地', '红光基地'];
