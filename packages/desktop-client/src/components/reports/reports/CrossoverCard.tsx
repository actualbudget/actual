import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as d from 'date-fns';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import {
  type AccountEntity,
  type CrossoverWidget,
} from 'loot-core/types/models';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { CrossoverGraph } from '@desktop-client/components/reports/graphs/CrossoverGraph';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import { ReportCardName } from '@desktop-client/components/reports/ReportCardName';
import { createCrossoverSpreadsheet } from '@desktop-client/components/reports/spreadsheets/crossover-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { fromDateRepr } from '@desktop-client/components/reports/util';
import { useFormat } from '@desktop-client/hooks/useFormat';

// Type for the return value of the recalculate function
type CrossoverData = {
  graphData: {
    data: Array<{
      x: string;
      investmentIncome: number;
      expenses: number;
      isProjection?: boolean;
    }>;
    start: string;
    end: string;
    crossoverXLabel: string | null;
  };
  lastKnownBalance: number;
  lastKnownMonthlyIncome: number;
  lastKnownMonthlyExpenses: number;
  historicalReturn: number | null;
  yearsToRetire: number | null;
  targetMonthlyIncome: number | null;
};

type CrossoverCardProps = {
  widgetId: string;
  isEditing?: boolean;
  accounts: AccountEntity[];
  meta?: CrossoverWidget['meta'];
  onMetaChange: (newMeta: CrossoverWidget['meta']) => void;
  onRemove: () => void;
};

export function CrossoverCard({
  widgetId,
  isEditing,
  accounts,
  meta = {},
  onMetaChange,
  onRemove,
}: CrossoverCardProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  // Calculate date range from meta or use default range
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  const format = useFormat();

  useEffect(() => {
    let isMounted = true;
    async function calculateDateRange() {
      if (meta?.timeFrame?.start && meta?.timeFrame?.end) {
        setStart(meta.timeFrame.start);
        setEnd(meta.timeFrame.end);
        return;
      }

      const trans = await send('get-earliest-transaction');
      if (!isMounted) return;

      const currentMonth = monthUtils.currentMonth();
      const startMonth = trans
        ? monthUtils.monthFromDate(d.parseISO(fromDateRepr(trans.date)))
        : currentMonth;

      const previousMonth = monthUtils.subMonths(currentMonth, 1);
      const endMonth = monthUtils.isBefore(startMonth, previousMonth)
        ? previousMonth
        : startMonth;

      // Use saved timeFrame from meta or default range
      setStart(startMonth);
      setEnd(endMonth);
    }
    calculateDateRange();
    return () => {
      isMounted = false;
    };
  }, [meta?.timeFrame]);

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
  const projectionType = meta?.projectionType ?? 'hampel';

  const params = useMemo(
    () =>
      createCrossoverSpreadsheet({
        start,
        end,
        expenseCategoryIds,
        incomeAccountIds,
        safeWithdrawalRate: swr,
        estimatedReturn: estimatedReturn == null ? null : estimatedReturn,
        projectionType,
      }),
    [
      start,
      end,
      expenseCategoryIds,
      incomeAccountIds,
      swr,
      estimatedReturn,
      projectionType,
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
      ]}
      onMenuSelect={item => {
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
            compact={true}
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
