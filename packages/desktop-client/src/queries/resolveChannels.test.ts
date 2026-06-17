import type { ChartSpec } from 'loot-core/types/chart-spec';

import type { QueryResult } from './processQueryResult';
import { resolveChannels } from './resolveChannels';

function makeResult(
  columns: Array<{
    name: string;
    type: QueryResult['columns'][number]['type'];
  }>,
  rows: Record<string, unknown>[] = [],
): QueryResult {
  return { columns, rows };
}

describe('resolveChannels', () => {
  describe('table mark', () => {
    it('passes through explicit channel bindings', () => {
      const result = makeResult([
        { name: 'category', type: 'string' },
        { name: 'amount', type: 'float' },
      ]);
      const spec: ChartSpec = {
        mark: 'table',
        encoding: {
          x: { field: 'category' },
          y: { field: 'amount' },
        },
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.errors).toEqual([]);
      expect(resolved.encoding.x?.field).toBe('category');
      expect(resolved.encoding.x?.type).toBe('category');
      expect(resolved.encoding.x?.autoAssigned).toBe(false);
      expect(resolved.encoding.y).toBeDefined();
      if (!Array.isArray(resolved.encoding.y)) {
        expect(resolved.encoding.y?.field).toBe('amount');
        expect(resolved.encoding.y?.type).toBe('number');
        expect(resolved.encoding.y?.autoAssigned).toBe(false);
      } else {
        throw new Error('Expected single Y, got array');
      }
    });

    it('leaves channels unbound when no encoding provided', () => {
      const result = makeResult([
        { name: 'category', type: 'string' },
        { name: 'amount', type: 'float' },
      ]);
      const spec: ChartSpec = { mark: 'table', encoding: {} };
      const resolved = resolveChannels(spec, result);
      expect(resolved.encoding.x).toBeUndefined();
      expect(resolved.encoding.y).toBeUndefined();
      expect(resolved.encoding.color).toBeUndefined();
    });

    it('preserves user-specified type when given', () => {
      const result = makeResult([{ name: 'date', type: 'date' }]);
      const spec: ChartSpec = {
        mark: 'table',
        encoding: { x: { field: 'date', type: 'date' } },
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.encoding.x?.type).toBe('date');
    });

    it('auto-assigns x to all non-id dimensions when only y is bound', () => {
      const result = makeResult([
        { name: 'category', type: 'string' },
        { name: 'amount', type: 'float' },
      ]);
      const spec: ChartSpec = {
        mark: 'table',
        encoding: { y: { field: 'amount' } },
      };
      const resolved = resolveChannels(spec, result);
      expect(Array.isArray(resolved.encoding.x)).toBe(true);
      if (Array.isArray(resolved.encoding.x)) {
        expect(resolved.encoding.x[0]?.field).toBe('category');
        expect(resolved.encoding.x[0]?.type).toBe('category');
        expect(resolved.encoding.x[0]?.autoAssigned).toBe(true);
      }
    });

    it('resolves x as array of two fields with types inferred', () => {
      const result = makeResult([
        { name: 'category', type: 'string' },
        { name: 'month', type: 'date-month' },
        { name: 'amount', type: 'float' },
      ]);
      const spec: ChartSpec = {
        mark: 'table',
        encoding: {
          x: [{ field: 'category' }, { field: 'month' }],
          y: { field: 'amount' },
        },
      };
      const resolved = resolveChannels(spec, result);
      expect(Array.isArray(resolved.encoding.x)).toBe(true);
      if (Array.isArray(resolved.encoding.x)) {
        expect(resolved.encoding.x).toHaveLength(2);
        expect(resolved.encoding.x[0]?.field).toBe('category');
        expect(resolved.encoding.x[0]?.type).toBe('category');
        expect(resolved.encoding.x[1]?.field).toBe('month');
        expect(resolved.encoding.x[1]?.type).toBe('date');
      }
    });

    it('warns when an x array field does not exist in the result', () => {
      const result = makeResult([
        { name: 'category', type: 'string' },
        { name: 'amount', type: 'float' },
      ]);
      const spec: ChartSpec = {
        mark: 'table',
        encoding: {
          x: [{ field: 'category' }, { field: 'missing' }],
          y: { field: 'amount' },
        },
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.errors).toHaveLength(1);
      expect(resolved.errors[0]).toMatch(/missing/);
    });

    it('errors on y[] + color combination', () => {
      const result = makeResult([
        { name: 'category', type: 'string' },
        { name: 'amount', type: 'float' },
      ]);
      const spec: ChartSpec = {
        mark: 'table',
        encoding: {
          y: [{ field: 'amount' }, { field: 'amount' }],
          color: { field: 'category' },
        },
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.errors).toHaveLength(1);
      expect(resolved.errors[0]).toMatch(/Multiple Y fields and Color channel/);
    });
  });

  describe('number mark', () => {
    it('auto-assigns y to first measure column when unbound', () => {
      const result = makeResult([
        { name: 'category', type: 'string' },
        { name: 'total', type: 'float' },
      ]);
      const spec: ChartSpec = { mark: 'number', encoding: {} };
      const resolved = resolveChannels(spec, result);
      expect(resolved.encoding.y).toBeDefined();
      if (!Array.isArray(resolved.encoding.y)) {
        expect(resolved.encoding.y?.field).toBe('total');
        expect(resolved.encoding.y?.type).toBe('number');
        expect(resolved.encoding.y?.autoAssigned).toBe(true);
      } else {
        throw new Error('Expected single Y, got array');
      }
    });

    it('uses explicit y when bound', () => {
      const result = makeResult([
        { name: 'category', type: 'string' },
        { name: 'total', type: 'float' },
        { name: 'count', type: 'integer' },
      ]);
      const spec: ChartSpec = {
        mark: 'number',
        encoding: { y: { field: 'count' } },
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.encoding.y).toBeDefined();
      if (!Array.isArray(resolved.encoding.y)) {
        expect(resolved.encoding.y?.field).toBe('count');
        expect(resolved.encoding.y?.autoAssigned).toBe(false);
      } else {
        throw new Error('Expected single Y, got array');
      }
    });

    it('warns when no measure column exists', () => {
      const result = makeResult([{ name: 'category', type: 'string' }]);
      const spec: ChartSpec = { mark: 'number', encoding: {} };
      const resolved = resolveChannels(spec, result);
      expect(resolved.warnings).toContain(
        'Number mark requires a numeric field, but the query has no numeric columns.',
      );
      expect(resolved.encoding.y).toBeUndefined();
    });

    it('warns when x channel is bound (number ignores x)', () => {
      const result = makeResult([
        { name: 'category', type: 'string' },
        { name: 'total', type: 'float' },
      ]);
      const spec: ChartSpec = {
        mark: 'number',
        encoding: { x: { field: 'category' }, y: { field: 'total' } },
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.warnings).toContain(
        'X channel is not used on number marks and will be ignored.',
      );
    });
  });

  describe('field validation', () => {
    it('errors when a channel references a non-existent field', () => {
      const result = makeResult([{ name: 'amount', type: 'float' }]);
      const spec: ChartSpec = {
        mark: 'table',
        encoding: { x: { field: 'missing' } },
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.errors).toHaveLength(1);
      expect(resolved.errors[0]).toMatch(/missing/);
    });

    it('errors when y references a non-existent field', () => {
      const result = makeResult([{ name: 'amount', type: 'float' }]);
      const spec: ChartSpec = {
        mark: 'table',
        encoding: { y: { field: 'missing' } },
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.errors).toHaveLength(1);
      expect(resolved.errors[0]).toMatch(/missing/);
    });
  });

  describe('empty result', () => {
    it('returns no-column warning and unbound encoding', () => {
      const result = makeResult([]);
      const spec: ChartSpec = { mark: 'table', encoding: {} };
      const resolved = resolveChannels(spec, result);
      expect(resolved.warnings).toContain('Query returned no columns.');
      expect(resolved.errors).toEqual([]);
    });
  });

  describe('columnRoles (private)', () => {
    it('groups date columns as time + dimension', () => {
      const result = makeResult([
        { name: 'month', type: 'date-month' },
        { name: 'category', type: 'string' },
        { name: 'amount', type: 'float' },
        { name: 'id', type: 'id' },
      ]);
      const spec: ChartSpec = {
        mark: 'column',
        encoding: {},
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.encoding.x?.field).toBe('month');
      expect(resolved.encoding.x?.type).toBe('date');
    });
  });

  describe('mark-specific auto-assignment (column)', () => {
    it('auto-assigns x to time column and y to measures', () => {
      const result = makeResult([
        { name: 'month', type: 'date-month' },
        { name: 'amount', type: 'float' },
      ]);
      const spec: ChartSpec = { mark: 'column', encoding: {} };
      const resolved = resolveChannels(spec, result);
      expect(resolved.encoding.x?.field).toBe('month');
      expect(resolved.encoding.x?.type).toBe('date');
      expect(resolved.encoding.x?.autoAssigned).toBe(true);
      expect(Array.isArray(resolved.encoding.y)).toBe(true);
      if (Array.isArray(resolved.encoding.y)) {
        expect(resolved.encoding.y[0]?.field).toBe('amount');
        expect(resolved.encoding.y[0]?.type).toBe('number');
        expect(resolved.encoding.y[0]?.autoAssigned).toBe(true);
      }
    });

    it('warns and uses first x field when x is an array on column', () => {
      const result = makeResult([
        { name: 'month', type: 'date-month' },
        { name: 'category', type: 'string' },
        { name: 'amount', type: 'float' },
      ]);
      const spec: ChartSpec = {
        mark: 'column',
        encoding: {
          x: [{ field: 'month' }, { field: 'category' }],
          y: { field: 'amount' },
        },
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.warnings).toContain(
        'Multiple X fields are not supported on column/bar marks. Only the first field will be used.',
      );
      expect(resolved.encoding.x?.field).toBe('month');
    });

    it('warns and uses first x field when x is an array on line', () => {
      const result = makeResult([
        { name: 'month', type: 'date-month' },
        { name: 'category', type: 'string' },
        { name: 'amount', type: 'float' },
      ]);
      const spec: ChartSpec = {
        mark: 'line',
        encoding: {
          x: [{ field: 'month' }, { field: 'category' }],
          y: { field: 'amount' },
        },
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.warnings).toContain(
        'Multiple X fields are not supported on line/area marks. Only the first field will be used.',
      );
      expect(resolved.encoding.x?.field).toBe('month');
    });
  });

  describe('size channel', () => {
    it('warns when size is bound on non-point mark', () => {
      const result = makeResult([
        { name: 'x', type: 'string' },
        { name: 'y', type: 'float' },
        { name: 'size', type: 'float' },
      ]);
      const spec: ChartSpec = {
        mark: 'table',
        encoding: { size: { field: 'size' } },
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.warnings).toContain(
        'Size channel is only supported on point marks, not on "table". The size channel will be ignored.',
      );
      expect(resolved.encoding.size).toBeUndefined();
    });
  });

  describe('stack config', () => {
    it('warns when stack is set on non-stackable mark', () => {
      const result = makeResult([
        { name: 'x', type: 'string' },
        { name: 'y', type: 'float' },
      ]);
      const spec: ChartSpec = {
        mark: 'line',
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
        config: { stack: 'stack' },
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.warnings).toContain(
        'Stack config is only supported on column, bar, and area marks, not on "line". The stack config will be ignored.',
      );
    });
  });

  describe('arc mark', () => {
    it('errors when arc has no color channel', () => {
      const result = makeResult([
        { name: 'category', type: 'string' },
        { name: 'amount', type: 'float' },
      ]);
      const spec: ChartSpec = {
        mark: 'arc',
        encoding: { y: { field: 'amount' } },
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.errors[0]).toMatch(/Arc mark requires/);
    });

    it('errors when arc has no y channel', () => {
      const result = makeResult([{ name: 'category', type: 'string' }]);
      const spec: ChartSpec = {
        mark: 'arc',
        encoding: { color: { field: 'category' } },
      };
      const resolved = resolveChannels(spec, result);
      expect(resolved.errors[0]).toMatch(/Arc mark requires/);
    });
  });
});
