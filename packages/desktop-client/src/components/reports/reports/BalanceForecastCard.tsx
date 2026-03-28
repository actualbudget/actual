// oxlint-disable typescript-paths/absolute-parent-import
import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  AccountEntity,
  BalanceForecastWidget,
} from '@actual-app/core/types/models';
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { Container } from '#components/reports/Container';
import { DateRange } from '#components/reports/DateRange';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { calculateTimeRange } from '#components/reports/reportRanges';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useBalanceForecast } from '#hooks/useBalanceForecast';
import { useFormat } from '#hooks/useFormat';

import {
  buildBalanceForecastChartData,
  countForecastScheduledOccurrences,
} from './balanceForecastChartData';

type BalanceForecastCardProps = {
  widgetId: string;
  isEditing?: boolean;
  accounts: AccountEntity[];
  meta?: BalanceForecastWidget['meta'];
  onMetaChange: (newMeta: BalanceForecastWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function BalanceForecastCard({
  widgetId,
  isEditing,
  accounts,
  meta,
  onMetaChange,
  onRemove,
  onCopy,
}: BalanceForecastCardProps) {
  const { t } = useTranslation();
  const format = useFormat();

  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);

  const defaultTimeFrame = {
    start: monthUtils.currentMonth(),
    end: monthUtils.addMonths(monthUtils.currentMonth(), 11),
    mode: 'static' as const,
  };

  const [start, end] = calculateTimeRange(meta?.timeFrame, defaultTimeFrame);

  const selectedAccountIds = useMemo(
    () => meta?.accounts ?? accounts.map(a => a.id),
    [accounts, meta?.accounts],
  );

  const startDate = start + '-01';
  const endDate = monthUtils.lastDayOfMonth(end);

  const {
    data: forecastData,
    error,
    isPending: isLoading,
  } = useBalanceForecast({
    accountIds: selectedAccountIds,
    conditions: meta?.conditions,
    conditionsOp: meta?.conditionsOp,
    startDate,
    endDate,
  });
  const errorMessage =
    error instanceof Error
      ? error.message
      : error
        ? t('Failed to load forecast')
        : null;
  const normalizedForecastData = forecastData ?? null;

  const onCardHover = () => setIsCardHovered(true);
  const onCardHoverEnd = () => setIsCardHovered(false);

  const lowestPoint = forecastData?.lowestBalance;
  const hasNegative = lowestPoint && lowestPoint.balance < 0;

  const chartData = buildBalanceForecastChartData({
    forecastData: normalizedForecastData,
    start,
    end,
    granularity: 'Monthly',
  });
  const todayReferenceDate = monthUtils.currentMonth();
  const showsTodayReferenceLine = chartData.some(
    dataPoint => dataPoint.date === todayReferenceDate,
  );

  const scheduledOccurrenceCount = countForecastScheduledOccurrences(
    normalizedForecastData,
  );
  const hasFilters = (meta?.conditions?.length ?? 0) > 0;

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/forecast/${widgetId}`}
      menuItems={[
        {
          name: 'rename',
          text: t('Rename'),
        },
        {
          name: 'remove',
          text: t('Remove'),
        },
        ...copyMenuItems,
      ]}
      onMenuSelect={item => {
        if (handleCopyMenuSelect(item)) return;
        switch (item) {
          case 'rename':
            setNameMenuOpen(true);
            break;
          case 'remove':
            onRemove();
            break;
          default:
            throw new Error(`Unrecognized selection: ${item}`);
        }
      }}
    >
      <View
        style={{ flex: 1 }}
        onPointerEnter={onCardHover}
        onPointerLeave={onCardHoverEnd}
      >
        <View style={{ flexDirection: 'row', padding: 20 }}>
          <View style={{ flex: 1 }}>
            <ReportCardName
              name={meta?.name || t('Balance Forecast')}
              isEditing={nameMenuOpen}
              onChange={newName => {
                onMetaChange({
                  ...meta,
                  name: newName,
                });
                setNameMenuOpen(false);
              }}
              onClose={() => setNameMenuOpen(false)}
            />
            <DateRange start={start} end={end} />
          </View>
          {lowestPoint && (
            <View style={{ textAlign: 'right' }}>
              <Block
                style={{
                  ...styles.mediumText,
                  fontWeight: 500,
                  marginBottom: 5,
                  color: hasNegative ? theme.errorText : theme.pageText,
                }}
              >
                <PrivacyFilter activationFilters={[!isCardHovered]}>
                  <Trans>Lowest</Trans>:{' '}
                  {format(lowestPoint.balance, 'financial')}
                </PrivacyFilter>
              </Block>
              <PrivacyFilter activationFilters={[!isCardHovered]}>
                <Block style={{ fontSize: 12, color: theme.pageTextLight }}>
                  {lowestPoint.date}
                </Block>
              </PrivacyFilter>
            </View>
          )}
        </View>

        {isLoading ? (
          <LoadingIndicator />
        ) : errorMessage ? (
          <View style={{ height: 120, padding: 20 }}>
            <Block
              style={{
                fontSize: 13,
                color: theme.errorText,
                textAlign: 'center',
              }}
            >
              {errorMessage}
            </Block>
          </View>
        ) : forecastData && forecastData.dataPoints.length > 0 ? (
          <>
            <Container style={{ height: 'auto', flex: 1 }}>
              {(width, height) => (
                <ResponsiveContainer>
                  <LineChart
                    width={width}
                    height={height}
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <Tooltip
                      isAnimationActive={false}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div
                              style={{
                                zIndex: 1000,
                                pointerEvents: 'none',
                                borderRadius: 2,
                                boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
                                backgroundColor: theme.menuBackground,
                                color: theme.menuItemText,
                                padding: 10,
                              }}
                            >
                              <div style={{ marginBottom: 5 }}>
                                <strong>{payload[0].payload.date}</strong>
                              </div>
                              <div>
                                {format(
                                  payload[0].value as number,
                                  'financial',
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {showsTodayReferenceLine && (
                      <ReferenceLine
                        x={todayReferenceDate}
                        stroke={theme.noticeText}
                        strokeDasharray="4 4"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke={hasNegative ? theme.errorText : theme.noticeText}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Container>
            <Block
              style={{
                padding: '0 20px 16px',
                fontSize: 12,
                color: theme.pageTextLight,
              }}
            >
              {scheduledOccurrenceCount === 0 ? (
                hasFilters ? (
                  <Trans>
                    Filtered running total only; no scheduled occurrences in
                    this range
                  </Trans>
                ) : (
                  <Trans>No scheduled transactions in this range</Trans>
                )
              ) : (
                <>
                  <Trans count={scheduledOccurrenceCount}>
                    {{ count: scheduledOccurrenceCount }} scheduled transactions
                    included
                  </Trans>
                  {hasFilters ? (
                    <>
                      {' '}
                      <Trans>(filtered running total)</Trans>
                    </>
                  ) : null}
                </>
              )}
            </Block>
          </>
        ) : (
          <View style={{ height: 120, padding: 20 }}>
            <Block
              style={{
                fontSize: 13,
                color: theme.pageTextLight,
                textAlign: 'center',
              }}
            >
              <Trans>
                No transactions are included in this report. Adjust your
                filters, accounts, or date range to see a balance projection.
              </Trans>
            </Block>
          </View>
        )}
      </View>
    </ReportCard>
  );
}
