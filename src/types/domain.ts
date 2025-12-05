

export interface BabyProfile {
  id: string;
  name: string;
  birthDateISO: string;
}

export interface SleepSession {
  id: string;
  startISO: string;
  endISO: string;
  quality?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  source: 'manual' | 'timer';
  deleted?: boolean;
  updatedAtISO: string;
}

export interface LearnerState {
  version: number;
  ewmaNapLengthMin: number;
  ewmaWakeWindowMin: number;
  lastUpdatedISO: string;
  confidence: number;
}

export interface ScheduleBlock {
  id: string;
  kind: 'nap' | 'bedtime' | 'windDown';
  startISO: string;
  endISO: string;
  confidence: number;
  rationale: string;
}

export interface CoachTip {
  id: string;
  type: 'warning' | 'suggestion' | 'info';
  title: string;
  message: string;
  justification: string;
  severity: 'high' | 'medium' | 'low';
  relatedSessionIds: string[];
  relatedDateKeys: string[];
  createdAtISO: string;
}

