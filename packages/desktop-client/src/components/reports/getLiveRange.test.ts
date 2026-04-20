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

    it('clamps start date to earliestTransaction when data is scarce', () => {
      const [start, end] = getLiveRange(
        'Last 30 days',
        '2016-12-20',
        LATEST,
        false,
      );
      expect(start).toBe('2016-12-20');
      expect(end).toBe('2017-01-01');
    });

    it('clamps end date to latestTransaction when it precedes today', () => {
      const [start, end] = getLiveRange(
        'Last 30 days',
        EARLIEST,
        '2016-12-25',
        false,
      );
      expect(start).toBe('2016-12-03');
      expect(end).toBe('2016-12-25');
    });

    it('returns sliding-window mode', () => {
      const [, , mode] = getLiveRange('Last 30 days', EARLIEST, LATEST, false);
      expect(mode).toBe('sliding-window');
    });
  });
});
