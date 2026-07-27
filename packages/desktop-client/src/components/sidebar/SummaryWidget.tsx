import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgArrowThinDown,
  SvgArrowThinUp,
  SvgSwap,
} from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { createSpreadsheet as netWorthSpreadsheet } from '#components/reports/spreadsheets/net-worth-spreadsheet';
import { useReport } from '#components/reports/useReport';
import { CellValue } from '#components/spreadsheet/CellValue';
import { useAccounts } from '#hooks/useAccounts';
import { useFormat } from '#hooks/useFormat';
import { useLanguage, useLocale } from '#hooks/useLocale';
import { useLocalPref } from '#hooks/useLocalPref';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useSyncedPref } from '#hooks/useSyncedPref';
import * as bindings from '#spreadsheet/bindings';
import { envelopeBudget } from '#spreadsheet/bindings';

import type { WidthMode } from './widthMode';

export type WidgetMetric = 'netWorth' | 'toBudget' | 'onBudgetTotal';

export const ALL_WIDGET_METRICS: WidgetMetric[] = [
  'netWorth',
  'toBudget',
  'onBudgetTotal',
];

export function widgetMetricLabel(
  t: (key: string) => string,
  metric: WidgetMetric,
) {
  switch (metric) {
    case 'netWorth':
      return t('Net worth');
    case 'toBudget':
      return t('To budget');
    case 'onBudgetTotal':
      return t('On budget');
    default:
      return metric;
  }
}

function useAvailableWidgetMetrics(): WidgetMetric[] {
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  return useMemo(
    () =>
      ALL_WIDGET_METRICS.filter(
        metric => metric !== 'toBudget' || budgetType === 'envelope',
      ),
    [budgetType],
  );
}

export function useEnabledWidgetMetrics(): WidgetMetric[] {
  const available = useAvailableWidgetMetrics();
  const [widgetMetricsPref] = useLocalPref('sidebar.widgetMetrics');
  const enabled = widgetMetricsPref
    ? available.filter(metric => widgetMetricsPref.includes(metric))
    : available;
  return enabled.length > 0 ? enabled : available;
}

function abbreviate(language: string, cents: number) {
  return new Intl.NumberFormat(language, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

// Explicit rather than inherited from the wrapping bare Button, so the
// widget's contrast against its own (theme-independent) background can't
// be accidentally weakened by an unrelated ancestor style change.
const valueStyle = (size: WidthMode) =>
  size === 'full'
    ? {
        fontSize: 30,
        fontWeight: 500 as const,
        letterSpacing: -0.5,
        color: theme.pageText,
      }
    : size === 'compact'
      ? { fontSize: 22, fontWeight: 500 as const, color: theme.pageText }
      : { fontSize: 12, color: theme.pageText };

function NetWorthValue({ size }: { size: WidthMode }) {
  const format = useFormat();
  const locale = useLocale();
  const language = useLanguage();
  const { data: accounts = [] } = useAccounts();
  const [firstDayOfWeekIdx = '0'] = useSyncedPref('firstDayOfWeekIdx');

  const month = monthUtils.currentMonth();
  const params = useMemo(
    () =>
      netWorthSpreadsheet(
        month,
        month,
        accounts,
        [],
        'and',
        locale,
        'Monthly',
        firstDayOfWeekIdx,
        format,
      ),
    [accounts, month, locale, firstDayOfWeekIdx, format],
  );
  const data = useReport('net_worth', params);

  if (!data) {
    return null;
  }

  if (size === 'rail') {
    return (
      <PrivacyFilter activationFilters={[true]}>
        <FinancialText style={valueStyle(size)}>
          {abbreviate(language, data.netWorth)}
        </FinancialText>
      </PrivacyFilter>
    );
  }

  const startValue = data.netWorth - data.totalChange;
  const percentChange =
    startValue !== 0 ? (data.totalChange / Math.abs(startValue)) * 100 : null;

  return (
    <>
      <PrivacyFilter activationFilters={[true]}>
        <FinancialText style={valueStyle(size)}>
          {format(data.netWorth, 'financial')}
        </FinancialText>
      </PrivacyFilter>
      {size === 'full' && percentChange != null && (
        <TrendLine percentChange={percentChange} />
      )}
    </>
  );
}

function TrendLine({ percentChange }: { percentChange: number }) {
  const { t } = useTranslation();
  const color =
    percentChange === 0
      ? theme.reportsNumberNeutral
      : percentChange < 0
        ? theme.reportsNumberNegative
        : theme.reportsNumberPositive;
  const Arrow = percentChange < 0 ? SvgArrowThinDown : SvgArrowThinUp;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 7,
        fontSize: 11,
        color,
      }}
    >
      <Arrow width={10} height={10} />
      <span>
        {percentChange >= 0 ? '+' : ''}
        {percentChange.toFixed(1)}% {t('this month')}
      </span>
    </View>
  );
}

function ToBudgetValue({ size }: { size: WidthMode }) {
  const format = useFormat();
  const language = useLanguage();
  const sheetName = monthUtils.sheetForMonth(monthUtils.currentMonth());

  return (
    <SheetNameProvider name={sheetName}>
      <CellValue<'envelope-budget', 'to-budget'>
        binding={envelopeBudget.toBudget}
        type="financial"
      >
        {({ value }) => (
          <PrivacyFilter activationFilters={[true]}>
            <FinancialText style={valueStyle(size)}>
              {size === 'rail'
                ? abbreviate(language, Number(value) || 0)
                : format(value, 'financial')}
            </FinancialText>
          </PrivacyFilter>
        )}
      </CellValue>
    </SheetNameProvider>
  );
}

function OnBudgetTotalValue({ size }: { size: WidthMode }) {
  const format = useFormat();
  const language = useLanguage();

  return (
    <CellValue<'account', 'onbudget-accounts-balance'>
      binding={bindings.onBudgetAccountBalance()}
      type="financial"
    >
      {({ value }) => (
        <PrivacyFilter activationFilters={[true]}>
          <FinancialText style={valueStyle(size)}>
            {size === 'rail'
              ? abbreviate(language, Number(value) || 0)
              : format(value, 'financial')}
          </FinancialText>
        </PrivacyFilter>
      )}
    </CellValue>
  );
}

function MetricValue({
  metric,
  size,
}: {
  metric: WidgetMetric;
  size: WidthMode;
}) {
  switch (metric) {
    case 'netWorth':
      return <NetWorthValue size={size} />;
    case 'toBudget':
      return <ToBudgetValue size={size} />;
    case 'onBudgetTotal':
      return <OnBudgetTotalValue size={size} />;
    default:
      return null;
  }
}

type SummaryWidgetProps = {
  size: WidthMode;
};

export function SummaryWidget({ size }: SummaryWidgetProps) {
  const { t } = useTranslation();
  const metrics = useEnabledWidgetMetrics();
  const [metricIndexPref, setMetricIndexPref] = useLocalPref(
    'sidebar.widgetMetricIndex',
  );
  const rawIndex = metricIndexPref ?? 0;
  const index = ((rawIndex % metrics.length) + metrics.length) % metrics.length;
  const metric = metrics[index];

  const onCycle = () => {
    setMetricIndexPref((index + 1) % metrics.length);
  };

  const label = widgetMetricLabel(t, metric);
  const cycleHint = t('click to cycle metric');

  if (size === 'rail') {
    return (
      <Button
        variant="bare"
        aria-label={`${label}: ${cycleHint}`}
        onPress={onCycle}
        style={{
          width: 44,
          padding: '5px 0',
          borderRadius: 6,
          backgroundColor: theme.sidebarItemBackgroundHover,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <span
          style={{
            fontSize: 8,
            letterSpacing: 0.5,
            // `pageTextSubdued` is tuned for contrast against the main
            // content background, not this tile's `sidebarItemBackgroundHover`
            // fill — in dark/midnight that combination falls well under
            // WCAG AA (~2:1). `sidebarItemText` keeps it legible; the small
            // uppercase/letter-spaced treatment already reads as secondary.
            color: theme.sidebarItemText,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <MetricValue metric={metric} size="rail" />
      </Button>
    );
  }

  return (
    <Button
      variant="bare"
      aria-label={`${label}: ${cycleHint}`}
      onPress={onCycle}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        textAlign: 'left',
        width: 'auto',
        padding: size === 'full' ? '10px 12px' : '8px 10px',
        margin: size === 'full' ? '8px 12px 4px' : '0 10px',
        borderRadius: 8,
        backgroundColor: theme.sidebarItemBackgroundHover,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: size === 'full' ? 9.5 : 9,
          letterSpacing: 1.4,
          // See the rail-size label above for why this isn't pageTextSubdued.
          color: theme.sidebarItemText,
          textTransform: 'uppercase',
        }}
      >
        <span>{label}</span>
        {metrics.length > 1 && <SvgSwap width={11} height={11} />}
      </View>
      <View style={{ marginTop: size === 'full' ? 5 : 3 }}>
        <MetricValue metric={metric} size={size} />
      </View>
      {metrics.length > 1 && (
        <View
          style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}
          aria-hidden
        >
          {metrics.map((m, i) => (
            <span
              key={m}
              style={{
                width: size === 'full' ? 14 : 12,
                height: 3,
                borderRadius: 2,
                backgroundColor:
                  i === index
                    ? theme.sidebarItemAccentSelected
                    : theme.sidebarItemBackgroundHover,
              }}
            />
          ))}
        </View>
      )}
    </Button>
  );
}
