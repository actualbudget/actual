import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import type { SpendingWidget } from 'loot-core/types/models';

import { FinancialText } from '@desktop-client/components/FinancialText';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { DateRange } from '@desktop-client/components/reports/DateRange';
import { SpendingGraph } from '@desktop-client/components/reports/graphs/SpendingGraph';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import { ReportCardName } from '@desktop-client/components/reports/ReportCardName';
import { calculateSpendingReportTimeRange } from '@desktop-client/components/reports/reportRanges';
import { createSpendingSpreadsheet } from '@desktop-client/components/reports/spreadsheets/spending-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { useWidgetCopyMenu } from '@desktop-client/components/reports/useWidgetCopyMenu';
import { useFormat } from '@desktop-client/hooks/useFormat';

type SpendingCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: SpendingWidget['meta'];
  onMetaChange: (newMeta: SpendingWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function SpendingCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: SpendingCardProps) {
  const { t } = useTranslation();
  const format = useFormat();

  const [isCardHovered, setIsCardHovered] = useState(false);
  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useWidgetCopyMenu(onCopy);

  const spendingReportMode = meta?.mode ?? 'single-month';

  const [compare, compareTo] = calculateSpendingReportTimeRange(meta ?? {});

  const selection =
    spendingReportMode === 'single-month' ? 'compareTo' : spendingReportMode;
  const getGraphData = useMemo(() => {
    return createSpendingSpreadsheet({
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      compare,
      compareTo,
    });
  }, [meta?.conditions, meta?.conditionsOp, compare, compareTo]);

  const data = useReport('default', getGraphData);
  const todayDay =
    compare !== monthUtils.currentMonth()
      ? 27
      : monthUtils.getDay(monthUtils.currentDay()) - 1 >= 28
        ? 27
        : monthUtils.getDay(monthUtils.currentDay()) - 1;
  const difference =
    data &&
    Math.round(
      data.intervalData[todayDay][selection] -
        data.intervalData[todayDay].compare,
    );

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/spending/${widgetId}`}
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
