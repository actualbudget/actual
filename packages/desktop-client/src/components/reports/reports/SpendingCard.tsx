import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  SpendingEntity,
  SpendingWidget,
} from '@actual-app/core/types/models';
import type { JSONValue } from '@actual-app/core/types/report-spreadsheet';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { DateRange } from '#components/reports/DateRange';
import { SpendingGraph } from '#components/reports/graphs/SpendingGraph';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { calculateSpendingReportTimeRange } from '#components/reports/reportRanges';
import {
  getSpendingAverageRangeLabel,
  normalizeSpendingAverageRange,
} from '#components/reports/spendingAverageRange';
import { useFormat } from '#hooks/useFormat';

type SpendingCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: SpendingWidget['meta'];
  reportData?: JSONValue;
  onMetaChange: (newMeta: SpendingWidget['meta']) => void;
};

type SpendingReportData = SpendingEntity & {
  [key: string]: JSONValue;
};

function isSpendingReportData(
  value: JSONValue | undefined,
): value is SpendingReportData {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return (
    Array.isArray(value.intervalData) &&
    typeof value.totalAssets === 'number' &&
    typeof value.totalDebts === 'number' &&
    typeof value.totalTotals === 'number'
  );
}

export function SpendingCard({
  widgetId,
  isEditing,
  meta = {},
  reportData,
  onMetaChange,
}: SpendingCardProps) {
  const { t } = useTranslation();
  const format = useFormat();

  const [isCardHovered, setIsCardHovered] = useState(false);
  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const spendingReportMode = meta?.mode ?? 'single-month';
  const averageRange = normalizeSpendingAverageRange(meta?.averageRange);
  const averageRangeLabel = getSpendingAverageRangeLabel(averageRange, t);

  const [compare, compareTo] = calculateSpendingReportTimeRange(meta ?? {});

  const selection =
    spendingReportMode === 'single-month' ? 'compareTo' : spendingReportMode;
  const data = isSpendingReportData(reportData) ? reportData : null;
  const todayDay =
    compare !== monthUtils.currentMonth()
      ? 27
      : monthUtils.getDay(monthUtils.currentDay()) - 1 >= 28
        ? 27
        : monthUtils.getDay(monthUtils.currentDay()) - 1;
  const selectedValue = data?.intervalData[todayDay]?.[selection];
  const compareValue = data?.intervalData[todayDay]?.compare;
  const difference =
    typeof selectedValue === 'number' && typeof compareValue === 'number'
      ? Math.round(selectedValue - compareValue)
      : null;

  return (
    <ReportCard
      widgetId={widgetId}
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/spending/${widgetId}`}
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
              name={meta?.name || t('Monthly Spending')}
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
              start={compare}
              end={compareTo}
              type={spendingReportMode}
              comparisonLabel={
                spendingReportMode === 'average' ? averageRangeLabel : undefined
              }
            />
          </View>
          {data && (
            <View style={{ textAlign: 'right' }}>
              <Block
                style={{
                  ...styles.mediumText,
                  fontWeight: 500,
                  marginBottom: 5,
                  color:
                    difference === 0 || difference == null
                      ? theme.reportsNumberNeutral
                      : difference > 0
                        ? theme.reportsNumberNegative
                        : theme.reportsNumberPositive,
                }}
              >
                <PrivacyFilter activationFilters={[!isCardHovered]}>
                  <FinancialText>
                    {data &&
                      (difference && difference > 0 ? '+' : '') +
                        format(difference || 0, 'financial')}
                  </FinancialText>
                </PrivacyFilter>
              </Block>
            </View>
          )}
        </View>
        {data ? (
          <SpendingGraph
            style={{ flex: 1 }}
            compact
            data={data}
            mode={spendingReportMode}
            compare={compare}
            compareTo={compareTo}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
