import { buildCsv } from '@actual-app/core/shared/csv';
import { integerToAmount } from '@actual-app/core/shared/util';

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

export type BudgetAnalysisCsvLabels = {
  month: string;
  budgeted: string;
  spent: string;
  overspendingAdjustment: string;
  balance: string;
};

const DEFAULT_LABELS: BudgetAnalysisCsvLabels = {
  month: 'Month',
  budgeted: 'Budgeted',
  spent: 'Spent',
  overspendingAdjustment: 'Overspending Adjustment',
  balance: 'Balance',
};

export function buildBudgetAnalysisCsv(
  rows: IntervalRow[],
  labels: BudgetAnalysisCsvLabels = DEFAULT_LABELS,
): string {
  return buildCsv(
    [
      labels.month,
      labels.budgeted,
      labels.spent,
      labels.overspendingAdjustment,
      labels.balance,
    ],
    rows.map(row => [
      row.date,
      amountToString(row.budgeted),
      amountToString(row.spent),
      amountToString(row.overspendingAdjustment),
      amountToString(row.balance),
    ]),
  );
}
