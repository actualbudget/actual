import { integerToAmount } from '@actual-app/core/shared/util';
// Use the browser ESM build: the default `csv-stringify/sync` entry pulls in
// the Node build (which imports `stream`), breaking the lazy-loaded reports
// chunk in the browser bundle. The browser ESM build is self-contained.
import { stringify as csvStringify } from 'csv-stringify/browser/esm/sync';
import { t } from 'i18next';

import type { BudgetAnalysisIntervalData } from './budget-analysis-spreadsheet';

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

/**
 * Unknown amounts stay empty. Categories with currency pockets add an FX
 * contribution column and notes naming why an amount is unknown.
 */
export function buildBudgetAnalysisCsv(
  rows: BudgetAnalysisIntervalData[],
  precision: number,
): string {
  const month = t('Month');
  const budgeted = t('Budgeted');
  const spent = t('Spent');
  const overspendingAdjustment = t('Overspending Adjustment');
  const fxContribution = t('FX contribution');
  const balance = t('Balance');
  const notes = t('Notes');
  const hasPockets = rows.some(row => row.fxContribution !== undefined);
  const amount = (value: number | null | undefined) =>
    value === null || value === undefined
      ? ''
      : integerToAmount(value, precision);

  const columns = hasPockets
    ? [
        month,
        budgeted,
        spent,
        overspendingAdjustment,
        fxContribution,
        balance,
        notes,
      ]
    : [month, budgeted, spent, overspendingAdjustment, balance];

  return csvStringify(
    rows.map(row => [
      row.date,
      amount(row.budgeted),
      amount(row.spent),
      amount(row.overspendingAdjustment),
      ...(hasPockets ? [amount(row.fxContribution)] : []),
      amount(row.balance),
      ...(hasPockets ? [(row.incomplete ?? []).join('; ')] : []),
    ]),
    {
      header: true,
      columns,
      cast: {
        string: (value: string) =>
          FORMULA_TRIGGERS.test(value) ? "'" + value : value,
      },
    },
  );
}
