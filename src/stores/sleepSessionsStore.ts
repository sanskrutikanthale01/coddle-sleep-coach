

import { create } from 'zustand';
import { SleepSession } from '../types';
import {
  loadSleepSessions,
  saveSleepSessions,
  LoadResult,
} from '../storage/sleepStorage';
import { useLearnerStore } from './learnerStore';
import { useScheduleStore } from './scheduleStore';
import { TEST_BABY_PROFILE } from '../utils/testScheduler';

interface SleepSessionsState {
  sessions: SleepSession[];
  isLoading: boolean;
  error: string | null;

  loadSessions: () => Promise<void>;
  addSession: (session: SleepSession) => Promise<void>;
  updateSession: (id: string, updates: Partial<SleepSession>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  clearAllSessions: () => Promise<void>;
  

  getSessionsByDate: (dateKey: string) => SleepSession[];
  getTodaySessions: () => SleepSession[];
  getActiveSessions: () => SleepSession[];
}

export const useSleepSessionsStore = create<SleepSessionsState>((set, get) => ({
  sessions: [],
  isLoading: false,
  error: null,

  loadSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const result: LoadResult<SleepSession[]> = await loadSleepSessions();
      set({ sessions: result.value, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load sessions',
        isLoading: false,
      });
    }
  },

  addSession: async (session: SleepSession) => {
    try {
      const currentSessions = get().sessions;
      const updatedSessions = [...currentSessions, session];
      await saveSleepSessions(updatedSessions);
      set({ sessions: updatedSessions, error: null });
      
      
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(async () => {
          const babyProfile = useLearnerStore.getState().babyProfile || TEST_BABY_PROFILE;
          await useLearnerStore.getState().updateLearnerState(babyProfile);
        });
      } else {
        setTimeout(async () => {
          const babyProfile = useLearnerStore.getState().babyProfile || TEST_BABY_PROFILE;
          await useLearnerStore.getState().updateLearnerState(babyProfile);
        }, 100);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add session',
      });
    }
  },

  updateSession: async (id: string, updates: Partial<SleepSession>) => {
    try {
      const currentSessions = get().sessions;
      const updatedSessions = currentSessions.map((session) =>
        session.id === id
          ? { ...session, ...updates, updatedAtISO: new Date().toISOString() }
          : session
      );
      await saveSleepSessions(updatedSessions);
      set({ sessions: updatedSessions, error: null });
      
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(async () => {
          const babyProfile = useLearnerStore.getState().babyProfile || TEST_BABY_PROFILE;
          await useLearnerStore.getState().updateLearnerState(babyProfile);
        });
      } else {
        setTimeout(async () => {
          const babyProfile = useLearnerStore.getState().babyProfile || TEST_BABY_PROFILE;
          await useLearnerStore.getState().updateLearnerState(babyProfile);
        }, 100);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update session',
      });
    }
  },

  deleteSession: async (id: string) => {
    try {
      const currentSessions = get().sessions;
      const updatedSessions = currentSessions.map((session) =>
        session.id === id
          ? { ...session, deleted: true, updatedAtISO: new Date().toISOString() }
          : session
      );
      await saveSleepSessions(updatedSessions);
      set({ sessions: updatedSessions, error: null });
      
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(async () => {
          const babyProfile = useLearnerStore.getState().babyProfile || TEST_BABY_PROFILE;
          await useLearnerStore.getState().updateLearnerState(babyProfile);
        });
      } else {
        setTimeout(async () => {
          const babyProfile = useLearnerStore.getState().babyProfile || TEST_BABY_PROFILE;
          await useLearnerStore.getState().updateLearnerState(babyProfile);
        }, 100);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete session',
      });
    }
  },

  clearAllSessions: async () => {
    try {
      await saveSleepSessions([]);
      set({ sessions: [], error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to clear sessions',
      });
    }
  },

  getSessionsByDate: (dateKey: string) => {
    const { sessions } = get();
    const time = require('../utils/time').time;
    return sessions.filter(
      (session) =>
        !session.deleted && time.dayKey(session.startISO) === dateKey
    );
  },

  getTodaySessions: () => {
    const { sessions } = get();
    const time = require('../utils/time').time;
    const today = time.dayKey(time.nowISO());
    return sessions.filter(
      (session) => !session.deleted && time.dayKey(session.startISO) === today
    );
  },

  getActiveSessions: () => {
    return get().sessions.filter((session) => !session.deleted);
  },
}));

