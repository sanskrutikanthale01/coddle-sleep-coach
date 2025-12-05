

import { create } from 'zustand';
import { LearnerState, BabyProfile } from '../types';
import {
  loadLearnerState,
  saveLearnerState,
  LoadResult,
} from '../storage/sleepStorage';
import { updateLearner } from '../services/learner';
import { useSleepSessionsStore } from './sleepSessionsStore';
import { useScheduleStore } from './scheduleStore';

interface LearnerStateStore {
  learnerState: LearnerState | null;
  isLoading: boolean;
  error: string | null;
  babyProfile: BabyProfile | null;

  // Actions
  loadLearnerState: () => Promise<void>;
  updateLearnerState: (babyProfile: BabyProfile) => Promise<void>;
  setBabyProfile: (profile: BabyProfile) => void;
  clearLearnerState: () => Promise<void>;
}

export const useLearnerStore = create<LearnerStateStore>((set, get) => ({
  learnerState: null,
  isLoading: false,
  error: null,
  babyProfile: null,

  loadLearnerState: async () => {
    set({ isLoading: true, error: null });
    try {
      const result: LoadResult<LearnerState | null> = await loadLearnerState();
      set({ learnerState: result.value, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load learner state',
        isLoading: false,
      });
    }
  },

  updateLearnerState: async (babyProfile: BabyProfile) => {
    set({ isLoading: true, error: null });
    try {
      const sessions = useSleepSessionsStore.getState().getActiveSessions();
      const currentState = get().learnerState;
      
      const updatedState = updateLearner(sessions, babyProfile, currentState);
      await saveLearnerState(updatedState);
      
      set({
        learnerState: updatedState,
        babyProfile,
        isLoading: false,
        error: null,
      });
      
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(async () => {
          await useScheduleStore.getState().generateSchedule(babyProfile);
        });
      } else {
        setTimeout(async () => {
          await useScheduleStore.getState().generateSchedule(babyProfile);
        }, 100);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update learner state',
        isLoading: false,
      });
    }
  },

  setBabyProfile: (profile: BabyProfile) => {
    set({ babyProfile: profile });
  },

  clearLearnerState: async () => {
    try {
      await saveLearnerState(null);
      set({ learnerState: null, error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to clear learner state',
      });
    }
  },
}));

