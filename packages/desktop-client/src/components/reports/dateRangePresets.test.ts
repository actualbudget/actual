import { describe, expect, it, vi } from 'vitest';

import { buildDateRangePresets } from './dateRangePresets';

// In test mode, monthUtils.currentDay() returns '2017-01-01'
// and monthUtils.currentMonth() returns '2017-01'
const EARLIEST_TRANSACTION = '2015-01-01';
const LATEST_TRANSACTION = '2017-01-01';

describe('buildDateRangePresets', () => {
  const mockOnSelectRange = vi.fn();
  const mockT = (text: string) => text;

  describe('past presets (default, non-future)', () => {
    it('builds 1-month preset when show1Month is true', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: true,
        includeAllTime: true,
      });

      const oneMonthPreset = presets.find(p => p.key === '1-month');
      expect(oneMonthPreset).toBeDefined();
      expect(oneMonthPreset?.label).toBe('1 month');
    });

    it('omits 1-month preset when show1Month is false', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        includeAllTime: true,
      });

      const oneMonthPreset = presets.find(p => p.key === '1-month');
      expect(oneMonthPreset).toBeUndefined();
    });

    it('includes standard past presets (3-month, 6-month, 1-year)', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        includeAllTime: true,
      });

      const keys = presets.map(p => p.key);
      expect(keys).toContain('3-months');
      expect(keys).toContain('6-months');
      expect(keys).toContain('1-year');
    });

    it('includes live presets (year-to-date, last-month, last-year, prior-year-to-date)', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        includeAllTime: true,
      });

      const keys = presets.map(p => p.key);
      expect(keys).toContain('year-to-date');
      expect(keys).toContain('last-month');
      expect(keys).toContain('last-year');
      expect(keys).toContain('prior-year-to-date');
      expect(keys).toContain('current-quarter');
      expect(keys).toContain('previous-quarter');
    });

    it('includes all-time preset when includeAllTime is true', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        includeAllTime: true,
      });

      const allTimePreset = presets.find(p => p.key === 'all-time');
      expect(allTimePreset).toBeDefined();
    });

    it('omits all-time preset when includeAllTime is false', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        includeAllTime: false,
      });

      const allTimePreset = presets.find(p => p.key === 'all-time');
      expect(allTimePreset).toBeUndefined();
    });

    it('preset getRange returns month-shaped range for past presets', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        includeAllTime: true,
      });

      const threeMonthPreset = presets.find(p => p.key === '3-months');
      const [start, end] = threeMonthPreset!.getRange();
      // 3 months (offset=2) back from 2017-01 = 2016-11 to 2017-01
      expect(start).toBe('2016-11');
      expect(end).toBe('2017-01');
    });

    it('preset onSelect triggers callback with range and mode', () => {
      const onSelect = vi.fn();
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: onSelect,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        includeAllTime: true,
      });

      const threeMonthPreset = presets.find(p => p.key === '3-months');
      threeMonthPreset!.onSelect();

      expect(onSelect).toHaveBeenCalledOnce();
      const [start, end, mode] = onSelect.mock.calls[0][0];
      // 3 months (offset=2) back from 2017-01 = 2016-11 to 2017-01
      expect(start).toBe('2016-11');
      expect(end).toBe('2017-01');
      expect(mode).toBe('sliding-window');
    });
  });

  describe('future presets (showFutureRange=true)', () => {
    it('builds next-month preset when show1Month is true', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: true,
        showFutureRange: true,
        includeAllTime: true,
      });

      const nextMonthPreset = presets.find(p => p.key === 'next-month');
      expect(nextMonthPreset).toBeDefined();
    });

    it('omits next-month preset when show1Month is false', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        showFutureRange: true,
        includeAllTime: true,
      });

      const nextMonthPreset = presets.find(p => p.key === 'next-month');
      expect(nextMonthPreset).toBeUndefined();
    });

    it('includes future presets (next-3-months, next-6-months, next-year, all-future)', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        showFutureRange: true,
        includeAllTime: true,
      });

      const keys = presets.map(p => p.key);
      expect(keys).toContain('next-3-months');
      expect(keys).toContain('next-6-months');
      expect(keys).toContain('next-year');
      expect(keys).toContain('all-future');
    });

    it('does not include past presets when showFutureRange is true', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        showFutureRange: true,
        includeAllTime: true,
      });

      const keys = presets.map(p => p.key);
      expect(keys).not.toContain('3-months');
      expect(keys).not.toContain('6-months');
      expect(keys).not.toContain('year-to-date');
      expect(keys).not.toContain('last-month');
    });
  });

  describe('live range presets clamped to transaction bounds', () => {
    it('year-to-date returns range clamped to earliest transaction', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: '2016-06-15',
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        includeAllTime: true,
      });

      const ytdPreset = presets.find(p => p.key === 'year-to-date');
      const [start, end] = ytdPreset!.getRange();
      // Year-to-date starts 2017-01-01, clamped to earliest transaction month 2016-06
      expect(start).toBe('2017-01');
      expect(end).toBe('2017-01');
    });

    it('last-month returns correct month regardless of transaction bounds', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        includeAllTime: true,
      });

      const lastMonthPreset = presets.find(p => p.key === 'last-month');
      const [start, end] = lastMonthPreset!.getRange();
      expect(start).toBe('2016-12');
      expect(end).toBe('2016-12');
    });

    it('all-time returns full transaction range as month bounds', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: '2015-03-15',
        latestTransaction: '2017-01-20',
        show1Month: false,
        includeAllTime: true,
      });

      const allTimePreset = presets.find(p => p.key === 'all-time');
      const [start, end] = allTimePreset!.getRange();
      // Full range is earliest month to latest month
      expect(start).toBe('2015-03');
      expect(end).toBe('2017-01');
    });

    it('live presets include mode in onSelect callback', () => {
      const onSelect = vi.fn();
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: onSelect,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        includeAllTime: true,
      });

      const ytdPreset = presets.find(p => p.key === 'year-to-date');
      ytdPreset!.onSelect();

      expect(onSelect).toHaveBeenCalledOnce();
      const [, , mode] = onSelect.mock.calls[0][0];
      expect(mode).toBe('yearToDate');
    });

    it('past presets include sliding-window mode in onSelect callback', () => {
      const onSelect = vi.fn();
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: onSelect,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        includeAllTime: true,
      });

      const threeMonthPreset = presets.find(p => p.key === '3-months');
      threeMonthPreset!.onSelect();

      expect(onSelect).toHaveBeenCalledOnce();
      const [, , mode] = onSelect.mock.calls[0][0];
      expect(mode).toBe('sliding-window');
    });

    it('all-time preset includes full mode in onSelect callback', () => {
      const onSelect = vi.fn();
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: onSelect,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        includeAllTime: true,
      });

      const allTimePreset = presets.find(p => p.key === 'all-time');
      allTimePreset!.onSelect();

      expect(onSelect).toHaveBeenCalledOnce();
      const [, , mode] = onSelect.mock.calls[0][0];
      expect(mode).toBe('full');
    });

    it('quarter presets return quarter month bounds and preserve their modes', () => {
      const onSelect = vi.fn();
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: onSelect,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: LATEST_TRANSACTION,
        show1Month: false,
        includeAllTime: true,
      });

      const currentQuarterPreset = presets.find(
        p => p.key === 'current-quarter',
      );
      const previousQuarterPreset = presets.find(
        p => p.key === 'previous-quarter',
      );

      // The current quarter is unfinished in test mode (2017-01), so it is
      // clamped to the latest available transaction month.
      expect(currentQuarterPreset?.getRange()).toEqual(['2017-01', '2017-01']);
      expect(previousQuarterPreset?.getRange()).toEqual(['2016-10', '2016-12']);

      currentQuarterPreset!.onSelect();
      previousQuarterPreset!.onSelect();

      expect(onSelect.mock.calls[0][0][2]).toBe('currentQuarter');
      expect(onSelect.mock.calls[1][0][2]).toBe('previousQuarter');
    });

    it('clamps current-quarter preset selection to latest transaction month in unfinished quarters', () => {
      const onSelect = vi.fn();
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: onSelect,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: '2017-02-10',
        show1Month: false,
        includeAllTime: true,
      });

      const currentQuarterPreset = presets.find(
        p => p.key === 'current-quarter',
      );

      expect(currentQuarterPreset?.getRange()).toEqual(['2017-01', '2017-02']);

      currentQuarterPreset!.onSelect();

      expect(onSelect).toHaveBeenCalledWith([
        '2017-01',
        '2017-02',
        'currentQuarter',
      ]);
    });

    it('returns latestMonth for both endpoints when the current quarter lies entirely beyond the latest transaction', () => {
      const presets = buildDateRangePresets({
        t: mockT,
        onSelectRange: mockOnSelectRange,
        earliestTransaction: EARLIEST_TRANSACTION,
        latestTransaction: '2016-12-15',
        show1Month: false,
        includeAllTime: true,
      });

      const currentQuarterPreset = presets.find(
        p => p.key === 'current-quarter',
      );

      expect(currentQuarterPreset?.getRange()).toEqual(['2016-12', '2016-12']);
    });
  });
});
