
import { create } from 'zustand';
import { ScheduleBlock, BabyProfile } from '../types';
import { generateSchedule, generateWhatIfSchedule } from '../services/scheduler';
import { useSleepSessionsStore } from './sleepSessionsStore';
import { useLearnerStore } from './learnerStore';
import { TEST_BABY_PROFILE } from '../utils/testScheduler';

interface ScheduleState {
  todayBlocks: ScheduleBlock[];
  tomorrowBlocks: ScheduleBlock[];
  whatIfAdjustment: number;
  isWhatIfMode: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  generateSchedule: (babyProfile?: BabyProfile) => Promise<void>;
  generateWhatIfSchedule: (adjustment: number, babyProfile?: BabyProfile) => Promise<void>;
  resetWhatIf: () => void;
  clearSchedule: () => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  todayBlocks: [],
  tomorrowBlocks: [],
  whatIfAdjustment: 0,
  isWhatIfMode: false,
  isLoading: false,
  error: null,

  generateSchedule: async (babyProfile?: BabyProfile) => {
    set({ isLoading: true, error: null, isWhatIfMode: false });
    try {
      const sessions = useSleepSessionsStore.getState().getActiveSessions();
      const learnerState = useLearnerStore.getState().learnerState;
      const profile = babyProfile || useLearnerStore.getState().babyProfile || TEST_BABY_PROFILE;

      const schedule = generateSchedule(sessions, learnerState, profile);
      
      set({
        todayBlocks: schedule.today,
        tomorrowBlocks: schedule.tomorrow,
        whatIfAdjustment: 0,
        isWhatIfMode: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to generate schedule',
        isLoading: false,
      });
    }
  },

  generateWhatIfSchedule: async (adjustment: number, babyProfile?: BabyProfile) => {
    set({ isLoading: true, error: null, isWhatIfMode: true });
    try {
      const sessions = useSleepSessionsStore.getState().getActiveSessions();
      const learnerState = useLearnerStore.getState().learnerState;
      const profile = babyProfile || useLearnerStore.getState().babyProfile || TEST_BABY_PROFILE;

      const schedule = generateWhatIfSchedule(sessions, learnerState, profile, adjustment);
      
      set({
        todayBlocks: schedule.today,
        tomorrowBlocks: schedule.tomorrow,
        whatIfAdjustment: adjustment,
        isWhatIfMode: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to generate what-if schedule',
        isLoading: false,
      });
    }
  },

  resetWhatIf: () => {
    set({ isWhatIfMode: false, whatIfAdjustment: 0 });
  
    get().generateSchedule();
  },

  clearSchedule: () => {
    set({
      todayBlocks: [],
      tomorrowBlocks: [],
      whatIfAdjustment: 0,
      isWhatIfMode: false,
      error: null,
    });
  },
}));

