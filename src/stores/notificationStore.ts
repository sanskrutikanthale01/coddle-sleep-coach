

import { create } from 'zustand';
import { NotificationHistoryItem } from '../storage/sleepStorage';
import {
  loadNotificationHistory,
  saveNotificationHistory,
  LoadResult,
} from '../storage/sleepStorage';

interface NotificationState {
  history: NotificationHistoryItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadHistory: () => Promise<void>;
  addToHistory: (item: NotificationHistoryItem) => Promise<void>;
  updateHistoryItem: (id: string, updates: Partial<NotificationHistoryItem>) => Promise<void>;
  clearHistory: () => Promise<void>;

  // Selectors
  getUpcomingNotifications: () => NotificationHistoryItem[];
  getSentNotifications: () => NotificationHistoryItem[];
  getCanceledNotifications: () => NotificationHistoryItem[];
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  history: [],
  isLoading: false,
  error: null,

  loadHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const result: LoadResult<NotificationHistoryItem[]> = await loadNotificationHistory();
      set({ history: result.value, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load notification history',
        isLoading: false,
      });
    }
  },

  addToHistory: async (item: NotificationHistoryItem) => {
    try {
      const currentHistory = get().history;
      const updatedHistory = [...currentHistory, item];
      await saveNotificationHistory(updatedHistory);
      set({ history: updatedHistory, error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add notification to history',
      });
    }
  },

  updateHistoryItem: async (id: string, updates: Partial<NotificationHistoryItem>) => {
    try {
      const currentHistory = get().history;
      const updatedHistory = currentHistory.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      );
      await saveNotificationHistory(updatedHistory);
      set({ history: updatedHistory, error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update notification history',
      });
    }
  },

  clearHistory: async () => {
    try {
      await saveNotificationHistory([]);
      set({ history: [], error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to clear notification history',
      });
    }
  },

  getUpcomingNotifications: () => {
    const { history } = get();
    const now = new Date();
    return history.filter(
      (item) =>
        item.status === 'scheduled' &&
        new Date(item.scheduledForISO) > now
    );
  },

  getSentNotifications: () => {
    return get().history.filter((item) => item.status === 'sent');
  },

  getCanceledNotifications: () => {
    return get().history.filter((item) => item.status === 'canceled');
  },
}));

