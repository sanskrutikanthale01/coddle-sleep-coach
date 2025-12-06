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


export function useStoreSync() {
  const sessions = useSleepSessionsStore((state) => state.sessions);
  const learnerState = useLearnerStore((state) => state.learnerState);
  const babyProfile = useLearnerStore((state) => state.babyProfile);
  const updateLearnerState = useLearnerStore((state) => state.updateLearnerState);
  const generateSchedule = useScheduleStore((state) => state.generateSchedule);

  useEffect(() => {
    const activeSessions = sessions.filter((s) => !s.deleted);
    if (activeSessions.length > 0) {
      const profile = babyProfile || TEST_BABY_PROFILE;
      updateLearnerState(profile);
    }
  }, [sessions, babyProfile, updateLearnerState]);

  
  useEffect(() => {
    const activeSessions = sessions.filter((s) => !s.deleted);
    if (activeSessions.length > 0) {
      const profile = babyProfile || TEST_BABY_PROFILE;
      generateSchedule(profile);
    }
  }, [learnerState, sessions, babyProfile, generateSchedule]);
}

