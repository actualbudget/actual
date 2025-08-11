import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import {
  type AccountEntity,
  type NetWorthWidget,
} from 'loot-core/types/models';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { Change } from '@desktop-client/components/reports/Change';
import { DateRange } from '@desktop-client/components/reports/DateRange';
import { NetWorthGraph } from '@desktop-client/components/reports/graphs/NetWorthGraph';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import { ReportCardName } from '@desktop-client/components/reports/ReportCardName';
import { calculateTimeRange } from '@desktop-client/components/reports/reportRanges';
import { createSpreadsheet as netWorthSpreadsheet } from '@desktop-client/components/reports/spreadsheets/net-worth-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

type NetWorthCardProps = {
  widgetId: string;
  isEditing?: boolean;
  accounts: AccountEntity[];
  meta?: NetWorthWidget['meta'];
  onMetaChange: (newMeta: NetWorthWidget['meta']) => void;
  onRemove: () => void;
};

export function NetWorthCard({
  widgetId,
  isEditing,
  accounts,
  meta = {},
  onMetaChange,
  onRemove,
}: NetWorthCardProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  const format = useFormat();

  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const [start, end] = calculateTimeRange(meta?.timeFrame);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const onCardHover = useCallback(() => setIsCardHovered(true), []);
  const onCardHoverEnd = useCallback(() => setIsCardHovered(false), []);

  const params = useMemo(
    () =>
      netWorthSpreadsheet(
        start,
        end,
        accounts,
        meta?.conditions,
        meta?.conditionsOp,
        locale,
        meta?.interval || 'Monthly',
        firstDayOfWeekIdx,
        format,
      ),
    [
      start,
      end,
      accounts,
      meta?.conditions,
      meta?.conditionsOp,
      locale,
      meta?.interval,
      firstDayOfWeekIdx,
      format,
    ],
  );
  const data = useReport('net_worth', params);

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/net-worth/${widgetId}`}
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
        onPointerEnter={onCardHover}
        onPointerLeave={onCardHoverEnd}
      >
        <View style={{ flexDirection: 'row', padding: 20 }}>
          <View style={{ flex: 1 }}>
            <ReportCardName
              name={meta?.name || t('Net Worth')}
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
                  ...styles.mediumText,
                  fontWeight: 500,
                  marginBottom: 5,
                }}
              >
                <PrivacyFilter activationFilters={[!isCardHovered]}>
                  {format(data.netWorth, 'financial')}
                </PrivacyFilter>
              </Block>
              <PrivacyFilter activationFilters={[!isCardHovered]}>
                <Change amount={data.totalChange} />
              </PrivacyFilter>
            </View>
          )}
        </View>

        {data ? (
          <NetWorthGraph
            graphData={data.graphData}
            compact={true}
            showTooltip={!isEditing && !isNarrowWidth}
            interval={meta?.interval || 'Monthly'}
            style={{ height: 'auto', flex: 1 }}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
