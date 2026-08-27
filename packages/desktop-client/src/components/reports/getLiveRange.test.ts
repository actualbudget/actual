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

  describe('From start date', () => {
    it('pins the saved start and ends today', () => {
      const [start, end] = getLiveRange(
        'fromStartDate',
        EARLIEST,
        LATEST,
        false,
        undefined,
        '2016-03-15',
      );

      expect(start).toBe('2016-03-15');
      expect(end).toBe('2017-01-01');
    });

    it('pads a month-shaped saved start to days', () => {
      const [start, end] = getLiveRange(
        'fromStartDate',
        EARLIEST,
        LATEST,
        false,
        undefined,
        '2016-03',
      );

      expect(start).toBe('2016-03-01');
      expect(end).toBe('2017-01-01');
    });

    it('clamps the saved start to earliestTransaction', () => {
      const [start, end] = getLiveRange(
        'fromStartDate',
        EARLIEST,
        LATEST,
        false,
        undefined,
        '2014-06-01',
      );

      expect(start).toBe(EARLIEST);
      expect(end).toBe('2017-01-01');
    });

    it('falls back to earliestTransaction without a saved start', () => {
      const [start, end] = getLiveRange(
        'fromStartDate',
        EARLIEST,
        LATEST,
        false,
      );

      expect(start).toBe(EARLIEST);
      expect(end).toBe('2017-01-01');
    });

    it('is not affected by the includeCurrentInterval flag', () => {
      const [startExclude, endExclude] = getLiveRange(
        'fromStartDate',
        EARLIEST,
        LATEST,
        false,
        undefined,
        '2016-03-15',
      );
      const [startInclude, endInclude] = getLiveRange(
        'fromStartDate',
        EARLIEST,
        LATEST,
        true,
        undefined,
        '2016-03-15',
      );

      expect(startExclude).toBe(startInclude);
      expect(endExclude).toBe(endInclude);
    });

    it('returns static-start mode', () => {
      const [, , mode] = getLiveRange(
        'fromStartDate',
        EARLIEST,
        LATEST,
        false,
        undefined,
        '2016-03-15',
      );
      expect(mode).toBe('static-start');
    });
  });
});
