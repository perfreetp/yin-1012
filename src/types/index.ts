// 品类类型
export type CategoryType = 'leaf' | 'fruit' | 'root' | 'stem' | 'flower';

export interface Category {
  id: string;
  name: string;
  shortKey: string;
  type: CategoryType;
  tempMin: number;
  tempMax: number;
  pressureRisk: boolean;
}

// 预冷状态
export type PrecoolStatus = 'none' | 'precooling' | 'completed' | 'pending';

// 批次状态
export type BatchStatus = 'loading' | 'transit' | 'arrived' | 'completed';

// 装载批次
export interface LoadBatch {
  id: string;
  tripId: string;
  categoryId: string;
  categoryName: string;
  categoryType: CategoryType;
  plot: string;
  batchNo: string;
  cooperative: string;
  base: string;
  loadTime: string;
  precoolStatus: PrecoolStatus;
  basketCount: number;
  targetMarket: string;
  loadOrder: number;
  pressureRisk: boolean;
  notes?: string;
  sealNo?: string;
  sealPhoto?: string;
  tempRecords: TempRecord[];
  coolerRecords: CoolerRecord[];
  arrivalBasketCount?: number;
  lossBasketCount?: number;
  lossRate?: number;
  arrivalTime?: string;
  status: BatchStatus;
  createdAt: string;
}

// 运输趟次
export interface Trip {
  id: string;
  driverName: string;
  plateNo: string;
  route: string;
  startBase: string;
  endMarket: string;
  departureTime?: string;
  arrivalTime?: string;
  status: 'preparing' | 'loading' | 'transit' | 'arrived' | 'completed';
  totalBaskets: number;
  currentBaskets: number;
  batches: LoadBatch[];
  tempRecords: TempRecord[];
  coolerRecords: CoolerRecord[];
  totalLossBaskets?: number;
  totalLossRate?: number;
  createdAt: string;
}

// 温湿度记录
export interface TempRecord {
  id: string;
  batchId?: string;
  tripId?: string;
  temperature: number;
  humidity: number;
  timestamp: string;
  location?: string;
  note?: string;
}

// 保温机记录
export interface CoolerRecord {
  id: string;
  batchId?: string;
  tripId?: string;
  action: 'start' | 'stop';
  timestamp: string;
  tempAtAction?: number;
  note?: string;
}

// 统计维度
export interface StatsByCooperative {
  cooperative: string;
  totalTrips: number;
  totalBaskets: number;
  totalLossBaskets: number;
  avgLossRate: number;
  batchCount: number;
}

export interface StatsByBase {
  base: string;
  cooperative: string;
  totalTrips: number;
  totalBaskets: number;
  totalLossBaskets: number;
  avgLossRate: number;
}

export interface StatsByRoute {
  route: string;
  totalTrips: number;
  totalBaskets: number;
  avgDuration: string;
  avgLossRate: number;
  bestTemp: number;
}

// 快捷键盘按键
export interface KeyItem {
  key: string;
  label: string;
  value: string;
  categoryType?: CategoryType;
}
