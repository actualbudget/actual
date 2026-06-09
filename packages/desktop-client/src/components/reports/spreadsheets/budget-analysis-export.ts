import { buildCsv } from 'loot-core/shared/csv';
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

export function buildBudgetAnalysisCsv(rows: IntervalRow[]): string {
  return buildCsv(
    ['Month', 'Budgeted', 'Spent', 'Overspending Adjustment', 'Balance'],
    rows.map(row => [
      row.date,
      amountToString(row.budgeted),
      amountToString(row.spent),
      amountToString(row.overspendingAdjustment),
      amountToString(row.balance),
    ]),
  );
}
