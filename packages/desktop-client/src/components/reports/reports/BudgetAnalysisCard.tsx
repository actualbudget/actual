import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import { type BudgetAnalysisWidget } from 'loot-core/types/models';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { DateRange } from '@desktop-client/components/reports/DateRange';
import { BudgetAnalysisGraph } from '@desktop-client/components/reports/graphs/BudgetAnalysisGraph';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import { ReportCardName } from '@desktop-client/components/reports/ReportCardName';
import { createBudgetAnalysisSpreadsheet } from '@desktop-client/components/reports/spreadsheets/budget-analysis-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { useFormat } from '@desktop-client/hooks/useFormat';

type BudgetAnalysisCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: BudgetAnalysisWidget['meta'];
  onMetaChange: (newMeta: BudgetAnalysisWidget['meta']) => void;
  onRemove: () => void;
};

export function BudgetAnalysisCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
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

  // Calculate date range
  let startDate = timeFrame.start + '-01';
  let endDate = monthUtils.getMonthEnd(timeFrame.end + '-01');

  if (timeFrame.mode === 'sliding-window') {
    const currentMonth = monthUtils.currentMonth();
    startDate = monthUtils.subMonths(currentMonth, 5) + '-01';
    endDate = monthUtils.getMonthEnd(currentMonth + '-01');
  }

  const getGraphData = useMemo(() => {
    return createBudgetAnalysisSpreadsheet({
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      startDate,
      endDate,
      interval: meta?.interval || 'Monthly',
    });
  }, [meta?.conditions, meta?.conditionsOp, meta?.interval, startDate, endDate]);

  const data = useReport('default', getGraphData);

  const latestInterval = data?.intervalData?.[data.intervalData.length - 1];
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
                <PrivacyFilter activationFilters={[!isCardHovered]}>
                  {format(balance, 'financial')}
                </PrivacyFilter>
              </Block>
            </View>
          )}
        </View>
        {data ? (
          <BudgetAnalysisGraph
            style={{ flex: 1 }}
            compact={true}
            data={data}
            graphType={meta?.graphType || 'Line'}
            interval={meta?.interval || 'Monthly'}
            showBalance={meta?.showBalance ?? true}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
