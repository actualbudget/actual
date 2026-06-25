import { integerToAmount } from '@actual-app/core/shared/util';
// Use the browser ESM build: the default `csv-stringify/sync` entry pulls in
// the Node build (which imports `stream`), breaking the lazy-loaded reports
// chunk in the browser bundle. The browser ESM build is self-contained.
import { stringify as csvStringify } from 'csv-stringify/browser/esm/sync';
import { t } from 'i18next';

type IntervalRow = {
  date: string;
  budgeted: number;
  spent: number;
  balance: number;
  overspendingAdjustment: number;
};

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

export function buildBudgetAnalysisCsv(rows: IntervalRow[]): string {
  const month = t('Month');
  const budgeted = t('Budgeted');
  const spent = t('Spent');
  const overspendingAdjustment = t('Overspending Adjustment');
  const balance = t('Balance');

  const columns = [month, budgeted, spent, overspendingAdjustment, balance];

  return csvStringify(
    rows.map(row => [
      row.date,
      integerToAmount(row.budgeted),
      integerToAmount(row.spent),
      integerToAmount(row.overspendingAdjustment),
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
