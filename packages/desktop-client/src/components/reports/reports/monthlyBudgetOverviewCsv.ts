import * as monthUtils from '@actual-app/core/shared/months';
import { integerToAmount } from '@actual-app/core/shared/util';
import type { AutomationOverview } from '@actual-app/core/types/models';
import type { Locale } from 'date-fns';
import i18n from 'i18next';

import { getFundingStatusAmount } from './monthlyBudgetOverviewFundingStatus';

type CsvRow = Record<string, string>;

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

function escapeCsv(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function formatCsvCell(value: string): string {
  const isNumeric = /^-?\d+(?:\.\d+)?$/.test(value);
  if (!isNumeric && FORMULA_TRIGGERS.test(value)) {
    return escapeCsv(`'${value}`);
  }

  return escapeCsv(value);
}

function formatAmount(amount: number): string {
  return integerToAmount(amount).toFixed(2);
}

function formatFundingStatus(amount: number): string {
  return (amount / 100).toFixed(2);
}

type ExportMonthlyBudgetOverviewCsvOptions = {
  locale: Locale;
};

export function exportMonthlyBudgetOverviewCsv(
  data: AutomationOverview,
  { locale }: ExportMonthlyBudgetOverviewCsvOptions,
): string {
  const monthLabel = monthUtils.format(data.startMonth, 'MMMM yyyy', locale);
  const columns = {
    month: i18n.t('Month'),
    categoryGroup: i18n.t('Category group'),
    category: i18n.t('Category'),
    carriedOver: i18n.t('Carried over'),
    projected: i18n.t('Projected'),
    budgeted: i18n.t('Budgeted'),
    fundingStatus: i18n.t('Funding status'),
  };

  const rows: CsvRow[] = [];

  for (const group of data.groups) {
    rows.push({
      [columns.month]: monthLabel,
      [columns.categoryGroup]: group.groupName,
      [columns.category]: '',
      [columns.carriedOver]: formatAmount(group.subtotal.carriedOver),
      [columns.projected]: formatAmount(group.subtotal.needed),
      [columns.budgeted]: formatAmount(group.subtotal.budgeted),
      [columns.fundingStatus]: formatFundingStatus(
        getFundingStatusAmount(group.subtotal),
      ),
    });

    for (const category of group.categories) {
      rows.push({
        [columns.month]: monthLabel,
        [columns.categoryGroup]: group.groupName,
        [columns.category]: category.categoryName,
        [columns.carriedOver]: formatAmount(category.carriedOver),
        [columns.projected]: formatAmount(category.needed),
        [columns.budgeted]: formatAmount(category.budgeted),
        [columns.fundingStatus]: formatFundingStatus(
          getFundingStatusAmount(category),
        ),
      });
    }
  }

  rows.push({
    [columns.month]: '',
    [columns.categoryGroup]: '',
    [columns.category]: '',
    [columns.carriedOver]: '',
    [columns.projected]: '',
    [columns.budgeted]: '',
    [columns.fundingStatus]: '',
  });

  const { totals } = data;
  const summaryRows: Array<[string, string]> = [
    [i18n.t('Total projected'), formatAmount(totals.needed)],
    [
      i18n.t('Goals underfunded'),
      totals.remaining > 0
        ? formatFundingStatus(-totals.remaining)
        : formatFundingStatus(0),
    ],
    [i18n.t('Goals overfunded'), formatAmount(totals.overfunded)],
    [i18n.t('Total carried over'), formatAmount(totals.carriedOver)],
    [i18n.t('Total budgeted toward goals'), formatAmount(totals.budgeted)],
  ];

  for (const [label, value] of summaryRows) {
    rows.push({
      [columns.month]: monthLabel,
      [columns.categoryGroup]: label,
      [columns.category]: '',
      [columns.carriedOver]: '',
      [columns.projected]: value,
      [columns.budgeted]: '',
      [columns.fundingStatus]: '',
    });
  }

  const headers = Object.values(columns);
  const lines = [
    headers.map(formatCsvCell).join(','),
    ...rows.map(row =>
      headers.map(header => formatCsvCell(row[header] ?? '')).join(','),
    ),
  ];

  return lines.join('\n');
}

export function getMonthlyBudgetOverviewCsvFilename(month: string) {
  return `monthly-budget-overview-${month}.csv`;
}
