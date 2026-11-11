import {
  CALENDAR_CARD_DEFAULT_MONTHS,
  CALENDAR_CARD_MAX_MONTHS,
  getCalendarCardMonthsShown,
  getMonthsShownRange,
  normalizeMonthsShown,
} from './calendarMonths';

describe('normalizeMonthsShown', () => {
  it('accepts whole numbers within range', () => {
    expect(normalizeMonthsShown(1)).toBe(1);
    expect(normalizeMonthsShown(3)).toBe(3);
    expect(normalizeMonthsShown(CALENDAR_CARD_MAX_MONTHS)).toBe(
      CALENDAR_CARD_MAX_MONTHS,
    );
  });

  it('clamps values above the maximum', () => {
    expect(normalizeMonthsShown(12)).toBe(CALENDAR_CARD_MAX_MONTHS);
  });

  it('rejects invalid values', () => {
    expect(normalizeMonthsShown(undefined)).toBeUndefined();
    expect(normalizeMonthsShown(null)).toBeUndefined();
    expect(normalizeMonthsShown(0)).toBeUndefined();
    expect(normalizeMonthsShown(-2)).toBeUndefined();
    expect(normalizeMonthsShown('3')).toBeUndefined();
    expect(normalizeMonthsShown(Number.NaN)).toBeUndefined();
  });
});

describe('getMonthsShownRange', () => {
  it('covers just the current month for a single month', () => {
    expect(getMonthsShownRange(1, undefined, '2026-10-19')).toEqual([
      '2026-10-01',
      '2026-10-19',
    ]);
  });

  it('starts on the first day of the earliest month', () => {
    expect(getMonthsShownRange(3, undefined, '2026-10-19')).toEqual([
      '2026-08-01',
      '2026-10-19',
    ]);
  });

  it('crosses year boundaries', () => {
    expect(getMonthsShownRange(4, undefined, '2027-02-03')).toEqual([
      '2026-11-01',
      '2027-02-03',
    ]);
  });

  it('extends to a latest transaction in the future', () => {
    expect(getMonthsShownRange(2, '2026-11-05', '2026-10-19')).toEqual([
      '2026-10-01',
      '2026-11-05',
    ]);
  });

  it('ignores a latest transaction in the past', () => {
    expect(getMonthsShownRange(2, '2026-09-05', '2026-10-19')).toEqual([
      '2026-09-01',
      '2026-10-19',
    ]);
  });
});

describe('getCalendarCardMonthsShown', () => {
  it('defaults to a single month for cards without configuration', () => {
    expect(getCalendarCardMonthsShown(null)).toBe(CALENDAR_CARD_DEFAULT_MONTHS);
    expect(getCalendarCardMonthsShown(undefined)).toBe(
      CALENDAR_CARD_DEFAULT_MONTHS,
    );
    expect(getCalendarCardMonthsShown({ name: 'Calendar' })).toBe(
      CALENDAR_CARD_DEFAULT_MONTHS,
    );
  });

  it('prefers the explicit month count', () => {
    expect(
      getCalendarCardMonthsShown({
        monthsShown: 3,
        timeFrame: { start: '2024-01-01', end: '2024-12-31', mode: 'static' },
      }),
    ).toBe(3);
  });

  it('falls back to the time frame for cards with a custom range', () => {
    expect(
      getCalendarCardMonthsShown({
        timeFrame: { start: '2024-01-01', end: '2024-12-31', mode: 'static' },
      }),
    ).toBeUndefined();
  });
});
