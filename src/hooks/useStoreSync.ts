/**
 * Store Sync Hook
 * 
 * Hook to sync stores when data changes (e.g., when sessions change, update learner and schedule)
 */

import { useEffect } from 'react';
import { useSleepSessionsStore } from '../stores/sleepSessionsStore';
import { useLearnerStore } from '../stores/learnerStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { TEST_BABY_PROFILE } from '../utils/testScheduler';

/**
 * Hook to automatically sync stores when sessions change
 * - Updates learner state when sessions change
 * - Regenerates schedule when sessions or learner state changes
 */
export function useStoreSync() {
  const sessions = useSleepSessionsStore((state) => state.sessions);
  const learnerState = useLearnerStore((state) => state.learnerState);
  const babyProfile = useLearnerStore((state) => state.babyProfile);
  const updateLearnerState = useLearnerStore((state) => state.updateLearnerState);
  const generateSchedule = useScheduleStore((state) => state.generateSchedule);

  // Sync learner state when sessions change
  useEffect(() => {
    const activeSessions = sessions.filter((s) => !s.deleted);
    if (activeSessions.length > 0) {
      const profile = babyProfile || TEST_BABY_PROFILE;
      updateLearnerState(profile);
    }
  }, [sessions, babyProfile, updateLearnerState]);

  // Regenerate schedule when learner state or sessions change
  useEffect(() => {
    const activeSessions = sessions.filter((s) => !s.deleted);
    if (activeSessions.length > 0) {
      const profile = babyProfile || TEST_BABY_PROFILE;
      generateSchedule(profile);
    }
  }, [learnerState, sessions, babyProfile, generateSchedule]);
}

