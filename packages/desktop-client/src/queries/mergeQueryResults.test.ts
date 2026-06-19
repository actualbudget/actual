import { describe, expect, it } from 'vitest';

import { mergeQueryResults } from './mergeQueryResults';
import type { QueryResult } from './processQueryResult';

function makeResult(
  columns: Array<{ name: string; type: string }>,
  rows: Record<string, unknown>[],
  scalar?: number,
): QueryResult {
  return {
    columns: columns.map(c => ({ name: c.name, type: c.type })),
    rows,
    scalar,
  } as QueryResult;
}

describe('mergeQueryResults', () => {
  it('merges two queries with matching month column (basic outer join)', () => {
    const q1 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'budgeted', type: 'integer' },
      ],
      [
        { month: '2026-01', budgeted: 1000 },
        { month: '2026-02', budgeted: 2000 },
      ],
    );
    const q2 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'spent', type: 'integer' },
      ],
      [
        { month: '2026-01', spent: 800 },
        { month: '2026-03', spent: 1500 },
      ],
    );

    const result = mergeQueryResults([q1, q2]);

    if ('type' in result && result.type === 'merge-error') {
      throw new Error(`Unexpected merge error: ${result.message}`);
    }

    expect(result.mergeKey).toBe('month');
    expect(result.result.columns.map(c => c.name)).toEqual([
      'month',
      'budgeted',
      'spent',
    ]);
    expect(result.result.rows).toHaveLength(3);

    const jan = result.result.rows.find(r => r.month === '2026-01');
    expect(jan?.budgeted).toBe(1000);
    expect(jan?.spent).toBe(800);

    const feb = result.result.rows.find(r => r.month === '2026-02');
    expect(feb?.budgeted).toBe(2000);
    expect(feb?.spent).toBe(0);

    const mar = result.result.rows.find(r => r.month === '2026-03');
    expect(mar?.budgeted).toBe(0);
    expect(mar?.spent).toBe(1500);
  });

  it('errors when queries have no columns in common', () => {
    const q1 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'budgeted', type: 'integer' },
      ],
      [],
    );
    const q2 = makeResult(
      [
        { name: 'category', type: 'string' },
        { name: 'spent', type: 'integer' },
      ],
      [],
    );

    const result = mergeQueryResults([q1, q2]);

    if (!('type' in result)) {
      throw new Error('Expected merge error');
    }
    expect(result.type).toBe('merge-error');
    expect(result.message).toContain('no columns in common');
  });

  it('errors when queries have duplicate column names (non-merge-key)', () => {
    const q1 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'total', type: 'integer' },
      ],
      [],
    );
    const q2 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'total', type: 'integer' },
      ],
      [],
    );

    const result = mergeQueryResults([q1, q2]);

    if (!('type' in result)) {
      throw new Error('Expected merge error');
    }
    expect(result.message).toContain('total');
    expect(result.message).toContain('already used');
  });

  it('uses explicit merge key when provided', () => {
    const q1 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'budgeted', type: 'integer' },
      ],
      [{ month: '2026-01', budgeted: 1000 }],
    );
    const q2 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'spent', type: 'integer' },
      ],
      [{ month: '2026-01', spent: 800 }],
    );

    const result = mergeQueryResults([q1, q2], { mergeKey: 'month' });

    if ('type' in result) {
      throw new Error(`Unexpected merge error: ${result.message}`);
    }
    expect(result.mergeKey).toBe('month');
    expect(result.result.rows).toHaveLength(1);
  });

  it('errors when explicit merge key is missing from a query', () => {
    const q1 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'budgeted', type: 'integer' },
      ],
      [],
    );
    const q2 = makeResult(
      [
        { name: 'cat', type: 'string' },
        { name: 'spent', type: 'integer' },
      ],
      [],
    );

    const result = mergeQueryResults([q1, q2], { mergeKey: 'month' });

    if (!('type' in result)) {
      throw new Error('Expected merge error');
    }
    expect(result.message).toContain('month');
    expect(result.message).toContain('query result 2');
  });

  it('handles date type compatibility (date-month ≈ date)', () => {
    const q1 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'budgeted', type: 'integer' },
      ],
      [{ month: '2026-01', budgeted: 1000 }],
    );
    const q2 = makeResult(
      [
        { name: 'month', type: 'date' },
        { name: 'spent', type: 'integer' },
      ],
      [{ month: '2026-01', spent: 800 }],
    );

    const result = mergeQueryResults([q1, q2]);

    if ('type' in result) {
      throw new Error(`Unexpected merge error: ${result.message}`);
    }
    expect(result.mergeKey).toBe('month');
    expect(result.result.columns[0].type).toBe('date');
  });

  it('errors on incompatible merge key types (string vs date)', () => {
    const q1 = makeResult(
      [
        { name: 'cat', type: 'string' },
        { name: 'budgeted', type: 'integer' },
      ],
      [],
    );
    const q2 = makeResult(
      [
        { name: 'cat', type: 'date-month' },
        { name: 'spent', type: 'integer' },
      ],
      [],
    );

    const result = mergeQueryResults([q1, q2]);

    if (!('type' in result)) {
      throw new Error('Expected merge error');
    }
    expect(result.message).toContain('incompatible types');
  });

  it('zerofills missing months with 0 for measures and null for others', () => {
    const q1 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'budgeted', type: 'integer' },
        { name: 'label', type: 'string' },
      ],
      [{ month: '2026-01', budgeted: 1000, label: 'foo' }],
    );
    const q2 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'spent', type: 'integer' },
      ],
      [{ month: '2026-02', spent: 500 }],
    );

    const result = mergeQueryResults([q1, q2]);

    if ('type' in result) {
      throw new Error(`Unexpected merge error: ${result.message}`);
    }

    const jan = result.result.rows.find(r => r.month === '2026-01');
    expect(jan?.budgeted).toBe(1000);
    expect(jan?.spent).toBe(0);
    expect(jan?.label).toBe('foo');

    const feb = result.result.rows.find(r => r.month === '2026-02');
    expect(feb?.budgeted).toBe(0);
    expect(feb?.spent).toBe(500);
    expect(feb?.label).toBeNull();
  });

  it('passes through single query result unchanged', () => {
    const q1 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'budgeted', type: 'integer' },
      ],
      [{ month: '2026-01', budgeted: 1000 }],
      1000,
    );

    const result = mergeQueryResults([q1]);

    if ('type' in result) {
      throw new Error(`Unexpected merge error: ${result.message}`);
    }
    expect(result.result.columns).toEqual(q1.columns);
    expect(result.result.rows).toEqual(q1.rows);
    expect(result.result.scalar).toBe(1000);
    expect(result.sourceIndex).toEqual({ month: 0, budgeted: 0 });
  });

  it('orders columns: merge key first, then Q1 cols, then Q2 cols', () => {
    const q1 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'budgeted', type: 'integer' },
        { name: 'category', type: 'string' },
      ],
      [{ month: '2026-01', budgeted: 1000, category: 'Food' }],
    );
    const q2 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'spent', type: 'integer' },
        { name: 'count', type: 'integer' },
      ],
      [{ month: '2026-01', spent: 800, count: 5 }],
    );

    const result = mergeQueryResults([q1, q2]);

    if ('type' in result) {
      throw new Error(`Unexpected merge error: ${result.message}`);
    }
    expect(result.result.columns.map(c => c.name)).toEqual([
      'month',
      'budgeted',
      'category',
      'spent',
      'count',
    ]);
  });

  it('sorts rows by merge key value (ascending)', () => {
    const q1 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'budgeted', type: 'integer' },
      ],
      [
        { month: '2026-03', budgeted: 3000 },
        { month: '2026-01', budgeted: 1000 },
        { month: '2026-02', budgeted: 2000 },
      ],
    );
    const q2 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'spent', type: 'integer' },
      ],
      [
        { month: '2026-02', spent: 1500 },
        { month: '2026-01', spent: 800 },
      ],
    );

    const result = mergeQueryResults([q1, q2]);

    if ('type' in result) {
      throw new Error(`Unexpected merge error: ${result.message}`);
    }
    expect(result.result.rows.map(r => r.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });

  it('sets scalar to undefined in merged result', () => {
    const q1 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'total', type: 'integer' },
      ],
      [{ month: '2026-01', total: 5000 }],
      5000,
    );
    const q2 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'count', type: 'integer' },
      ],
      [{ month: '2026-01', count: 10 }],
    );

    const result = mergeQueryResults([q1, q2]);

    if ('type' in result) {
      throw new Error(`Unexpected merge error: ${result.message}`);
    }
    expect(result.result.scalar).toBeUndefined();
  });

  it('returns sourceIndex mapping columns to query indices', () => {
    const q1 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'budgeted', type: 'integer' },
      ],
      [{ month: '2026-01', budgeted: 1000 }],
    );
    const q2 = makeResult(
      [
        { name: 'month', type: 'date-month' },
        { name: 'spent', type: 'integer' },
      ],
      [{ month: '2026-01', spent: 800 }],
    );

    const result = mergeQueryResults([q1, q2]);

    if ('type' in result) {
      throw new Error(`Unexpected merge error: ${result.message}`);
    }
    expect(result.sourceIndex).toEqual({
      month: -1,
      budgeted: 0,
      spent: 1,
    });
  });
});
