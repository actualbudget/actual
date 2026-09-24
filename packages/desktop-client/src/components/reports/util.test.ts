import { normalizeCustomReportDateRange } from './util';

describe('normalizeCustomReportDateRange', () => {
  it.each<[string, [string, string]]>([
    ['Daily', ['2026-03-01', '2026-08-31']],
    ['Weekly', ['2026-03-01', '2026-08-31']],
    ['Monthly', ['2026-03', '2026-08']],
    ['Yearly', ['2026', '2026']],
  ])('normalizes %s report boundaries', (interval, expected) => {
    expect(
      normalizeCustomReportDateRange(interval, '2026-03', '2026-08'),
    ).toEqual(expected);
  });
});
