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
    it.each([
      ['MM/dd/yyyy', 'MM/dd/yy'],
      ['dd/MM/yyyy', 'dd/MM/yy'],
      ['yyyy-MM-dd', 'yy-MM-dd'],
      ['MM.dd.yyyy', 'MM.dd.yy'],
      ['dd.MM.yyyy', 'dd.MM.yy'],
      ['dd-MM-yyyy', 'dd-MM-yy'],
    ])('derives %s into %s', (dateFormat, expected) => {
      expect(getIntervalFormat('Daily', dateFormat)).toBe(expected);
      expect(getIntervalFormat('Weekly', dateFormat)).toBe(expected);
    });

    it('keeps the two-digit year the axis labels already use', () => {
      // Long years would widen every tick label; only the ordering is at issue.
      for (const dateFormat of DATE_FORMATS) {
        expect(getIntervalFormat('Daily', dateFormat)).not.toContain('yyyy');
      }
    });

    it('falls back to the previous hardcoded format when no preference is set', () => {
      expect(getIntervalFormat('Daily', undefined)).toBe('yy-MM-dd');
      expect(getIntervalFormat('Weekly', undefined)).toBe('yy-MM-dd');
    });
  });

  describe('Monthly and Yearly intervals', () => {
    // No day/month ambiguity to resolve, so the preference must not reach them.
    it.each(['Monthly', 'Yearly'])(
      '%s is unchanged by the date format preference',
      interval => {
        const base = ReportOptions.intervalFormat.get(interval);
        for (const dateFormat of DATE_FORMATS) {
          expect(getIntervalFormat(interval, dateFormat)).toBe(base);
        }
      },
    );
  });

  it('returns an empty string for an unknown interval', () => {
    // Call sites currently write `intervalFormat.get(interval) || ''`, so an
    // unknown key has to keep producing a falsy format rather than throwing.
    expect(getIntervalFormat('Fortnightly', 'MM/dd/yyyy')).toBe('');
  });
});
