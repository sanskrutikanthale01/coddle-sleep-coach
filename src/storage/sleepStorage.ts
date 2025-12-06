import AsyncStorage from '@react-native-async-storage/async-storage';
import { SleepSession, LearnerState } from '../types';

export interface NotificationHistoryItem {
  id: string;
  notificationId: string | null; 
  scheduleBlockId: string;
  kind: 'windDown' | 'nap' | 'bedtime';
  scheduledForISO: string;
  title: string;
  body: string;
  status: 'scheduled' | 'canceled' | 'sent';
  createdAtISO: string;
  canceledAtISO?: string;
  sentAtISO?: string;
}

import {
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEYS,
} from '../config/constants';

const SESSIONS_KEY = STORAGE_KEYS.sessions;
const LEARNER_KEY = STORAGE_KEYS.learner;
const NOTIFICATION_HISTORY_KEY = STORAGE_KEYS.notificationHistory;
const SCHEMA_VERSION_KEY = STORAGE_KEYS.schemaVersion;

export interface LoadResult<T> {
  value: T;
  corrupted: boolean;
}


async function getSchemaVersion(): Promise<number> {
  try {
    const version = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
    return version ? parseInt(version, 10) : 0;
  } catch {
    return 0;
  }
}

async function setSchemaVersion(version: number): Promise<void> {
  await AsyncStorage.setItem(SCHEMA_VERSION_KEY, version.toString());
}

async function migrateSchema(oldVersion: number, newVersion: number): Promise<void> {
  if (oldVersion >= newVersion) {
    return;
  }

  if (oldVersion === 0 && newVersion === 1) {
    await setSchemaVersion(1);
    return;
  }

  
  await setSchemaVersion(newVersion);
}

async function loadJson<T>(key: string, fallback: T): Promise<LoadResult<T>> {
  try {
    const currentVersion = await getSchemaVersion();
    if (currentVersion < CURRENT_SCHEMA_VERSION) {
      await migrateSchema(currentVersion, CURRENT_SCHEMA_VERSION);
    }

    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return { value: fallback, corrupted: false };
    }
    return { value: JSON.parse(raw) as T, corrupted: false };
  } catch (error) {
    await AsyncStorage.removeItem(key);
    return { value: fallback, corrupted: true };
  }
}

async function saveJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadSleepSessions(): Promise<LoadResult<SleepSession[]>> {
  return loadJson<SleepSession[]>(SESSIONS_KEY, []);
}

export async function saveSleepSessions(sessions: SleepSession[]): Promise<void> {
  await saveJson(SESSIONS_KEY, sessions);
}

export async function loadLearnerState(): Promise<LoadResult<LearnerState | null>> {
  return loadJson<LearnerState | null>(LEARNER_KEY, null);
}

export async function saveLearnerState(state: LearnerState | null): Promise<void> {
  await setSchemaVersion(CURRENT_SCHEMA_VERSION);
  await saveJson(LEARNER_KEY, state);
}

export async function loadNotificationHistory(): Promise<LoadResult<NotificationHistoryItem[]>> {
  return loadJson<NotificationHistoryItem[]>(NOTIFICATION_HISTORY_KEY, []);
}

export async function saveNotificationHistory(history: NotificationHistoryItem[]): Promise<void> {
  await saveJson(NOTIFICATION_HISTORY_KEY, history);
}

export async function clearAllStorage(): Promise<void> {
  await AsyncStorage.multiRemove([SESSIONS_KEY, LEARNER_KEY, NOTIFICATION_HISTORY_KEY, SCHEMA_VERSION_KEY]);
}

export async function getStorageInfo(): Promise<{
  schemaVersion: number;
  hasSessions: boolean;
  hasLearnerState: boolean;
}> {
  const schemaVersion = await getSchemaVersion();
  const sessions = await AsyncStorage.getItem(SESSIONS_KEY);
  const learner = await AsyncStorage.getItem(LEARNER_KEY);

  return {
    schemaVersion,
    hasSessions: sessions !== null,
    hasLearnerState: learner !== null,
  };

  
}


