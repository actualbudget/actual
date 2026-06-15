import { processQueryResult } from './processQueryResult';

describe('processQueryResult', () => {
  it('passes through columns from AqlQueryResult', () => {
    const data = [{ name: 'Alice', amount: 100 }];
    const columns = [
      { name: 'name', type: 'string' },
      { name: 'amount', type: 'integer' },
    ];

    const result = processQueryResult(data, columns, false);

    expect(result.columns).toEqual([
      { name: 'name', type: 'string' },
      { name: 'amount', type: 'integer' },
    ]);
    expect(result.rows).toEqual(data);
    expect(result.scalar).toBeUndefined();
  });

  it('detects scalar when isCalculation=true with single numeric value', () => {
    const data = [{ $sum_amount: -4500 }];
    const columns = [{ name: '$sum_amount', type: 'integer' }];

    const result = processQueryResult(data, columns, true);

    expect(result.scalar).toBe(-4500);
    expect(result.rows).toEqual(data);
  });

  it('does not set scalar when isCalculation=false', () => {
    const data = [{ $sum_amount: -4500 }];
    const columns = [{ name: '$sum_amount', type: 'integer' }];

    const result = processQueryResult(data, columns, false);

    expect(result.scalar).toBeUndefined();
  });

  it('does not set scalar when result has multiple rows', () => {
    const data = [{ amount: 100 }, { amount: 200 }];
    const columns = [{ name: 'amount', type: 'integer' }];

    const result = processQueryResult(data, columns, true);

    expect(result.scalar).toBeUndefined();
  });

  it('does not set scalar when multiple numeric values exist', () => {
    const data = [{ sum: 100, count: 5 }];
    const columns = [
      { name: 'sum', type: 'integer' },
      { name: 'count', type: 'integer' },
    ];

    const result = processQueryResult(data, columns, true);

    expect(result.scalar).toBeUndefined();
  });

  it('infers columns from data when columns is undefined', () => {
    const data = [
      { name: 'Alice', amount: 100, date: '2024-01-15', active: true },
    ];

    const result = processQueryResult(data, undefined, false);

    expect(result.columns).toEqual([
      { name: 'name', type: 'string' },
      { name: 'amount', type: 'integer' },
      { name: 'date', type: 'date' },
      { name: 'active', type: 'boolean' },
    ]);
  });

  it('infers date-month type from YYYY-MM format', () => {
    const data = [{ month: '2024-01' }];

    const result = processQueryResult(data, undefined, false);

    expect(result.columns).toEqual([{ name: 'month', type: 'date-month' }]);
  });

  it('infers date-year type from YYYY format', () => {
    const data = [{ year: '2024' }];

    const result = processQueryResult(data, undefined, false);

    expect(result.columns).toEqual([{ name: 'year', type: 'date-year' }]);
  });

  it('infers float type from non-integer numbers', () => {
    const data = [{ value: 3.14 }];

    const result = processQueryResult(data, undefined, false);

    expect(result.columns).toEqual([{ name: 'value', type: 'float' }]);
  });

  it('returns empty columns for empty data', () => {
    const result = processQueryResult([], undefined, false);

    expect(result.columns).toEqual([]);
    expect(result.rows).toEqual([]);
  });
});
