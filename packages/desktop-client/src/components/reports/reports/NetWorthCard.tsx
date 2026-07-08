import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { NetWorthWidget } from '@actual-app/core/types/models';
import type { JSONValue } from '@actual-app/core/types/report-spreadsheet';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { Change } from '#components/reports/Change';
import { DateRange } from '#components/reports/DateRange';
import { NetWorthGraph } from '#components/reports/graphs/NetWorthGraph';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { calculateTimeRange } from '#components/reports/reportRanges';
import { useFormat } from '#hooks/useFormat';

type NetWorthReportData = {
  [key: string]: JSONValue;
  accounts: Array<{ id: string; name: string }>;
  graphData: {
    [key: string]: JSONValue;
    data: Array<{
      [key: string]: JSONValue;
      assets: number;
      change: number;
      date: string;
      debt: number;
      networth: number;
      x: string;
      y: number;
    }>;
    end: string;
    hasNegative: boolean;
    start: string;
  };
  highestNetWorth: number | null;
  lowestNetWorth: number | null;
  netWorth: number;
  totalChange: number;
};

type NetWorthCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: NetWorthWidget['meta'];
  reportData?: JSONValue;
  onMetaChange: (newMeta: NetWorthWidget['meta']) => void;
};

function isNetWorthReportData(
  value: JSONValue | undefined,
): value is NetWorthReportData {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const data = value as Record<string, unknown>;
  const graphData = data.graphData as Record<string, unknown> | undefined;
  return (
    typeof data.netWorth === 'number' &&
    typeof data.totalChange === 'number' &&
    Array.isArray(data.accounts) &&
    !!graphData &&
    Array.isArray(graphData.data) &&
    typeof graphData.hasNegative === 'boolean' &&
    typeof graphData.start === 'string' &&
    typeof graphData.end === 'string'
  );
}

export function NetWorthCard({
  widgetId,
  isEditing,
  meta = {},
  reportData,
  onMetaChange,
}: NetWorthCardProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const format = useFormat();

  const [latestTransaction, setLatestTransaction] = useState<string>('');
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);

  useEffect(() => {
    async function fetchLatestTransaction() {
      const latestTrans = await send('get-latest-transaction');
      setLatestTransaction(
        latestTrans ? latestTrans.date : monthUtils.currentDay(),
      );
    }
    void fetchLatestTransaction();
  }, []);

  const [start, end] = calculateTimeRange(
    meta?.timeFrame,
    undefined,
    latestTransaction,
  );
  const onCardHover = useCallback(() => setIsCardHovered(true), []);
  const onCardHoverEnd = useCallback(() => setIsCardHovered(false), []);

  const data = useMemo(() => {
    if (!isNetWorthReportData(reportData)) {
      return null;
    }

    return {
      ...reportData,
      graphData: {
        ...reportData.graphData,
        data: reportData.graphData.data.map(point => ({
          ...point,
          assets: format(point.assets, 'financial'),
          change: format(point.change, 'financial'),
          debt: `-${format(point.debt, 'financial')}`,
          networth: format(point.networth, 'financial'),
        })),
      },
    };
  }, [format, reportData]);

  return (
    <ReportCard
      widgetId={widgetId}
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/net-worth/${widgetId}`}
      onRename={() => setNameMenuOpen(true)}
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
                  <FinancialText>
                    {format(data.netWorth, 'financial')}
                  </FinancialText>
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
            accounts={data.accounts}
            compact
            showTooltip={!isEditing && !isNarrowWidth}
            interval={meta?.interval || 'Monthly'}
            mode={meta?.mode || 'trend'}
            style={{ height: 'auto', flex: 1 }}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
