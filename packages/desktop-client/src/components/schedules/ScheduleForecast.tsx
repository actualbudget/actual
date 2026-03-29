import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';

import { buildForecast } from './scheduleForecastUtils';
import type {
  ForecastMonth,
  ForecastOccurrence,
} from './scheduleForecastUtils';

import { FinancialText } from '@desktop-client/components/FinancialText';
import { Page } from '@desktop-client/components/Page';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { useFormat } from '@desktop-client/hooks/useFormat';
import type { FormatType } from '@desktop-client/hooks/useFormat';
import { usePayeesById } from '@desktop-client/hooks/usePayees';
import { useSchedules } from '@desktop-client/hooks/useSchedules';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import {
  offBudgetAccountBalance,
  onBudgetAccountBalance,
} from '@desktop-client/spreadsheet/bindings';

const MONTH_OPTIONS = [3, 6, 12] as const;
type MonthOption = (typeof MONTH_OPTIONS)[number];

const schedulesQuery = q('schedules').select('*');

type ForecastTooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    value?: number;
    color?: string;
    name?: string;
  }>;
  label?: string;
  formatFn: (v: number, type?: FormatType) => string;
};

function ForecastTooltip({
  active,
  payload,
  label,
  formatFn,
}: ForecastTooltipProps) {
  const { t } = useTranslation();
  if (!active || !payload || payload.length === 0) return null;

  const nameMap: Record<string, string> = {
    income: t('Income'),
    expenses: t('Expenses'),
    balance: t('Running Balance'),
  };

  return (
    <View
      style={{
        backgroundColor: theme.menuBackground,
        border: `1px solid ${theme.menuBorder}`,
        borderRadius: 4,
        padding: '8px 12px',
        color: theme.menuItemText,
        fontSize: 13,
        gap: 4,
      }}
    >
      <span style={{ fontWeight: 600, marginBottom: 4 }}>{label}</span>
      {payload.map(entry => (
        <View
          key={entry.dataKey}
          style={{
            flexDirection: 'row',
            gap: 8,
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: entry.color }}>
            {nameMap[String(entry.dataKey)] ?? entry.name}
          </span>
          <FinancialText>
            {formatFn(Math.round((entry.value ?? 0) * 100), 'financial')}
          </FinancialText>
        </View>
      ))}
    </View>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const format = useFormat();
  return (
    <View
      style={{
        flex: 1,
        padding: '12px 16px',
        backgroundColor: theme.tableBackground,
        borderRadius: 6,
        border: `1px solid ${theme.tableBorder}`,
        gap: 4,
      }}
    >
      <span style={{ fontSize: 12, color: theme.tableTextLight }}>{label}</span>
      <PrivacyFilter>
        <FinancialText
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: color ?? theme.tableText,
          }}
        >
          {format(value, 'financial')}
        </FinancialText>
      </PrivacyFilter>
    </View>
  );
}

function MonthRow({
  data,
  payeesById,
}: {
  data: ForecastMonth;
  payeesById: Record<string, { name: string }>;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const [expanded, setExpanded] = useState(false);
  const label = monthUtils.format(
    monthUtils.firstDayOfMonth(data.month),
    'MMM yyyy',
  );

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: `1px solid ${theme.tableBorder}`,
          cursor: 'pointer',
          backgroundColor: theme.tableBackground,
          gap: 8,
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <span
          style={{
            width: 16,
            color: theme.tableTextLight,
            fontSize: 12,
          }}
        >
          {expanded ? '▼' : '▶'}
        </span>
        <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
        <PrivacyFilter>
          <FinancialText
            style={{
              width: 110,
              textAlign: 'right',
              color: theme.reportsNumberPositive,
            }}
          >
            {format(data.projectedIncome, 'financial')}
          </FinancialText>
        </PrivacyFilter>
        <PrivacyFilter>
          <FinancialText
            style={{
              width: 110,
              textAlign: 'right',
              color: theme.reportsNumberNegative,
            }}
          >
            {format(-data.projectedExpenses, 'financial')}
          </FinancialText>
        </PrivacyFilter>
        <PrivacyFilter>
          <FinancialText
            style={{
              width: 110,
              textAlign: 'right',
              color:
                data.netDelta >= 0
                  ? theme.reportsNumberPositive
                  : theme.reportsNumberNegative,
            }}
          >
            {format(data.netDelta, 'financial')}
          </FinancialText>
        </PrivacyFilter>
        <PrivacyFilter>
          <FinancialText style={{ width: 120, textAlign: 'right' }}>
            {format(data.runningBalance, 'financial')}
          </FinancialText>
        </PrivacyFilter>
      </View>

      {expanded &&
        data.scheduleOccurrences.map((occ: ForecastOccurrence, idx: number) => {
          const payee = payeesById[occ.payeeName];
          const displayName =
            payee?.name ?? occ.payeeName ?? t('Unknown payee');
          return (
            <View
              key={`${occ.scheduleId}-${idx}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: '6px 12px 6px 36px',
                borderBottom: `1px solid ${theme.tableBorder}`,
                backgroundColor: theme.tableRowBackgroundHover,
                gap: 8,
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: theme.tableTextLight,
                }}
              >
                {displayName}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: theme.tableTextLight,
                  width: 95,
                  textAlign: 'right',
                }}
              >
                {occ.date}
              </span>
              <PrivacyFilter>
                <FinancialText
                  style={{
                    width: 110,
                    textAlign: 'right',
                    fontSize: 13,
                    color:
                      occ.amount >= 0
                        ? theme.reportsNumberPositive
                        : theme.reportsNumberNegative,
                  }}
                >
                  {format(occ.amount, 'financial')}
                </FinancialText>
              </PrivacyFilter>
              <span style={{ width: 110 }} />
              <span style={{ width: 120 }} />
            </View>
          );
        })}
    </>
  );
}

export function ScheduleForecast() {
  const { t } = useTranslation();
  const format = useFormat();
  const [monthCount, setMonthCount] = useState<MonthOption>(6);

  const { data: payeesById = {} } = usePayeesById();
  const { isLoading, schedules = [] } = useSchedules({ query: schedulesQuery });

  const onBudgetBalance =
    useSheetValue<'account', 'onbudget-accounts-balance'>(
      onBudgetAccountBalance(),
    ) ?? 0;
  const offBudgetBalance =
    useSheetValue<'account', 'offbudget-accounts-balance'>(
      offBudgetAccountBalance(),
    ) ?? 0;
  const startingBalance = onBudgetBalance + offBudgetBalance;

  const forecastData: ForecastMonth[] = isLoading
    ? []
    : buildForecast(schedules, monthCount, startingBalance);

  const totalIncome = forecastData.reduce((s, m) => s + m.projectedIncome, 0);
  const totalExpenses = forecastData.reduce(
    (s, m) => s + m.projectedExpenses,
    0,
  );
  const netOverPeriod = totalIncome - totalExpenses;
  const endBalance =
    forecastData.length > 0
      ? forecastData[forecastData.length - 1].runningBalance
      : startingBalance;

  const chartData = forecastData.map(m => ({
    name: monthUtils.format(monthUtils.firstDayOfMonth(m.month), 'MMM yy'),
    income: m.projectedIncome / 100,
    expenses: m.projectedExpenses / 100,
    balance: m.runningBalance / 100,
  }));

  return (
    <Page header={t('Forecast')}>
      {isLoading ? (
        <LoadingIndicator message={t('Loading forecast...')} />
      ) : (
        <View style={{ gap: 20 }}>
          {/* Month selector */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <Select<MonthOption>
              value={monthCount}
              onChange={v => setMonthCount(v)}
              options={MONTH_OPTIONS.map(n => [n, t('{{n}} months', { n })])}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <SummaryCard label={t('Current Balance')} value={startingBalance} />
            <SummaryCard
              label={t('Projected Income')}
              value={totalIncome}
              color={theme.reportsNumberPositive}
            />
            <SummaryCard
              label={t('Projected Expenses')}
              value={-totalExpenses}
              color={theme.reportsNumberNegative}
            />
            <SummaryCard
              label={t('Net over period')}
              value={netOverPeriod}
              color={
                netOverPeriod >= 0
                  ? theme.reportsNumberPositive
                  : theme.reportsNumberNegative
              }
            />
            <SummaryCard label={t('Ending Balance')} value={endBalance} />
          </View>

          {/* Chart */}
          <View
            style={{
              backgroundColor: theme.tableBackground,
              border: `1px solid ${theme.tableBorder}`,
              borderRadius: 6,
              padding: 16,
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 24, bottom: 8, left: 24 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme.tableBorder}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: theme.tableTextLight }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: theme.tableTextLight }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => format(Math.round(v * 100), 'financial')}
                  width={80}
                />
                <Tooltip content={<ForecastTooltip formatFn={format} />} />
                <Legend
                  formatter={value =>
                    value === 'income'
                      ? t('Projected Income')
                      : value === 'expenses'
                        ? t('Projected Expenses')
                        : t('Running Balance')
                  }
                />
                <Bar
                  dataKey="income"
                  fill={theme.reportsNumberPositive}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="expenses"
                  fill={theme.reportsNumberNegative}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={40}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={theme.reportsBlue}
                  strokeWidth={2}
                  dot={{ r: 3, fill: theme.reportsBlue }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </View>

          {/* Monthly breakdown table */}
          <View
            style={{
              border: `1px solid ${theme.tableBorder}`,
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            {/* Table header */}
            <View
              style={{
                flexDirection: 'row',
                padding: '8px 12px',
                backgroundColor: theme.tableHeaderBackground,
                borderBottom: `1px solid ${theme.tableBorder}`,
                gap: 8,
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: 600,
                  color: theme.tableHeaderText,
                }}
              >
                <Trans>Month</Trans>
              </span>
              <span
                style={{
                  width: 110,
                  textAlign: 'right',
                  fontSize: 12,
                  fontWeight: 600,
                  color: theme.tableHeaderText,
                }}
              >
                <Trans>Income</Trans>
              </span>
              <span
                style={{
                  width: 110,
                  textAlign: 'right',
                  fontSize: 12,
                  fontWeight: 600,
                  color: theme.tableHeaderText,
                }}
              >
                <Trans>Expenses</Trans>
              </span>
              <span
                style={{
                  width: 110,
                  textAlign: 'right',
                  fontSize: 12,
                  fontWeight: 600,
                  color: theme.tableHeaderText,
                }}
              >
                <Trans>Net</Trans>
              </span>
              <span
                style={{
                  width: 120,
                  textAlign: 'right',
                  fontSize: 12,
                  fontWeight: 600,
                  color: theme.tableHeaderText,
                }}
              >
                <Trans>Running Balance</Trans>
              </span>
            </View>

            {forecastData.map(monthData => (
              <MonthRow
                key={monthData.month}
                data={monthData}
                payeesById={payeesById}
              />
            ))}

            {forecastData.length === 0 && (
              <View
                style={{
                  padding: 32,
                  alignItems: 'center',
                  color: theme.tableTextLight,
                }}
              >
                <Trans>No active schedules found.</Trans>
              </View>
            )}
          </View>
        </View>
      )}
    </Page>
  );
}
