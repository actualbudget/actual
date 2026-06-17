import { fillGaps, needsGapFill } from './fillGaps';
import type { ResolvedChannel } from './resolveChannels';

function makeChannel(
  field: string,
  type: 'date' | 'category' | 'number',
): ResolvedChannel {
  return { field, type, autoAssigned: false };
}

describe('fillGaps', () => {
  describe('needsGapFill', () => {
    it('returns true for date x channels', () => {
      expect(needsGapFill(makeChannel('month', 'date'))).toBe(true);
    });

    it('returns false for non-date x channels', () => {
      expect(needsGapFill(makeChannel('name', 'category'))).toBe(false);
      expect(needsGapFill(makeChannel('amount', 'number'))).toBe(false);
    });

    it('returns false for undefined or array x', () => {
      expect(needsGapFill(undefined)).toBe(false);
      expect(needsGapFill([makeChannel('a', 'date')])).toBe(false);
    });
  });

  it('returns data unchanged when x is undefined', () => {
    const data = [{ a: 1 }, { a: 2 }];
    const result = fillGaps(data, undefined, ['a']);
    expect(result).toBe(data);
  });

  it('returns data unchanged when x is category', () => {
    const data = [
      { name: 'A', val: 1 },
      { name: 'B', val: 2 },
    ];
    const x = makeChannel('name', 'category');
    expect(fillGaps(data, x, ['val'])).toBe(data);
  });

  it('fills missing months with zeros for date-month', () => {
    const data = [
      { month: '2024-01', total: 50 },
      { month: '2024-03', total: 30 },
      { month: '2024-04', total: 40 },
    ];
    const x = makeChannel('month', 'date');
    const result = fillGaps(data, x, ['total'], { xColumnType: 'date-month' });
    expect(result.map(r => r.month)).toEqual([
      '2024-01',
      '2024-02',
      '2024-03',
      '2024-04',
    ]);
    expect(result[0].total).toBe(50);
    expect(result[1].total).toBe(0);
    expect(result[2].total).toBe(30);
    expect(result[3].total).toBe(40);
  });

  it('fills missing years with zeros for date-year', () => {
    const data = [
      { year: '2020', total: 100 },
      { year: '2022', total: 200 },
    ];
    const x = makeChannel('year', 'date');
    const result = fillGaps(data, x, ['total'], { xColumnType: 'date-year' });
    expect(result.map(r => r.year)).toEqual(['2020', '2021', '2022']);
    expect(result[0].total).toBe(100);
    expect(result[1].total).toBe(0);
    expect(result[2].total).toBe(200);
  });

  it('fills missing days with zeros for date', () => {
    const data = [
      { day: '2024-01-01', total: 10 },
      { day: '2024-01-03', total: 30 },
    ];
    const x = makeChannel('day', 'date');
    const result = fillGaps(data, x, ['total']);
    expect(result.map(r => r.day)).toEqual([
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
    ]);
    expect(result[1].total).toBe(0);
  });

  it('returns data unchanged when gap count exceeds maxPeriods', () => {
    const data = [
      { month: '2020-01', total: 1 },
      { month: '2024-01', total: 2 },
    ];
    const x = makeChannel('month', 'date');
    const result = fillGaps(data, x, ['total'], {
      maxPeriods: 12,
      xColumnType: 'date-month',
    });
    expect(result).toBe(data);
  });

  it('returns data unchanged for single row', () => {
    const data = [{ month: '2024-01', total: 50 }];
    const x = makeChannel('month', 'date');
    expect(fillGaps(data, x, ['total'], { xColumnType: 'date-month' })).toBe(
      data,
    );
  });

  it('returns data unchanged for empty data', () => {
    const data: Record<string, unknown>[] = [];
    const x = makeChannel('month', 'date');
    expect(fillGaps(data, x, ['total'], { xColumnType: 'date-month' })).toBe(
      data,
    );
  });

  it('returns data unchanged when no gaps exist', () => {
    const data = [
      { month: '2024-01', total: 50 },
      { month: '2024-02', total: 30 },
    ];
    const x = makeChannel('month', 'date');
    const result = fillGaps(data, x, ['total'], { xColumnType: 'date-month' });
    expect(result).toEqual(data);
  });

  it('fills all y fields with zero on missing periods', () => {
    const data = [
      { month: '2024-01', total: 50, count: 5 },
      { month: '2024-03', total: 30, count: 3 },
    ];
    const x = makeChannel('month', 'date');
    const result = fillGaps(data, x, ['total', 'count'], {
      xColumnType: 'date-month',
    });
    expect(result[1].total).toBe(0);
    expect(result[1].count).toBe(0);
  });

  it('sets non-x, non-y fields to null on missing periods', () => {
    const data = [
      { month: '2024-01', total: 50, category: 'A' },
      { month: '2024-03', total: 30, category: 'B' },
    ];
    const x = makeChannel('month', 'date');
    const result = fillGaps(data, x, ['total'], { xColumnType: 'date-month' });
    expect(result[1].category).toBeNull();
    expect(result[1].total).toBe(0);
  });
});
