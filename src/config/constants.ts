export const EWMA_ALPHA = 0.3;
export const MIN_SESSIONS_FOR_LEARNING = 3;
export const MAX_SESSION_AGE_DAYS = 30;

export const CONFIDENCE_PARAMS = {
  minSessions: 5, 
  recencyWeight: 0.4,
  consistencyWeight: 0.3, 
  sessionCountWeight: 0.3,
};

export const SCHEDULE_CONFIG = {
  windDownDurationMin: 30,
  minNapGapMin: 60,
  maxNapsPerDay: 3,
  bedtimeRange: {
    earliest: 18,
    latest: 21,
  },
  whatIfAdjustmentRange: 30,
};

export const CURRENT_SCHEMA_VERSION = 1;

export const STORAGE_KEYS = {
  sessions: 'sleepSessions_v1',
  learner: 'learnerState_v1',
  notificationHistory: 'notificationHistory_v1',
  schemaVersion: 'schema_version',
};

export const COACH_THRESHOLDS = {
  shortNapMinutes: 30,
  longWakeWindowMultiplier: 1.2,
  splitNightGapMinutes: 60,
  shortNapStreakCount: 3,
};

export const CHART_CONFIG = {
  daysToShow: 7,
  maxItemsToDisplay: 20,
};

export const NOTIFICATION_CONFIG = {
  defaultSound: true,
  defaultBadge: false,
  defaultAlert: true,
};

