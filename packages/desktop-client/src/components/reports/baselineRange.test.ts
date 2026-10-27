import {
  countDays,
  countElapsedDays,
  defaultBaseline,
  getBaselineRange,
  rangesOverlap,
} from './baselineRange';
import { disabledList } from './disabledList';
import { ReportOptions } from './ReportOptions';

// In test mode, monthUtils.currentDay() returns '2017-01-01'
describe('baseline day counts', () => {
  it('counts days inclusively, accepting month strings', () => {
    expect(countDays('2016-12-01', '2016-12-31')).toBe(31);
    expect(countDays('2016-12', '2016-12-31')).toBe(31);
  });

  it('only counts days that have already happened', () => {
    expect(countElapsedDays('2016-12-01', '2017-01-31')).toBe(32);
    expect(countElapsedDays('2017-02-01', '2017-02-28')).toBe(1);
  });
});

describe('rangesOverlap', () => {
  it('detects shared days', () => {
    expect(
      rangesOverlap(['2016-07-01', '2016-12-31'], ['2016-12-31', '2017-01-31']),
    ).toBe(true);
    expect(
      rangesOverlap(['2016-07-01', '2016-12-31'], ['2017-01-01', '2017-01-31']),
    ).toBe(false);
  });
});

describe('getBaselineRange', () => {
  it('defaults to the six complete months before today', () => {
    expect(
      getBaselineRange(defaultBaseline, '2015-01-01', '2017-01-01'),
    ).toEqual(['2016-07-01', '2016-12-31']);
  });

  it('keeps a static range as chosen', () => {
    expect(
      getBaselineRange(
        {
          ...defaultBaseline,
          isDateStatic: true,
          startDate: '2016-03-01',
          endDate: '2016-03-15',
        },
        '2015-01-01',
        '2017-01-01',
      ),
    ).toEqual(['2016-03-01', '2016-03-15']);
  });
});

describe('baseline "include current" checkbox', () => {
  // "Last month" disables the toggle but its saved value still widens the
  // range. The date filter has the same bug and the fix is pending upstream;
  // once it lands this starts passing and should move to the main list.
  const KNOWN_DISABLED_BUT_APPLIED = ['Last month'];

  function expectToggleMatchesEnabledState(dateRange: string) {
    const resolve = (includeCurrentInterval: boolean) =>
      getBaselineRange(
        { ...defaultBaseline, dateRange, includeCurrentInterval },
        '2015-01-01',
        '2017-01-01',
      );

    // The checkbox shares the date filter's rule for when it is disabled, so
    // a disabled checkbox must never change which dates are used
    if (disabledList.currentInterval.get(dateRange)) {
      expect(resolve(true)).toEqual(resolve(false));
    } else {
      expect(resolve(true)).not.toEqual(resolve(false));
    }
  }

  it.each(
    ReportOptions.dateRange
      .map(option => option.key)
      .filter(key => !KNOWN_DISABLED_BUT_APPLIED.includes(key)),
  )('only changes "%s" when it is enabled', expectToggleMatchesEnabledState);

  it.fails.each(KNOWN_DISABLED_BUT_APPLIED)(
    'only changes "%s" when it is enabled (known bug)',
    expectToggleMatchesEnabledState,
  );

  it('never changes a static range', () => {
    const range = { ...defaultBaseline, isDateStatic: true };
    expect(
      getBaselineRange(
        { ...range, includeCurrentInterval: true },
        '2015-01-01',
        '2017-01-01',
      ),
    ).toEqual(
      getBaselineRange(
        { ...range, includeCurrentInterval: false },
        '2015-01-01',
        '2017-01-01',
      ),
    );
  });
});
