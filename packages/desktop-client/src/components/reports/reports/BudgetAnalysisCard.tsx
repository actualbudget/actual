import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { BudgetAnalysisWidget } from '@actual-app/core/types/models';
import type { JSONValue } from '@actual-app/core/types/report-spreadsheet';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { DateRange } from '#components/reports/DateRange';
import { BudgetAnalysisGraph } from '#components/reports/graphs/BudgetAnalysisGraph';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { calculateTimeRange } from '#components/reports/reportRanges';
import { useFormat } from '#hooks/useFormat';

type BudgetAnalysisCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: BudgetAnalysisWidget['meta'];
  reportData?: JSONValue;
  onMetaChange: (newMeta: BudgetAnalysisWidget['meta']) => void;
};

type BudgetAnalysisReportData = {
  [key: string]: JSONValue;
  endDate: string;
  finalOverspendingAdjustment: number;
  intervalData: Array<{
    [key: string]: JSONValue;
    balance: number;
    budgeted: number;
    date: string;
    overspendingAdjustment: number;
    spent: number;
  }>;
  startDate: string;
  totalBudgeted: number;
  totalOverspendingAdjustment: number;
  totalSpent: number;
};

function isBudgetAnalysisReportData(
  value: JSONValue | undefined,
): value is BudgetAnalysisReportData {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return (
    Array.isArray(value.intervalData) &&
    typeof value.startDate === 'string' &&
    typeof value.endDate === 'string' &&
    typeof value.totalBudgeted === 'number' &&
    typeof value.totalSpent === 'number'
  );
}

export function BudgetAnalysisCard({
  widgetId,
  isEditing,
  meta = {},
  reportData,
  onMetaChange,
}: BudgetAnalysisCardProps) {
  const { t } = useTranslation();
  const format = useFormat();

  const [isCardHovered, setIsCardHovered] = useState(false);
  const [nameMenuOpen, setNameMenuOpen] = useState(false);

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

  const data = isBudgetAnalysisReportData(reportData) ? reportData : null;

  const latestInterval =
    data && data.intervalData.length > 0
      ? data.intervalData[data.intervalData.length - 1]
      : undefined;
  const balance = latestInterval?.balance ?? 0;
  return (
    <ReportCard
      widgetId={widgetId}
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/budget-analysis/${widgetId}`}
      onRename={() => setNameMenuOpen(true)}
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
            balanceOnly={meta?.balanceOnly ?? false}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
