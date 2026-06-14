import Taro from '@tarojs/taro';
import { Trip, LoadBatch, Category } from '../types';

const STORAGE_KEYS = {
  TRIPS: 'cold_chain_trips',
  CURRENT_TRIP: 'cold_chain_current_trip',
  CATEGORIES: 'cold_chain_categories',
  CUSTOM_KEYS: 'cold_chain_custom_keys'
};

export const storage = {
  getTrips(): Trip[] {
    try {
      const data = Taro.getStorageSync(STORAGE_KEYS.TRIPS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[Storage] getTrips error:', e);
      return [];
    }
  },

  saveTrips(trips: Trip[]) {
    try {
      Taro.setStorageSync(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
    } catch (e) {
      console.error('[Storage] saveTrips error:', e);
    }
  },

  getCurrentTrip(): Trip | null {
    try {
      const data = Taro.getStorageSync(STORAGE_KEYS.CURRENT_TRIP);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('[Storage] getCurrentTrip error:', e);
      return null;
    }
  },

  saveCurrentTrip(trip: Trip | null) {
    try {
      if (trip) {
        Taro.setStorageSync(STORAGE_KEYS.CURRENT_TRIP, JSON.stringify(trip));
      } else {
        Taro.removeStorageSync(STORAGE_KEYS.CURRENT_TRIP);
      }
    } catch (e) {
      console.error('[Storage] saveCurrentTrip error:', e);
    }
  },

  getCategories(): Category[] {
    try {
      const data = Taro.getStorageSync(STORAGE_KEYS.CATEGORIES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[Storage] getCategories error:', e);
      return [];
    }
  },

  saveCategories(categories: Category[]) {
    try {
      Taro.setStorageSync(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error('[Storage] saveCategories error:', e);
    }
  },

  clearAll() {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        Taro.removeStorageSync(key);
      });
    } catch (e) {
      console.error('[Storage] clearAll error:', e);
    }
  }
};

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

export const formatTime = (date: Date = new Date()) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatTimeShort = (date: Date = new Date()) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
