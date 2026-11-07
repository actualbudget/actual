/**
 * The `bank-sync-interval` preference is stored as a whole number of minutes.
 * These helpers convert between that and the number + unit pair the custom
 * interval control shows.
 */

import { MIN_CUSTOM_INTERVAL_MINUTES } from '#hooks/useAutomaticBankSync';

// Months and years are deliberately absent: they have no fixed length in
// minutes, which is how this preference is stored.
export type BankSyncIntervalUnit = 'minute' | 'hour' | 'day' | 'week';

const MINUTES_PER_UNIT: Record<BankSyncIntervalUnit, number> = {
  minute: 1,
  hour: 60,
  day: 60 * 24,
  week: 60 * 24 * 7,
};

/** Interval values (in minutes) offered as presets in the dropdown. */
export const PRESET_INTERVAL_MINUTES = ['0', '720', '1440', '10080'];

export function isPresetInterval(minutes: string) {
  return PRESET_INTERVAL_MINUTES.includes(minutes);
}

/**
 * Split minutes into the largest unit that divides evenly, so 120 reads as
 * "2 hours" rather than "120 minutes".
 */
export function minutesToParts(minutes: number): {
  value: number;
  unit: BankSyncIntervalUnit;
} {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return { value: 1, unit: 'hour' };
  }

  if (minutes % MINUTES_PER_UNIT.week === 0) {
    return { value: minutes / MINUTES_PER_UNIT.week, unit: 'week' };
  }

  if (minutes % MINUTES_PER_UNIT.day === 0) {
    return { value: minutes / MINUTES_PER_UNIT.day, unit: 'day' };
  }

  if (minutes % MINUTES_PER_UNIT.hour === 0) {
    return { value: minutes / MINUTES_PER_UNIT.hour, unit: 'hour' };
  }

  return { value: minutes, unit: 'minute' };
}

export function partsToMinutes(
  value: number,
  unit: BankSyncIntervalUnit,
): number {
  const minutes =
    Number.isFinite(value) && value >= 1
      ? Math.floor(value) * MINUTES_PER_UNIT[unit]
      : MINUTES_PER_UNIT[unit];

  // Only ever bites for the minute unit — an hour or more is already above
  // the floor.
  return Math.max(minutes, MIN_CUSTOM_INTERVAL_MINUTES);
}
