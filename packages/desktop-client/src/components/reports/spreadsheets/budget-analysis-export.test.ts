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
    expect(lines(buildBudgetAnalysisCsv(rows))).toHaveLength(3);
  });

  it('header contains the expected column names', () => {
    expect(lines(buildBudgetAnalysisCsv(rows))[0]).toBe(
      'Month,Budgeted,Spent,Overspending Adjustment,Balance',
    );
  });

  it('converts integer amounts to decimal strings', () => {
    // budgeted 100000 → 1000, spent -75000 → -750, overspending 0 → 0, balance 25000 → 250
    expect(lines(buildBudgetAnalysisCsv(rows))[1]).toBe(
      '2024-01,1000,-750,0,250',
    );
  });

  it('handles negative spent values correctly', () => {
    // spent -110000 → -1100
    const fields = lines(buildBudgetAnalysisCsv(rows))[2].split(',');
    expect(fields[2]).toBe('-1100');
  });

  it('returns only the header row for empty input', () => {
    const result = lines(buildBudgetAnalysisCsv([]));
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
      lines(buildBudgetAnalysisCsv(specialRows))[1].startsWith('"2024,01"'),
    ).toBe(true);
  });
});
