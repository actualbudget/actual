import * as monthUtils from '@actual-app/core/shared/months';

import { getIntervalFormat, ReportOptions } from './ReportOptions';

// The six values selectable in Settings -> Formatting -> Dates.
// See `components/settings/Format.tsx`.
const DATE_FORMATS = [
  'MM/dd/yyyy',
  'dd/MM/yyyy',
  'yyyy-MM-dd',
  'MM.dd.yyyy',
  'dd.MM.yyyy',
  'dd-MM-yyyy',
] as const;

describe('getIntervalFormat', () => {
  describe('Daily and Weekly intervals', () => {
    // These two are the only intervals whose label encodes day/month ordering,
    // so they are the only ones the preference can disagree with.
    it.each(DATE_FORMATS)('uses %s exactly as it is set', dateFormat => {
      expect(getIntervalFormat('Daily', dateFormat)).toBe(dateFormat);
      expect(getIntervalFormat('Weekly', dateFormat)).toBe(dateFormat);
    });

    it('keeps the four-digit year the preference asks for', () => {
      // An earlier revision shortened `yyyy` to `yy` to keep tick labels narrow.
      // That was reversed in review: a preference of `yyyy` shows as `yyyy`,
      // even though it makes the labels wider.
      for (const dateFormat of DATE_FORMATS) {
        expect(getIntervalFormat('Daily', dateFormat)).toContain('yyyy');
      }
    });

    it('falls back to an ISO-style format when no preference is set', () => {
      expect(getIntervalFormat('Daily', undefined)).toBe('yyyy-MM-dd');
      expect(getIntervalFormat('Weekly', undefined)).toBe('yyyy-MM-dd');
    });
  });

  describe('Monthly, Quarterly and Yearly intervals', () => {
    // No day/month ambiguity to resolve, so the preference must not reach them.
    it.each(['Monthly', 'Quarterly', 'Yearly'])(
      '%s is unchanged by the date format preference',
      interval => {
        const base = ReportOptions.intervalFormat.get(interval);
        for (const dateFormat of DATE_FORMATS) {
          expect(getIntervalFormat(interval, dateFormat)).toBe(base);
        }
      },
    );
  });

  it('labels quarters by their number and year', () => {
    const format = getIntervalFormat('Quarterly', 'MM/dd/yyyy');
    expect(
      ['2026-01', '2026-04', '2026-07', '2026-10'].map(quarter =>
        monthUtils.format(quarter, format),
      ),
    ).toEqual(["Q1 '26", "Q2 '26", "Q3 '26", "Q4 '26"]);
  });

  it('returns an empty string for an unknown interval', () => {
    // Call sites currently write `intervalFormat.get(interval) || ''`, so an
    // unknown key has to keep producing a falsy format rather than throwing.
    expect(getIntervalFormat('Fortnightly', 'MM/dd/yyyy')).toBe('');
  });
});
