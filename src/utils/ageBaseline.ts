import { time } from './time';

export type AgeRange =
  | '0-3m'
  | '4-6m'
  | '7-9m'
  | '10-12m'
  | '13-18m'
  | '19m+';

export interface AgeBaseline {
  typicalWakeWindowMin: number;
  minWakeWindowMin: number;
  maxWakeWindowMin: number;
  typicalNapLengthMin: number;
  minNapLengthMin: number;
  maxNapLengthMin: number;
  typicalNapCount: number;
}

const AGE_BASELINE_TABLE: Record<AgeRange, AgeBaseline> = {
  '0-3m': {
    typicalWakeWindowMin: 60, // 1 hour
    minWakeWindowMin: 45,
    maxWakeWindowMin: 90,
    typicalNapLengthMin: 60, // 1 hour (variable)
    minNapLengthMin: 30,
    maxNapLengthMin: 120,
    typicalNapCount: 4, // 4-6 naps
  },
  '4-6m': {
    typicalWakeWindowMin: 120, // 2 hours
    minWakeWindowMin: 90,
    maxWakeWindowMin: 150,
    typicalNapLengthMin: 90, // 1.5 hours
    minNapLengthMin: 60,
    maxNapLengthMin: 120,
    typicalNapCount: 3, // 3-4 naps
  },
  '7-9m': {
    typicalWakeWindowMin: 150, // 2.5 hours
    minWakeWindowMin: 120,
    maxWakeWindowMin: 180,
    typicalNapLengthMin: 90, // 1.5 hours
    minNapLengthMin: 60,
    maxNapLengthMin: 120,
    typicalNapCount: 2, // 2-3 naps
  },
  '10-12m': {
    typicalWakeWindowMin: 180, // 3 hours
    minWakeWindowMin: 150,
    maxWakeWindowMin: 210,
    typicalNapLengthMin: 90, // 1.5 hours
    minNapLengthMin: 60,
    maxNapLengthMin: 120,
    typicalNapCount: 2, // 2 naps
  },
  '13-18m': {
    typicalWakeWindowMin: 210, // 3.5 hours
    minWakeWindowMin: 180,
    maxWakeWindowMin: 240,
    typicalNapLengthMin: 120, // 2 hours
    minNapLengthMin: 90,
    maxNapLengthMin: 150,
    typicalNapCount: 1, // 1-2 naps (transitioning)
  },
  '19m+': {
    typicalWakeWindowMin: 300, // 5 hours
    minWakeWindowMin: 240,
    maxWakeWindowMin: 360,
    typicalNapLengthMin: 120, // 2 hours
    minNapLengthMin: 60,
    maxNapLengthMin: 180,
    typicalNapCount: 1, // 1 nap or no nap
  },
};

/**
 * Calculates the age in months from a birth date to a reference date.
 * 
 * @param birthDateISO - ISO string of birth date
 * @param referenceDateISO - ISO string of reference date (defaults to now)
 * @returns Age in months (decimal, e.g., 4.5 for 4 months 2 weeks)
 */
export function calculateAgeMonths(
  birthDateISO: string,
  referenceDateISO?: string
): number {
  const birthDate = time.parse(birthDateISO);
  const referenceDate = referenceDateISO
    ? time.parse(referenceDateISO)
    : time.now();

  if (!birthDate.isValid()) {
    throw new Error(`Invalid birth date: ${birthDateISO}`);
  }

  if (birthDate.isAfter(referenceDate)) {
    throw new Error('Birth date cannot be in the future');
  }

  // Calculate difference in months with decimal precision
  const yearsDiff = referenceDate.diff(birthDate, 'year', true);
  const monthsDiff = yearsDiff * 12;

  return Math.max(0, monthsDiff);
}

/**
 * Determines the age range bucket for a given age in months.
 * 
 * @param ageMonths - Age in months
 * @returns Age range bucket
 */
export function getAgeRange(ageMonths: number): AgeRange {
  if (ageMonths < 0) {
    throw new Error('Age cannot be negative');
  }

  if (ageMonths < 4) {
    return '0-3m';
  } else if (ageMonths < 7) {
    return '4-6m';
  } else if (ageMonths < 10) {
    return '7-9m';
  } else if (ageMonths < 13) {
    return '10-12m';
  } else if (ageMonths < 19) {
    return '13-18m';
  } else {
    return '19m+';
  }
}

/**
 * Gets the baseline values for a given age in months.
 * 
 * @param ageMonths - Age in months
 * @returns Baseline values for the age range
 */
export function getBaselineForAge(ageMonths: number): AgeBaseline {
  const range = getAgeRange(ageMonths);
  return AGE_BASELINE_TABLE[range];
}

/**
 * Gets the baseline values for a baby profile.
 * 
 * @param birthDateISO - ISO string of birth date
 * @param referenceDateISO - Optional reference date (defaults to now)
 * @returns Baseline values for the baby's current age
 */
export function getBaselineForBaby(
  birthDateISO: string,
  referenceDateISO?: string
): AgeBaseline {
  const ageMonths = calculateAgeMonths(birthDateISO, referenceDateISO);
  return getBaselineForAge(ageMonths);
}

/**
 * Clamps a wake window value to safe min/max bounds for a given age.
 * 
 * @param wakeWindowMin - Wake window in minutes to clamp
 * @param ageMonths - Age in months
 * @returns Clamped wake window value
 */
export function clampWakeWindow(
  wakeWindowMin: number,
  ageMonths: number
): number {
  const baseline = getBaselineForAge(ageMonths);
  return Math.max(
    baseline.minWakeWindowMin,
    Math.min(baseline.maxWakeWindowMin, wakeWindowMin)
  );
}

/**
 * Clamps a nap length value to safe min/max bounds for a given age.
 * 
 * @param napLengthMin - Nap length in minutes to clamp
 * @param ageMonths - Age in months
 * @returns Clamped nap length value
 */
export function clampNapLength(
  napLengthMin: number,
  ageMonths: number
): number {
  const baseline = getBaselineForAge(ageMonths);
  return Math.max(
    baseline.minNapLengthMin,
    Math.min(baseline.maxNapLengthMin, napLengthMin)
  );
}

/**
 * Gets a human-readable description of an age range.
 * 
 * @param range - Age range
 * @returns Human-readable string
 */
export function getAgeRangeDescription(range: AgeRange): string {
  const descriptions: Record<AgeRange, string> = {
    '0-3m': '0-3 months',
    '4-6m': '4-6 months',
    '7-9m': '7-9 months',
    '10-12m': '10-12 months',
    '13-18m': '13-18 months',
    '19m+': '19+ months',
  };
  return descriptions[range];
}


export const BASELINE_TABLE = { ...AGE_BASELINE_TABLE } as const;

