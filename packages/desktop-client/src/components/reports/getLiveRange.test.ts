import { getLiveRange } from './getLiveRange';

// In test mode, monthUtils.currentDay() returns '2017-01-01'
const EARLIEST = '2015-01-01';
const LATEST = '2017-01-01';

describe('getLiveRange', () => {
  describe('Last 30 days', () => {
    it('returns the last 30 days ending today', () => {
      const [start, end] = getLiveRange(
        'Last 30 days',
        EARLIEST,
        LATEST,
        false,
      );
      // currentDay() = '2017-01-01', so 29 days before = '2016-12-03'
      expect(start).toBe('2016-12-03');
      expect(end).toBe('2017-01-01');
    });

    it('is not affected by the includeCurrentInterval flag', () => {
      const [startExclude, endExclude] = getLiveRange(
        'Last 30 days',
        EARLIEST,
        LATEST,
        false,
      );
      const [startInclude, endInclude] = getLiveRange(
        'Last 30 days',
        EARLIEST,
        LATEST,
        true,
      );
      expect(startExclude).toBe(startInclude);
      expect(endExclude).toBe(endInclude);
    });

    it('clamps start date to earliestTransaction when data starts later', () => {
      const [start, end] = getLiveRange(
        'Last 30 days',
        '2016-12-20',
        LATEST,
        false,
      );
      expect(start).toBe('2016-12-20');
      expect(end).toBe('2017-01-01');
    });

    it('returns the live range even when latestTransaction precedes today', () => {
      const [start, end] = getLiveRange(
        'Last 30 days',
        EARLIEST,
        '2016-12-25',
        false,
      );
      expect(start).toBe('2016-12-03');
      expect(end).toBe('2017-01-01');
    });

    it('returns sliding-window mode', () => {
      const [, , mode] = getLiveRange('Last 30 days', EARLIEST, LATEST, false);
      expect(mode).toBe('sliding-window');
    });
  });

  describe('Year to date', () => {
    it('ends today even when latestTransaction precedes today', () => {
      const [start, end] = getLiveRange(
        'Year to date',
        EARLIEST,
        '2016-12-25',
        false,
      );

      expect(start).toBe('2017-01-01');
      expect(end).toBe('2017-01-01');
    });
  });

  describe('Current quarter', () => {
    it('returns the full quarter containing today (Q1: Jan-Mar)', () => {
      const [start, end] = getLiveRange(
        'Current quarter',
        EARLIEST,
        LATEST,
        false,
      );
      // currentMonth() = '2017-01', so the quarter is Jan-Mar 2017
      expect(start).toBe('2017-01-01');
      expect(end).toBe('2017-03-31');
    });

    it('clamps start date to earliestTransaction when data starts later', () => {
      const [start, end] = getLiveRange(
        'Current quarter',
        '2017-02-15',
        LATEST,
        false,
      );
      expect(start).toBe('2017-02-15');
      expect(end).toBe('2017-03-31');
    });
  });

  describe('Previous quarter', () => {
    it('returns the full previous quarter (Q4 of the prior year: Oct-Dec)', () => {
      const [start, end] = getLiveRange(
        'Previous quarter',
        EARLIEST,
        LATEST,
        false,
      );
      // currentMonth() = '2017-01', so the previous quarter is Oct-Dec 2016
      expect(start).toBe('2016-10-01');
      expect(end).toBe('2016-12-31');
    });
  });

  describe('Last month', () => {
    it('returns the full previous month', () => {
      const [start, end] = getLiveRange('Last month', EARLIEST, LATEST, false);
      expect(start).toBe('2016-12-01');
      expect(end).toBe('2016-12-31');
    });

    it('is not affected by the includeCurrentInterval flag', () => {
      const [startExclude, endExclude] = getLiveRange(
        'Last month',
        EARLIEST,
        LATEST,
        false,
      );
      const [startInclude, endInclude] = getLiveRange(
        'Last month',
        EARLIEST,
        LATEST,
        true,
      );
      expect(startInclude).toBe('2016-12-01');
      expect(endInclude).toBe('2016-12-31');
      expect(startInclude).toBe(startExclude);
      expect(endInclude).toBe(endExclude);
    });

    it('clamps start date to earliestTransaction when data starts mid-month', () => {
      const [start, end] = getLiveRange(
        'Last month',
        '2016-12-15',
        LATEST,
        true,
      );
      expect(start).toBe('2016-12-15');
      expect(end).toBe('2016-12-31');
    });

    it('clamps start date when earliestTransaction is on the last day of last month', () => {
      const [start, end] = getLiveRange(
        'Last month',
        '2016-12-31',
        LATEST,
        false,
      );
      expect(start).toBe('2016-12-31');
      expect(end).toBe('2016-12-31');
    });

    it('does not invert range when earliestTransaction is after last month', () => {
      const [start, end] = getLiveRange(
        'Last month',
        '2017-01-01',
        LATEST,
        false,
      );
      expect(start).toBe('2016-12-01');
      expect(end).toBe('2016-12-31');
    });
  });

  describe('includeCurrentInterval toggle consistency', () => {
    it('still honors includeCurrentInterval for numeric ranges that allow it', () => {
      const [, endExclude] = getLiveRange(
        'Last 3 months',
        EARLIEST,
        LATEST,
        false,
      );
      const [, endInclude] = getLiveRange(
        'Last 3 months',
        EARLIEST,
        LATEST,
        true,
      );
      expect(endExclude).toBe('2016-12-31');
      expect(endInclude).toBe('2017-01-31');
    });

    it.each([
      'This week',
      'This month',
      'Last month',
      'Current quarter',
      'Previous quarter',
      'Last 30 days',
      'Year to date',
      'Last year',
      'Prior year to date',
      'All time',
    ])('ignores includeCurrentInterval for %s', range => {
      expect(getLiveRange(range, EARLIEST, LATEST, true)).toEqual(
        getLiveRange(range, EARLIEST, LATEST, false),
      );
    });
  });
});
