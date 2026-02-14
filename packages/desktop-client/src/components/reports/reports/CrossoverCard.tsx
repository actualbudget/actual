import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import type { AccountEntity, CrossoverWidget } from 'loot-core/types/models';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { CrossoverGraph } from '@desktop-client/components/reports/graphs/CrossoverGraph';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import { ReportCardName } from '@desktop-client/components/reports/ReportCardName';
import { calculateTimeRange } from '@desktop-client/components/reports/reportRanges';
import { createCrossoverSpreadsheet } from '@desktop-client/components/reports/spreadsheets/crossover-spreadsheet';
import type { CrossoverData } from '@desktop-client/components/reports/spreadsheets/crossover-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { useWidgetCopyMenu } from '@desktop-client/components/reports/useWidgetCopyMenu';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';

type CrossoverCardProps = {
  widgetId: string;
  isEditing?: boolean;
  accounts: AccountEntity[];
  meta?: CrossoverWidget['meta'];
  onMetaChange: (newMeta: CrossoverWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function CrossoverCard({
  widgetId,
  isEditing,
  accounts,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: CrossoverCardProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useWidgetCopyMenu(onCopy);

  // Calculate date range from meta or use default range
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  const format = useFormat();

  useEffect(() => {
    let isMounted = true;
    async function calculateDateRange() {
      const currentMonth = monthUtils.currentMonth();
      const previousMonth = monthUtils.subMonths(currentMonth, 1);

      // Fetch earliest transaction to build the valid range
      const earliestTransactionData = await send('get-earliest-transaction');
      if (!isMounted) return;

      // Build allMonths list similar to Crossover.tsx
      const earliestDate = earliestTransactionData
        ? earliestTransactionData.date
        : monthUtils.firstDayOfMonth(previousMonth);
      const latestDate = monthUtils.lastDayOfMonth(previousMonth);

      const allMonths = monthUtils
        .rangeInclusive(earliestDate, latestDate)
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM yyyy', locale),
        }))
        .reverse();

      // Use calculateTimeRange to get initial values based on timeFrame mode
      const [initialStart, initialEnd, mode] = calculateTimeRange(
        meta?.timeFrame,
        undefined,
        previousMonth,
      );

      const earliestMonth = allMonths[allMonths.length - 1].name;
      const latestMonth = allMonths[0].name;
      let start = initialStart;
      let end = initialEnd;

      const clampMonth = (m: string) => {
        if (monthUtils.isBefore(m, earliestMonth)) return earliestMonth;
        if (monthUtils.isAfter(m, latestMonth)) return latestMonth;
        return m;
      };

      // Apply mode-specific logic similar to Crossover.tsx
      if (mode === 'sliding-window') {
        // Shift both start and end back one month for sliding-window
        start = clampMonth(monthUtils.subMonths(start, 1));
        end = clampMonth(monthUtils.subMonths(end, 1));
      } else if (mode === 'full') {
        start = earliestMonth;
        end = latestMonth;
      } else {
        // static mode
        start = clampMonth(start);
        end = clampMonth(end);
      }

      // Ensure end doesn't go before start
      if (monthUtils.isBefore(end, start)) {
        end = start;
      }

      if (isMounted) {
        setStart(start);
        setEnd(end);
      }
    }
    calculateDateRange();
    return () => {
      isMounted = false;
    };
  }, [meta?.timeFrame, locale]);

  const [isCardHovered, setIsCardHovered] = useState(false);
  const onCardHover = useCallback(() => setIsCardHovered(true), []);
  const onCardHoverEnd = useCallback(() => setIsCardHovered(false), []);

  // Memoize these to prevent unnecessary re-renders
  const expenseCategoryIds = useMemo(
    () => meta?.expenseCategoryIds ?? [],
    [meta?.expenseCategoryIds],
  );

  const incomeAccountIds = useMemo(
    () => meta?.incomeAccountIds ?? accounts.map(a => a.id),
    [meta?.incomeAccountIds, accounts],
  );

  const swr = meta?.safeWithdrawalRate ?? 0.04;
  const estimatedReturn = meta?.estimatedReturn ?? null;
  const expectedContribution = meta?.expectedContribution ?? null;
  const projectionType: 'hampel' | 'median' | 'mean' =
    meta?.projectionType ?? 'hampel';
  const expenseAdjustmentFactor = meta?.expenseAdjustmentFactor ?? 1.0;

  const params = useMemo(
    () =>
      createCrossoverSpreadsheet({
        start,
        end,
        expenseCategoryIds,
        incomeAccountIds,
        safeWithdrawalRate: swr,
        estimatedReturn,
        expectedContribution,
        projectionType,
        expenseAdjustmentFactor,
      }),
    [
      start,
      end,
      expenseCategoryIds,
      incomeAccountIds,
      swr,
      estimatedReturn,
      expectedContribution,
      projectionType,
      expenseAdjustmentFactor,
    ],
  );

  const data = useReport<CrossoverData>('crossover', params);

  // Get years to retire from spreadsheet data
  const yearsToRetire = data?.yearsToRetire ?? null;

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/crossover/${widgetId}`}
      menuItems={[
        { name: 'rename', text: t('Rename') },
        { name: 'remove', text: t('Remove') },
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
              name={meta?.name || t('Crossover Point')}
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
            {/* Date range is now fixed and not configurable */}
          </View>
          {data && (
            <View style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <Block
                style={{
                  ...styles.mediumText,
                  fontWeight: 500,
                  marginBottom: 5,
                }}
              >
                <PrivacyFilter activationFilters={[!isCardHovered]}>
                  {yearsToRetire != null
                    ? t('{{years}} years', {
                        years: format(yearsToRetire, 'number'),
                      })
                    : t('N/A')}
                </PrivacyFilter>
              </Block>
              <Block
                style={{
                  fontSize: 12,
                  color: theme.pageTextSubdued,
                }}
              >
                <Trans>Years to Retire</Trans>
              </Block>
            </View>
          )}
        </View>

        {data ? (
          <CrossoverGraph
            graphData={data.graphData}
            compact
            showTooltip={!isEditing && !isNarrowWidth}
            style={{ height: 'auto', flex: 1 }}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
