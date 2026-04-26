import { describe, it, expect } from 'vitest';

import {
  calculateMonthlyContribution,
  calculateProgress,
  calculateRemainingAmount,
  isCompleted,
} from './savings';

describe('calculateMonthlyContribution', () => {
  it('divides target evenly across months', () => {
    expect(calculateMonthlyContribution(120000, 12)).toBe(10000);
  });

  it('rounds up when target is not evenly divisible', () => {
    expect(calculateMonthlyContribution(100000, 3)).toBe(33334);
  });

  it('returns full amount when months is 1', () => {
    expect(calculateMonthlyContribution(50000, 1)).toBe(50000);
  });

  it('returns full amount when months is 0', () => {
    expect(calculateMonthlyContribution(50000, 0)).toBe(50000);
  });

  it('returns full amount when months is negative', () => {
    expect(calculateMonthlyContribution(50000, -1)).toBe(50000);
  });

  it('returns 0 when target is 0', () => {
    expect(calculateMonthlyContribution(0, 12)).toBe(0);
  });
});

describe('calculateRemainingAmount', () => {
  it('returns difference between target and saved', () => {
    expect(calculateRemainingAmount(200000, 50000)).toBe(150000);
  });

  it('returns 0 when saved equals target', () => {
    expect(calculateRemainingAmount(200000, 200000)).toBe(0);
  });

  it('returns 0 when saved exceeds target', () => {
    expect(calculateRemainingAmount(200000, 250000)).toBe(0);
  });

  it('returns full target when nothing saved', () => {
    expect(calculateRemainingAmount(200000, 0)).toBe(200000);
  });
});

describe('calculateProgress', () => {
  it('returns fraction of saved over target', () => {
    expect(calculateProgress(200000, 100000)).toBe(0.5);
  });

  it('returns 0 when nothing saved', () => {
    expect(calculateProgress(200000, 0)).toBe(0);
  });

  it('returns 1 when fully saved', () => {
    expect(calculateProgress(200000, 200000)).toBe(1);
  });

  it('caps at 1 when over-saved', () => {
    expect(calculateProgress(200000, 300000)).toBe(1);
  });

  it('returns 0 when target is 0', () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });

  it('returns 0 when target is negative', () => {
    expect(calculateProgress(-100, 50)).toBe(0);
  });
});

describe('isCompleted', () => {
  it('returns true when saved meets target', () => {
    expect(isCompleted(200000, 200000)).toBe(true);
  });

  it('returns true when saved exceeds target', () => {
    expect(isCompleted(200000, 250000)).toBe(true);
  });

  it('returns false when saved is less than target', () => {
    expect(isCompleted(200000, 100000)).toBe(false);
  });

  it('returns false when target is 0', () => {
    expect(isCompleted(0, 0)).toBe(false);
  });
});
