import type { ChartSpec } from 'loot-core/types/chart-spec';

import { needsPivot, pivotData } from './pivotData';
import type { QueryResult } from './processQueryResult';
import { resolveChannels } from './resolveChannels';
import type { ResolvedChartSpec } from './resolveChannels';

function makeResult(
  columns: Array<{
    name: string;
    type: QueryResult['columns'][number]['type'];
  }>,
  rows: Record<string, unknown>[],
): QueryResult {
  return { columns, rows };
}

function resolve(spec: ChartSpec, result: QueryResult) {
  return resolveChannels(spec, result);
}

describe('pivotData', () => {
  describe('needsPivot', () => {
    it('returns true when series is bound and y is a single channel', () => {
      const result = makeResult(
        [
          { name: 'month', type: 'date-month' },
          { name: 'category', type: 'string' },
          { name: 'total', type: 'float' },
        ],
        [],
      );
      const spec: ChartSpec = {
        mark: 'column',
        encoding: {
          x: { field: 'month' },
          y: { field: 'total' },
          series: { field: 'category' },
        },
      };
      expect(needsPivot(resolve(spec, result))).toBe(true);
    });

    it('returns false when series is unbound', () => {
      const result = makeResult([{ name: 'total', type: 'float' }], []);
      const spec: ChartSpec = { mark: 'column', encoding: {} };
      expect(needsPivot(resolve(spec, result))).toBe(false);
    });

    it('returns false when y is an array (no pivot needed)', () => {
      const result = makeResult(
        [
          { name: 'month', type: 'date-month' },
          { name: 'category', type: 'string' },
          { name: 'amount', type: 'float' },
        ],
        [],
      );
      const spec: ChartSpec = {
        mark: 'column',
        encoding: {
          x: { field: 'month' },
          y: [{ field: 'amount' }],
          series: { field: 'category' },
        },
      };
      expect(needsPivot(resolve(spec, result))).toBe(false);
    });
  });

  describe('basic pivot', () => {
    it('pivots long format to wide format', () => {
      const result = makeResult(
        [
          { name: 'month', type: 'date-month' },
          { name: 'category', type: 'string' },
          { name: 'total', type: 'float' },
        ],
        [
          { month: '2024-01', category: 'Food', total: 77 },
          { month: '2024-01', category: 'Travel', total: 120 },
          { month: '2024-02', category: 'Food', total: 121 },
          { month: '2024-02', category: 'Travel', total: 89 },
        ],
      );
      const spec: ChartSpec = {
        mark: 'column',
        encoding: {
          x: { field: 'month' },
          y: { field: 'total' },
          series: { field: 'category' },
        },
      };
      const pivoted = pivotData(result.rows, resolve(spec, result));
      expect(pivoted.seriesKeys).toEqual(['Food', 'Travel']);
      expect(pivoted.data).toEqual([
        { month: '2024-01', Food: 77, Travel: 120 },
        { month: '2024-02', Food: 121, Travel: 89 },
      ]);
    });

    it('fills missing (x, series) combinations with null', () => {
      const result = makeResult(
        [
          { name: 'month', type: 'date-month' },
          { name: 'category', type: 'string' },
          { name: 'total', type: 'float' },
        ],
        [
          { month: '2024-01', category: 'Food', total: 77 },
          { month: '2024-02', category: 'Travel', total: 89 },
        ],
      );
      const spec: ChartSpec = {
        mark: 'column',
        encoding: {
          x: { field: 'month' },
          y: { field: 'total' },
          series: { field: 'category' },
        },
      };
      const pivoted = pivotData(result.rows, resolve(spec, result));
      expect(pivoted.seriesKeys).toEqual(['Food', 'Travel']);
      expect(pivoted.data).toEqual([
        { month: '2024-01', Food: 77, Travel: null },
        { month: '2024-02', Food: null, Travel: 89 },
      ]);
    });

    it('sums duplicate (x, series) combinations', () => {
      const result = makeResult(
        [
          { name: 'month', type: 'date-month' },
          { name: 'category', type: 'string' },
          { name: 'total', type: 'float' },
        ],
        [
          { month: '2024-01', category: 'Food', total: 50 },
          { month: '2024-01', category: 'Food', total: 27 },
        ],
      );
      const spec: ChartSpec = {
        mark: 'column',
        encoding: {
          x: { field: 'month' },
          y: { field: 'total' },
          series: { field: 'category' },
        },
      };
      const pivoted = pivotData(result.rows, resolve(spec, result));
      expect(pivoted.data).toEqual([{ month: '2024-01', Food: 77 }]);
    });

    it('skips rows with null/undefined series values', () => {
      const result = makeResult(
        [
          { name: 'month', type: 'date-month' },
          { name: 'category', type: 'string' },
          { name: 'total', type: 'float' },
        ],
        [
          { month: '2024-01', category: 'Food', total: 50 },
          { month: '2024-01', category: null, total: 100 },
          { month: '2024-01', category: undefined, total: 75 },
        ],
      );
      const spec: ChartSpec = {
        mark: 'column',
        encoding: {
          x: { field: 'month' },
          y: { field: 'total' },
          series: { field: 'category' },
        },
      };
      const pivoted = pivotData(result.rows, resolve(spec, result));
      expect(pivoted.seriesKeys).toEqual(['Food']);
      expect(pivoted.data).toEqual([{ month: '2024-01', Food: 50 }]);
    });

    it('skips rows with null/undefined x values', () => {
      const result = makeResult(
        [
          { name: 'month', type: 'date-month' },
          { name: 'category', type: 'string' },
          { name: 'total', type: 'float' },
        ],
        [
          { month: null, category: 'Food', total: 50 },
          { month: '2024-01', category: 'Food', total: 30 },
        ],
      );
      const spec: ChartSpec = {
        mark: 'column',
        encoding: {
          x: { field: 'month' },
          y: { field: 'total' },
          series: { field: 'category' },
        },
      };
      const pivoted = pivotData(result.rows, resolve(spec, result));
      expect(pivoted.seriesKeys).toEqual(['Food']);
      expect(pivoted.data).toEqual([{ month: '2024-01', Food: 30 }]);
    });

    it('returns empty data when all series values are null', () => {
      const result = makeResult(
        [
          { name: 'month', type: 'date-month' },
          { name: 'category', type: 'string' },
          { name: 'total', type: 'float' },
        ],
        [
          { month: '2024-01', category: null, total: 50 },
          { month: '2024-02', category: null, total: 30 },
        ],
      );
      const spec: ChartSpec = {
        mark: 'column',
        encoding: {
          x: { field: 'month' },
          y: { field: 'total' },
          series: { field: 'category' },
        },
      };
      const pivoted = pivotData(result.rows, resolve(spec, result));
      expect(pivoted.data).toEqual([]);
      expect(pivoted.seriesKeys).toEqual([]);
    });
  });

  describe('no x-axis', () => {
    it('produces a single summary row when x is explicitly undefined', () => {
      const result = makeResult(
        [
          { name: 'category', type: 'string' },
          { name: 'total', type: 'float' },
        ],
        [
          { category: 'Food', total: 50 },
          { category: 'Travel', total: 30 },
        ],
      );
      const resolved: ResolvedChartSpec = {
        mark: 'table',
        encoding: {
          y: { field: 'total', type: 'number' },
          series: { field: 'category', type: 'category' },
        },
        warnings: [],
        errors: [],
      };
      const pivoted = pivotData(result.rows, resolved);
      expect(pivoted.seriesKeys).toEqual(['Food', 'Travel']);
      expect(pivoted.data).toEqual([{ Food: 50, Travel: 30 }]);
    });
  });

  describe('sort', () => {
    it('applies ascending sort to x field', () => {
      const result = makeResult(
        [
          { name: 'month', type: 'date-month' },
          { name: 'category', type: 'string' },
          { name: 'total', type: 'float' },
        ],
        [
          { month: '2024-03', category: 'Food', total: 50 },
          { month: '2024-01', category: 'Food', total: 30 },
          { month: '2024-02', category: 'Food', total: 40 },
        ],
      );
      const spec: ChartSpec = {
        mark: 'column',
        encoding: {
          x: { field: 'month', sort: 'asc' },
          y: { field: 'total' },
          series: { field: 'category' },
        },
      };
      const pivoted = pivotData(result.rows, resolve(spec, result));
      expect(pivoted.data.map(r => r.month)).toEqual([
        '2024-01',
        '2024-02',
        '2024-03',
      ]);
    });

    it('applies descending sort to x field', () => {
      const result = makeResult(
        [
          { name: 'month', type: 'date-month' },
          { name: 'category', type: 'string' },
          { name: 'total', type: 'float' },
        ],
        [
          { month: '2024-01', category: 'Food', total: 30 },
          { month: '2024-03', category: 'Food', total: 50 },
          { month: '2024-02', category: 'Food', total: 40 },
        ],
      );
      const spec: ChartSpec = {
        mark: 'column',
        encoding: {
          x: { field: 'month', sort: 'desc' },
          y: { field: 'total' },
          series: { field: 'category' },
        },
      };
      const pivoted = pivotData(result.rows, resolve(spec, result));
      expect(pivoted.data.map(r => r.month)).toEqual([
        '2024-03',
        '2024-02',
        '2024-01',
      ]);
    });
  });

  describe('series not bound', () => {
    it('returns original rows and empty seriesKeys', () => {
      const rows = [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ];
      const result = makeResult(
        [
          { name: 'a', type: 'integer' },
          { name: 'b', type: 'integer' },
        ],
        rows,
      );
      const spec: ChartSpec = {
        mark: 'column',
        encoding: { y: { field: 'b' } },
      };
      const pivoted = pivotData(result.rows, resolve(spec, result));
      expect(pivoted.data).toEqual(rows);
      expect(pivoted.seriesKeys).toEqual([]);
    });
  });
});
