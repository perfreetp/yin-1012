import { create } from 'zustand';
import { Trip, LoadBatch, Category, TempRecord, CoolerRecord } from '../types';
import { storage, generateId, formatTime } from '../utils/storage';
import { DEFAULT_CATEGORIES, MOCK_TRIPS } from '../data/mockData';

interface AppState {
  trips: Trip[];
  currentTrip: Trip | null;
  categories: Category[];
  initialized: boolean;

  init: () => void;
  createNewTrip: (data: Partial<Trip>) => Trip;
  updateCurrentTrip: (updates: Partial<Trip>) => void;
  closeCurrentTrip: () => void;

  addBatch: (batch: Omit<LoadBatch, 'id' | 'createdAt'>) => void;
  updateBatch: (batchId: string, updates: Partial<LoadBatch>) => void;
  removeBatch: (batchId: string) => void;

  addTempRecord: (record: Omit<TempRecord, 'id'>, tripId?: string, batchId?: string) => void;
  addCoolerRecord: (record: Omit<CoolerRecord, 'id'>, tripId?: string, batchId?: string) => void;

  markBatchArrived: (batchId: string, arrivalData: Partial<LoadBatch>) => void;
  markTripCompleted: (tripId: string) => void;

  getBatchById: (batchId: string) => LoadBatch | null;
  getTripById: (tripId: string) => Trip | null;

  getStatsByCooperative: () => { cooperative: string; totalTrips: number; totalBaskets: number; totalLossBaskets: number; avgLossRate: number; batchCount: number }[];
  getStatsByBase: () => { base: string; cooperative: string; totalTrips: number; totalBaskets: number; totalLossBaskets: number; avgLossRate: number }[];
  getStatsByRoute: () => { route: string; totalTrips: number; totalBaskets: number; avgLossRate: number }[];
}

export const useAppStore = create<AppState>((set, get) => ({
  trips: [],
  currentTrip: null,
  categories: [],
  initialized: false,

  init: () => {
    if (get().initialized) return;

    let trips = storage.getTrips();
    if (trips.length === 0) {
      trips = MOCK_TRIPS;
      storage.saveTrips(trips);
    }

    let categories = storage.getCategories();
    if (categories.length === 0) {
      categories = DEFAULT_CATEGORIES;
      storage.saveCategories(categories);
    }

    let currentTrip = storage.getCurrentTrip();

    set({ trips, categories, currentTrip, initialized: true });
    console.log('[Store] init completed, trips:', trips.length, 'categories:', categories.length);
  },

  createNewTrip: (data) => {
    const newTrip: Trip = {
      id: generateId(),
      driverName: data.driverName || '司机',
      plateNo: data.plateNo || '',
      route: data.route || '',
      startBase: data.startBase || '',
      endMarket: data.endMarket || '',
      status: 'preparing',
      totalBaskets: 0,
      currentBaskets: 0,
      batches: [],
      tempRecords: [],
      coolerRecords: [],
      createdAt: formatTime(),
      ...data,
    };

    set(state => {
      const trips = [newTrip, ...state.trips];
      storage.saveTrips(trips);
      storage.saveCurrentTrip(newTrip);
      return { trips, currentTrip: newTrip };
    });

    console.log('[Store] createNewTrip:', newTrip.id);
    return newTrip;
  },

  updateCurrentTrip: (updates) => {
    set(state => {
      if (!state.currentTrip) return state;
      const updated = { ...state.currentTrip, ...updates };
      const trips = state.trips.map(t => t.id === updated.id ? updated : t);
      storage.saveTrips(trips);
      storage.saveCurrentTrip(updated);
      return { currentTrip: updated, trips };
    });
  },

  closeCurrentTrip: () => {
    storage.saveCurrentTrip(null);
    set({ currentTrip: null });
  },

  addBatch: (batch) => {
    const state = get();
    if (!state.currentTrip) {
      console.error('[Store] addBatch: no current trip');
      return;
    }

    const newBatch: LoadBatch = {
      ...batch,
      id: generateId(),
      createdAt: formatTime(),
      tempRecords: batch.tempRecords || [],
      coolerRecords: batch.coolerRecords || [],
    };

    set(s => {
      const batches = [...s.currentTrip!.batches, newBatch];
      const totalBaskets = batches.reduce((sum, b) => sum + b.basketCount, 0);
      const updatedTrip = {
        ...s.currentTrip!,
        batches,
        totalBaskets,
        currentBaskets: totalBaskets,
        status: 'loading' as Trip['status'],
      };
      const trips = s.trips.map(t => t.id === updatedTrip.id ? updatedTrip : t);
      storage.saveTrips(trips);
      storage.saveCurrentTrip(updatedTrip);
      return { currentTrip: updatedTrip, trips };
    });

    console.log('[Store] addBatch:', newBatch.id, newBatch.categoryName, newBatch.basketCount);
  },

  updateBatch: (batchId, updates) => {
    set(s => {
      if (!s.currentTrip) return s;
      const batches = s.currentTrip.batches.map(b =>
        b.id === batchId ? { ...b, ...updates } : b
      );
      const totalBaskets = batches.reduce((sum, b) => sum + b.basketCount, 0);
      const updatedTrip = { ...s.currentTrip, batches, totalBaskets, currentBaskets: totalBaskets };
      const trips = s.trips.map(t => t.id === updatedTrip.id ? updatedTrip : t);
      storage.saveTrips(trips);
      storage.saveCurrentTrip(updatedTrip);
      return { currentTrip: updatedTrip, trips };
    });
  },

  removeBatch: (batchId) => {
    set(s => {
      if (!s.currentTrip) return s;
      const batches = s.currentTrip.batches.filter(b => b.id !== batchId);
      const totalBaskets = batches.reduce((sum, b) => sum + b.basketCount, 0);
      const updatedTrip = { ...s.currentTrip, batches, totalBaskets, currentBaskets: totalBaskets };
      const trips = s.trips.map(t => t.id === updatedTrip.id ? updatedTrip : t);
      storage.saveTrips(trips);
      storage.saveCurrentTrip(updatedTrip);
      return { currentTrip: updatedTrip, trips };
    });
  },

  addTempRecord: (record, tripId, batchId) => {
    const newRecord: TempRecord = { ...record, id: generateId() };

    set(s => {
      let updatedTrip = s.currentTrip;
      let trips = s.trips;

      if (updatedTrip && (!tripId || updatedTrip.id === tripId)) {
        const tempRecords = [...updatedTrip.tempRecords, newRecord];
        let batches = updatedTrip.batches;
        if (batchId) {
          batches = batches.map(b =>
            b.id === batchId ? { ...b, tempRecords: [...b.tempRecords, newRecord] } : b
          );
        }
        updatedTrip = { ...updatedTrip, tempRecords, batches };
        trips = trips.map(t => t.id === updatedTrip!.id ? updatedTrip! : t);
        storage.saveTrips(trips);
        storage.saveCurrentTrip(updatedTrip);
      } else if (tripId) {
        trips = trips.map(t => {
          if (t.id !== tripId) return t;
          const tempRecords = [...t.tempRecords, newRecord];
          let batches = t.batches;
          if (batchId) {
            batches = batches.map(b =>
              b.id === batchId ? { ...b, tempRecords: [...b.tempRecords, newRecord] } : b
            );
          }
          return { ...t, tempRecords, batches };
        });
        storage.saveTrips(trips);
      }

      return { currentTrip: updatedTrip, trips };
    });
  },

  addCoolerRecord: (record, tripId, batchId) => {
    const newRecord: CoolerRecord = { ...record, id: generateId() };

    set(s => {
      let updatedTrip = s.currentTrip;
      let trips = s.trips;

      if (updatedTrip && (!tripId || updatedTrip.id === tripId)) {
        const coolerRecords = [...updatedTrip.coolerRecords, newRecord];
        let batches = updatedTrip.batches;
        if (batchId) {
          batches = batches.map(b =>
            b.id === batchId ? { ...b, coolerRecords: [...b.coolerRecords, newRecord] } : b
          );
        }
        updatedTrip = { ...updatedTrip, coolerRecords, batches };
        trips = trips.map(t => t.id === updatedTrip!.id ? updatedTrip! : t);
        storage.saveTrips(trips);
        storage.saveCurrentTrip(updatedTrip);
      } else if (tripId) {
        trips = trips.map(t => {
          if (t.id !== tripId) return t;
          const coolerRecords = [...t.coolerRecords, newRecord];
          let batches = t.batches;
          if (batchId) {
            batches = batches.map(b =>
              b.id === batchId ? { ...b, coolerRecords: [...b.coolerRecords, newRecord] } : b
            );
          }
          return { ...t, coolerRecords, batches };
        });
        storage.saveTrips(trips);
      }

      return { currentTrip: updatedTrip, trips };
    });
  },

  markBatchArrived: (batchId, arrivalData) => {
    set(s => {
      if (!s.currentTrip) return s;
      const batches = s.currentTrip.batches.map(b => {
        if (b.id !== batchId) return b;
        const loss = arrivalData.lossBasketCount || 0;
        return {
          ...b,
          ...arrivalData,
          arrivalBasketCount: b.basketCount - loss,
          lossRate: loss > 0 ? Number(((loss / b.basketCount) * 100).toFixed(2)) : 0,
          arrivalTime: arrivalData.arrivalTime || formatTime(),
          status: 'completed',
        };
      });
      const totalLoss = batches.reduce((sum, b) => sum + (b.lossBasketCount || 0), 0);
      const updatedTrip = {
        ...s.currentTrip,
        batches,
        currentBaskets: s.currentTrip.totalBaskets - totalLoss,
        totalLossBaskets: totalLoss,
        totalLossRate: Number(((totalLoss / s.currentTrip.totalBaskets) * 100).toFixed(2)),
      };
      const trips = s.trips.map(t => t.id === updatedTrip.id ? updatedTrip : t);
      storage.saveTrips(trips);
      storage.saveCurrentTrip(updatedTrip);
      return { currentTrip: updatedTrip, trips };
    });
  },

  markTripCompleted: (tripId) => {
    set(s => {
      const trips = s.trips.map(t =>
        t.id === tripId
          ? {
              ...t,
              status: 'completed',
              arrivalTime: t.arrivalTime || formatTime(),
              batches: t.batches.map(b => ({ ...b, status: 'completed' })),
            }
          : t
      );
      let currentTrip = s.currentTrip;
      if (currentTrip && currentTrip.id === tripId) {
        currentTrip = trips.find(t => t.id === tripId) || null;
        storage.saveCurrentTrip(currentTrip);
      }
      storage.saveTrips(trips);
      return { trips, currentTrip };
    });
  },

  getBatchById: (batchId) => {
    const { trips } = get();
    for (const trip of trips) {
      const batch = trip.batches.find(b => b.id === batchId);
      if (batch) return batch;
    }
    return null;
  },

  getTripById: (tripId) => {
    const { trips } = get();
    return trips.find(t => t.id === tripId) || null;
  },

  getStatsByCooperative: () => {
    const { trips } = get();
    const map = new Map<string, { cooperative: string; totalTrips: Set<string>; totalBaskets: number; totalLossBaskets: number; batchCount: number }>();

    trips.forEach(trip => {
      trip.batches.forEach(batch => {
        const key = batch.cooperative;
        if (!map.has(key)) {
          map.set(key, { cooperative: key, totalTrips: new Set(), totalBaskets: 0, totalLossBaskets: 0, batchCount: 0 });
        }
        const entry = map.get(key)!;
        entry.totalTrips.add(trip.id);
        entry.totalBaskets += batch.basketCount;
        entry.totalLossBaskets += batch.lossBasketCount || 0;
        entry.batchCount += 1;
      });
    });

    return Array.from(map.values()).map(e => ({
      cooperative: e.cooperative,
      totalTrips: e.totalTrips.size,
      totalBaskets: e.totalBaskets,
      totalLossBaskets: e.totalLossBaskets,
      avgLossRate: e.totalBaskets > 0 ? Number(((e.totalLossBaskets / e.totalBaskets) * 100).toFixed(2)) : 0,
      batchCount: e.batchCount,
    })).sort((a, b) => b.totalBaskets - a.totalBaskets);
  },

  getStatsByBase: () => {
    const { trips } = get();
    const map = new Map<string, { base: string; cooperative: string; totalTrips: Set<string>; totalBaskets: number; totalLossBaskets: number }>();

    trips.forEach(trip => {
      trip.batches.forEach(batch => {
        const key = batch.base;
        if (!map.has(key)) {
          map.set(key, { base: key, cooperative: batch.cooperative, totalTrips: new Set(), totalBaskets: 0, totalLossBaskets: 0 });
        }
        const entry = map.get(key)!;
        entry.totalTrips.add(trip.id);
        entry.totalBaskets += batch.basketCount;
        entry.totalLossBaskets += batch.lossBasketCount || 0;
      });
    });

    return Array.from(map.values()).map(e => ({
      base: e.base,
      cooperative: e.cooperative,
      totalTrips: e.totalTrips.size,
      totalBaskets: e.totalBaskets,
      totalLossBaskets: e.totalLossBaskets,
      avgLossRate: e.totalBaskets > 0 ? Number(((e.totalLossBaskets / e.totalBaskets) * 100).toFixed(2)) : 0,
    })).sort((a, b) => b.totalBaskets - a.totalBaskets);
  },

  getStatsByRoute: () => {
    const { trips } = get();
    const map = new Map<string, { route: string; totalTrips: number; totalBaskets: number; totalLossBaskets: number }>();

    trips.forEach(trip => {
      if (!trip.route) return;
      const key = trip.route;
      if (!map.has(key)) {
        map.set(key, { route: key, totalTrips: 0, totalBaskets: 0, totalLossBaskets: 0 });
      }
      const entry = map.get(key)!;
      entry.totalTrips += 1;
      entry.totalBaskets += trip.totalBaskets;
      entry.totalLossBaskets += trip.totalLossBaskets || 0;
    });

    return Array.from(map.values()).map(e => ({
      route: e.route,
      totalTrips: e.totalTrips,
      totalBaskets: e.totalBaskets,
      avgLossRate: e.totalBaskets > 0 ? Number(((e.totalLossBaskets / e.totalBaskets) * 100).toFixed(2)) : 0,
    })).sort((a, b) => b.totalTrips - a.totalTrips);
  },
}));
