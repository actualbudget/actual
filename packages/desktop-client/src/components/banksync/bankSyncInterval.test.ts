import { MIN_CUSTOM_INTERVAL_MINUTES } from '#hooks/useAutomaticBankSync';

import {
  isPresetInterval,
  minutesToParts,
  partsToMinutes,
} from './bankSyncInterval';

describe('minutesToParts', () => {
  it('uses the largest unit that divides evenly', () => {
    expect(minutesToParts(30)).toEqual({ value: 30, unit: 'minute' });
    expect(minutesToParts(60)).toEqual({ value: 1, unit: 'hour' });
    expect(minutesToParts(360)).toEqual({ value: 6, unit: 'hour' });
    expect(minutesToParts(1440)).toEqual({ value: 1, unit: 'day' });
    expect(minutesToParts(4320)).toEqual({ value: 3, unit: 'day' });
    expect(minutesToParts(10080)).toEqual({ value: 1, unit: 'week' });
    expect(minutesToParts(20160)).toEqual({ value: 2, unit: 'week' });
  });

  it('steps down to a smaller unit when the larger one does not divide', () => {
    // Just over a week, but a whole number of hours.
    expect(minutesToParts(10140)).toEqual({ value: 169, unit: 'hour' });
    // Over a day, but not a whole number of days.
    expect(minutesToParts(1500)).toEqual({ value: 25, unit: 'hour' });
  });

  it('falls back to minutes when no larger unit divides evenly', () => {
    expect(minutesToParts(90)).toEqual({ value: 90, unit: 'minute' });
    expect(minutesToParts(1450)).toEqual({ value: 1450, unit: 'minute' });
  });

  it('defaults to one hour for values that are not a usable interval', () => {
    expect(minutesToParts(0)).toEqual({ value: 1, unit: 'hour' });
    expect(minutesToParts(-5)).toEqual({ value: 1, unit: 'hour' });
    expect(minutesToParts(NaN)).toEqual({ value: 1, unit: 'hour' });
  });
});

describe('partsToMinutes', () => {
  it('converts each unit', () => {
    expect(partsToMinutes(30, 'minute')).toBe(30);
    expect(partsToMinutes(6, 'hour')).toBe(360);
    expect(partsToMinutes(2, 'day')).toBe(2880);
    expect(partsToMinutes(1, 'week')).toBe(10080);
    expect(partsToMinutes(3, 'week')).toBe(30240);
  });

  it('treats an empty or invalid number as one of the unit', () => {
    expect(partsToMinutes(NaN, 'hour')).toBe(60);
    expect(partsToMinutes(0, 'day')).toBe(1440);
  });

  it('ignores a fractional value', () => {
    expect(partsToMinutes(2.7, 'hour')).toBe(120);
  });

  it('never returns an interval below the floor', () => {
    expect(partsToMinutes(1, 'minute')).toBe(MIN_CUSTOM_INTERVAL_MINUTES);
    expect(partsToMinutes(14, 'minute')).toBe(MIN_CUSTOM_INTERVAL_MINUTES);
    expect(partsToMinutes(NaN, 'minute')).toBe(MIN_CUSTOM_INTERVAL_MINUTES);
    expect(partsToMinutes(-3, 'minute')).toBe(MIN_CUSTOM_INTERVAL_MINUTES);
  });

  it('leaves values at or above the floor alone', () => {
    expect(partsToMinutes(15, 'minute')).toBe(15);
    expect(partsToMinutes(30, 'minute')).toBe(30);
  });

  it('round-trips with minutesToParts', () => {
    for (const minutes of [15, 30, 60, 360, 720, 1440, 4320, 10080, 30240]) {
      const { value, unit } = minutesToParts(minutes);
      expect(partsToMinutes(value, unit)).toBe(minutes);
    }
  });
});

describe('isPresetInterval', () => {
  it('recognises the dropdown presets', () => {
    expect(isPresetInterval('0')).toBe(true);
    expect(isPresetInterval('1440')).toBe(true);
  });

  it('treats anything else as custom', () => {
    expect(isPresetInterval('30')).toBe(false);
    expect(isPresetInterval('60')).toBe(false);
  });
});
