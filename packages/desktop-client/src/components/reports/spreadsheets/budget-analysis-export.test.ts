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

  it('produces a header row and one data row per interval', () => {
    const csv = buildBudgetAnalysisCsv(rows);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 data rows
  });

  it('header contains the expected column names', () => {
    const csv = buildBudgetAnalysisCsv(rows);
    const header = csv.split('\n')[0];
    expect(header).toBe('Month,Budgeted,Spent,Overspending Adjustment,Balance');
  });

  it('converts integer amounts to decimal strings', () => {
    const csv = buildBudgetAnalysisCsv(rows);
    const lines = csv.split('\n');
    // Row 1: budgeted 100000 → 1000.00, spent -75000 → -750.00, overspending 0 → 0.00, balance 25000 → 250.00
    expect(lines[1]).toBe('2024-01,1000.00,-750.00,0.00,250.00');
  });

  it('handles negative spent values correctly', () => {
    const csv = buildBudgetAnalysisCsv(rows);
    const lines = csv.split('\n');
    // Row 2: spent -110000 → -1100.00
    const fields = lines[2].split(',');
    expect(fields[2]).toBe('-1100.00');
  });

  it('returns only the header row for empty input', () => {
    const csv = buildBudgetAnalysisCsv([]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
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
    const csv = buildBudgetAnalysisCsv(specialRows);
    const lines = csv.split('\n');
    expect(lines[1].startsWith('"2024,01"')).toBe(true);
  });
});
