import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { type AgeOfMoneyWidget } from 'loot-core/types/models';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { DateRange } from '@desktop-client/components/reports/DateRange';
import { AgeOfMoneyGraph } from '@desktop-client/components/reports/graphs/AgeOfMoneyGraph';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import { ReportCardName } from '@desktop-client/components/reports/ReportCardName';
import { calculateTimeRange } from '@desktop-client/components/reports/reportRanges';
import { createAgeOfMoneySpreadsheet } from '@desktop-client/components/reports/spreadsheets/age-of-money-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { useWidgetCopyMenu } from '@desktop-client/components/reports/useWidgetCopyMenu';

// Determine status color based on age
export function getAgeColor(age: number | null) {
  if (age === null) return theme.pageTextSubdued;
  if (age >= 30) return theme.noticeTextLight; // Green - good
  if (age >= 14) return theme.warningText; // Yellow - getting there
  return theme.errorText; // Red - needs work
}

// Trend indicator
function getTrendIndicator(trend: 'up' | 'down' | 'stable') {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    default:
      return '→';
  }
}

type AgeOfMoneyCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: AgeOfMoneyWidget['meta'];
  onMetaChange: (newMeta: AgeOfMoneyWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function AgeOfMoneyCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: AgeOfMoneyCardProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  const [latestTransaction, setLatestTransaction] = useState<string>('');
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);

  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useWidgetCopyMenu(onCopy);

  useEffect(() => {
    async function fetchLatestTransaction() {
      const latestTrans = await send('get-latest-transaction');
      setLatestTransaction(
        latestTrans ? latestTrans.date : monthUtils.currentDay(),
      );
    }
    fetchLatestTransaction();
  }, []);

  const [start, end] = calculateTimeRange(
    meta?.timeFrame,
    undefined,
    latestTransaction,
  );

  const onCardHover = useCallback(() => setIsCardHovered(true), []);
  const onCardHoverEnd = useCallback(() => setIsCardHovered(false), []);

  const params = useMemo(
    () =>
      createAgeOfMoneySpreadsheet({
        start,
        end,
        conditions: meta?.conditions,
        conditionsOp: meta?.conditionsOp,
        granularity: meta?.granularity ?? 'monthly',
      }),
    [start, end, meta?.conditions, meta?.conditionsOp, meta?.granularity],
  );
  const data = useReport('age_of_money', params);

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/age-of-money/${widgetId}`}
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
              name={meta?.name || t('Age of Money')}
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
          {data && (
            <View style={{ textAlign: 'right' }}>
              <Block
                style={{
                  ...styles.largeText,
                  fontWeight: 500,
                  marginBottom: 5,
                  color: getAgeColor(data.currentAge),
                }}
              >
                <PrivacyFilter activationFilters={[!isCardHovered]}>
                  {data.currentAge !== null
                    ? t('{{days}} days', { days: data.currentAge })
                    : t('N/A')}
                </PrivacyFilter>
              </Block>
              {data.currentAge !== null && (
                <Block
                  style={{
                    fontSize: 12,
                    color: theme.pageTextSubdued,
                  }}
                >
                  {getTrendIndicator(data.trend)}{' '}
                  {data.trend === 'up'
                    ? t('Improving')
                    : data.trend === 'down'
                      ? t('Declining')
                      : t('Stable')}
                </Block>
              )}
              {data.insufficientData && (
                <Block
                  style={{
                    fontSize: 10,
                    color: theme.warningText,
                    marginTop: 2,
                  }}
                >
                  <Trans>Incomplete data</Trans>
                </Block>
              )}
            </View>
          )}
        </View>

        {data ? (
          <AgeOfMoneyGraph
            data={data.graphData}
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
