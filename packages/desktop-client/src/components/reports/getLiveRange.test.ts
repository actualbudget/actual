import { disabledList } from './disabledList';
import { getLiveRange } from './getLiveRange';
import { ReportOptions } from './ReportOptions';

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

  describe('offset ranges and the includeCurrentInterval toggle', () => {
    it('extends "Last month" to the current month when the flag is on', () => {
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

      // currentDay() = '2017-01-01'
      expect(startExclude).toBe('2016-12-01');
      expect(endExclude).toBe('2016-12-31');
      expect(startInclude).toBe('2016-12-01');
      expect(endInclude).toBe('2017-01-31');
    });

    it('treats "Last week" the same way', () => {
      const [startExclude, endExclude] = getLiveRange(
        'Last week',
        EARLIEST,
        LATEST,
        false,
      );
      const [startInclude, endInclude] = getLiveRange(
        'Last week',
        EARLIEST,
        LATEST,
        true,
      );

      // currentDay() = '2017-01-01', so the week one back starts 2016-12-25
      expect(startExclude).toBe('2016-12-25');
      expect(endExclude).toBe('2016-12-31');
      expect(startInclude).toBe('2016-12-25');
      expect(endInclude).toBe('2017-01-07');
    });

    // The sidebar disables the toggle from a hand-kept list, which drifted from the ranges the
    // flag actually moves: "Last month" was disabled while still changing the range. Deriving the
    // expectation from getLiveRange keeps the two from parting again.
    it.each(ReportOptions.dateRange.map(range => range.key))(
      'disables the toggle for "%s" only when the range ignores it',
      key => {
        const [startExclude, endExclude] = getLiveRange(
          key,
          EARLIEST,
          LATEST,
          false,
        );
        const [startInclude, endInclude] = getLiveRange(
          key,
          EARLIEST,
          LATEST,
          true,
        );
        const flagMovesRange =
          startExclude !== startInclude || endExclude !== endInclude;

        expect(disabledList.currentInterval.get(key) ?? false).toBe(
          !flagMovesRange,
        );
      },
    );
  });
});
