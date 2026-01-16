import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as monthUtils from 'loot-core/shared/months';

// Mock the dependencies before importing the module under test
vi.mock('loot-core/shared/months', async importOriginal => {
  const actual = await importOriginal<typeof monthUtils>();
  return {
    ...actual,
    currentMonth: vi.fn(),
    subMonths: vi.fn(),
    getMonthStartDate: vi.fn(),
    dayFromDate: vi.fn(),
  };
});

describe('ReportOptions', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should handle pay period IDs correctly for default startDate', async () => {
    // Setup mocks to simulate Pay Period behavior
    // currentMonth -> '2024-18' (Pay Period)
    // subMonths -> '2024-13' (Pay Period ID returned)

    vi.mocked(monthUtils.currentMonth).mockReturnValue('2024-18');
    vi.mocked(monthUtils.subMonths).mockReturnValue('2024-13');

    // We expect getMonthStartDate to be called with '2024-13'
    // And return a Date object, e.g., 2024-06-21
    const mockStartDate = new Date('2024-06-21T12:00:00Z');
    vi.mocked(monthUtils.getMonthStartDate).mockReturnValue(mockStartDate);
    vi.mocked(monthUtils.dayFromDate).mockReturnValue('2024-06-21');

    // Import the module AFTER mocking
    const { defaultReport } = await import('./ReportOptions');

    // Verification
    expect(monthUtils.subMonths).toHaveBeenCalled();
    // With the fix, these should be called:
    // expect(monthUtils.getMonthStartDate).toHaveBeenCalledWith('2024-13');
    // expect(monthUtils.dayFromDate).toHaveBeenCalledWith(mockStartDate);

    // The startDate should be the formatted date string, NOT '2024-13-01'
    expect(defaultReport.startDate).toBe('2024-06-21');
  });

  it('should handle standard monthly dates correctly', async () => {
    // Setup mocks for standard behavior
    vi.mocked(monthUtils.currentMonth).mockReturnValue('2024-06');
    vi.mocked(monthUtils.subMonths).mockReturnValue('2024-01');

    const mockStartDate = new Date('2024-01-01T12:00:00Z');
    vi.mocked(monthUtils.getMonthStartDate).mockReturnValue(mockStartDate);
    vi.mocked(monthUtils.dayFromDate).mockReturnValue('2024-01-01');

    const { defaultReport } = await import('./ReportOptions');

    expect(defaultReport.startDate).toBe('2024-01-01');
  });
});
