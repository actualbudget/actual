import { describe, expect, it } from 'vitest';

import { buildBudgetAnalysisCsv } from './budget-analysis-export';

describe('buildBudgetAnalysisCsv', () => {
  const rows = [
    {
      date: '2024-01',
      budgeted: 100000,
      spent: -75000,
      balance: 25000,
      overspendingAdjustment: 0,
    },
    {
      date: '2024-02',
      budgeted: 100000,
      spent: -110000,
      balance: 15000,
      overspendingAdjustment: 10000,
    },
  ];

  const lines = (csv: string) => csv.trimEnd().split('\n');

  it('produces a header row and one data row per interval', () => {
    expect(lines(buildBudgetAnalysisCsv(rows, 2))).toHaveLength(3);
  });

  it('header contains the expected column names', () => {
    expect(lines(buildBudgetAnalysisCsv(rows, 2))[0]).toBe(
      'Month,Budgeted,Spent,Overspending Adjustment,Balance',
    );
  });

  it('converts integer amounts to decimal strings', () => {
    // budgeted 100000 → 1000, spent -75000 → -750, overspending 0 → 0, balance 25000 → 250
    expect(lines(buildBudgetAnalysisCsv(rows, 2))[1]).toBe(
      '2024-01,1000,-750,0,250',
    );
  });

  it.each([
    [0, '2024-01,100000,-75000,0,25000'],
    [3, '2024-01,100,-75,0,25'],
  ])('exports every budget field at %idp', (precision, expected) => {
    expect(lines(buildBudgetAnalysisCsv(rows, precision))[1]).toBe(expected);
  });

  it('keeps 3dp fractions and negative adjustments', () => {
    expect(
      lines(
        buildBudgetAnalysisCsv(
          [
            {
              date: '2024-03',
              budgeted: 1234,
              spent: -2345,
              overspendingAdjustment: -111,
              balance: -1222,
            },
          ],
          3,
        ),
      )[1],
    ).toBe('2024-03,1.234,-2.345,-0.111,-1.222');
  });

  it('exports only headers for an empty 3dp report', () => {
    expect(lines(buildBudgetAnalysisCsv([], 3))).toHaveLength(1);
  });

  it('handles negative spent values correctly', () => {
    // spent -110000 → -1100
    const fields = lines(buildBudgetAnalysisCsv(rows, 2))[2].split(',');
    expect(fields[2]).toBe('-1100');
  });

  it('returns only the header row for empty input', () => {
    const result = lines(buildBudgetAnalysisCsv([], 2));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(
      'Month,Budgeted,Spent,Overspending Adjustment,Balance',
    );
  });

  it('escapes fields containing commas with double quotes', () => {
    const specialRows = [
      {
        date: '2024,01',
        budgeted: 0,
        spent: 0,
        balance: 0,
        overspendingAdjustment: 0,
      },
    ];
    expect(
      lines(buildBudgetAnalysisCsv(specialRows, 2))[1].startsWith('"2024,01"'),
    ).toBe(true);
  });
});
