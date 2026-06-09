import { integerToAmount } from 'loot-core/shared/util';

type IntervalRow = {
  date: string;
  budgeted: number;
  spent: number;
  balance: number;
  overspendingAdjustment: number;
};

function amountToString(value: number): string {
  return integerToAmount(value).toFixed(2);
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildBudgetAnalysisCsv(rows: IntervalRow[]): string {
  const headers = [
    'Month',
    'Budgeted',
    'Spent',
    'Overspending Adjustment',
    'Balance',
  ];

  const lines: string[] = [headers.map(escapeCsvField).join(',')];

  for (const row of rows) {
    lines.push(
      [
        escapeCsvField(row.date),
        escapeCsvField(amountToString(row.budgeted)),
        escapeCsvField(amountToString(row.spent)),
        escapeCsvField(amountToString(row.overspendingAdjustment)),
        escapeCsvField(amountToString(row.balance)),
      ].join(','),
    );
  }

  return lines.join('\n');
}
