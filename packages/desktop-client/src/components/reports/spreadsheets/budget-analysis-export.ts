import type { BudgetType } from '@actual-app/core/server/prefs';
import { integerToAmount } from '@actual-app/core/shared/util';
// Use the browser ESM build: the default `csv-stringify/sync` entry pulls in
// the Node build (which imports `stream`), breaking the lazy-loaded reports
// chunk in the browser bundle. The browser ESM build is self-contained.
import { stringify as csvStringify } from 'csv-stringify/browser/esm/sync';
import { t } from 'i18next';

import type { BudgetAnalysisIntervalData } from './budget-analysis-spreadsheet';

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

export function buildBudgetAnalysisCsv(
  rows: BudgetAnalysisIntervalData[],
  budgetType: BudgetType,
): string {
  const isTracking = budgetType === 'tracking';

  const columns = [
    t('Month'),
    t('Budgeted'),
    t('Spent'),
    ...(isTracking
      ? [t('Variance'), t('Cumulative Variance')]
      : [t('Overspending Adjustment')]),
    t('Balance'),
  ];

  return csvStringify(
    rows.map(row => [
      row.date,
      integerToAmount(row.budgeted),
      integerToAmount(row.spent),
      ...(isTracking
        ? [
            integerToAmount(row.variance),
            integerToAmount(row.cumulativeVariance),
          ]
        : [integerToAmount(row.overspendingAdjustment)]),
      integerToAmount(row.balance),
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
