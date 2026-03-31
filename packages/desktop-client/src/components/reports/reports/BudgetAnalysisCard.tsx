import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import type { BudgetAnalysisWidget } from 'loot-core/types/models';

import { FinancialText } from '@desktop-client/components/FinancialText';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { DateRange } from '@desktop-client/components/reports/DateRange';
import { BudgetAnalysisGraph } from '@desktop-client/components/reports/graphs/BudgetAnalysisGraph';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import { ReportCardName } from '@desktop-client/components/reports/ReportCardName';
import { calculateTimeRange } from '@desktop-client/components/reports/reportRanges';
import { createBudgetAnalysisSpreadsheet } from '@desktop-client/components/reports/spreadsheets/budget-analysis-spreadsheet';
import { useDashboardWidgetCopyMenu } from '@desktop-client/components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '@desktop-client/components/reports/useReport';
import { useFormat } from '@desktop-client/hooks/useFormat';

type BudgetAnalysisCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: BudgetAnalysisWidget['meta'];
  onMetaChange: (newMeta: BudgetAnalysisWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function BudgetAnalysisCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: BudgetAnalysisCardProps) {
  const { t } = useTranslation();
  const format = useFormat();

  const [isCardHovered, setIsCardHovered] = useState(false);
  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const timeFrame = meta?.timeFrame ?? {
    start: monthUtils.subMonths(monthUtils.currentMonth(), 5),
    end: monthUtils.currentMonth(),
    mode: 'sliding-window' as const,
  };

  const [startMonth, endMonth] = calculateTimeRange(timeFrame);
  const startDate = monthUtils.monthFromDate(startMonth) + '-01';
  const endDate = monthUtils.getMonthEnd(
    monthUtils.monthFromDate(endMonth) + '-01',
  );

  const getGraphData = useMemo(() => {
    return createBudgetAnalysisSpreadsheet({
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      startDate,
      endDate,
    });
  }, [meta?.conditions, meta?.conditionsOp, startDate, endDate]);

  const data = useReport('default', getGraphData);

  const latestInterval =
    data && data.intervalData.length > 0
      ? data.intervalData[data.intervalData.length - 1]
      : undefined;
  const balance = latestInterval?.balance ?? 0;
  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/budget-analysis/${widgetId}`}
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
        onPointerEnter={() => setIsCardHovered(true)}
        onPointerLeave={() => setIsCardHovered(false)}
      >
        <View style={{ flexDirection: 'row', padding: 20 }}>
          <View style={{ flex: 1 }}>
            <ReportCardName
              name={meta?.name || t('Budget Analysis')}
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
            <DateRange
              start={monthUtils.getMonth(startDate)}
              end={monthUtils.getMonth(endDate)}
            />
          </View>
          {data && (
            <View style={{ textAlign: 'right' }}>
              <Block
                style={{
                  ...styles.mediumText,
                  fontWeight: 500,
                  marginBottom: 5,
                  color: balance >= 0 ? theme.noticeTextLight : theme.errorText,
                }}
              >
                <FinancialText>
                  <PrivacyFilter activationFilters={[!isCardHovered]}>
                    {format(balance, 'financial')}
                  </PrivacyFilter>
                </FinancialText>
              </Block>
            </View>
          )}
        </View>
        {data ? (
          <BudgetAnalysisGraph
            style={{ flex: 1 }}
            data={data}
            graphType={meta?.graphType || 'Bar'}
            showBalance={meta?.showBalance ?? true}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
