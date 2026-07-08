import React, { useCallback, useEffect, useState } from 'react';
import type { SVGAttributes } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CashFlowWidget } from '@actual-app/core/types/models';
import type { JSONValue } from '@actual-app/core/types/report-spreadsheet';
import { Bar, BarChart, LabelList } from 'recharts';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { Change } from '#components/reports/Change';
import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import { DateRange } from '#components/reports/DateRange';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { calculateTimeRange } from '#components/reports/reportRanges';
import { useFormat } from '#hooks/useFormat';

import { defaultTimeFrame } from './CashFlow';

type CustomLabelProps = {
  value?: number;
  name: string;
  position?: 'left' | 'right';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

function CustomLabel({
  value = 0,
  name,
  position = 'left',
  x = 0,
  y = 0,
  width: barWidth = 0,
  height: barHeight = 0,
}: CustomLabelProps) {
  const format = useFormat();

  const valueLengthOffset = 20;

  const yOffset = barHeight < 25 ? 105 : y;

  const labelXOffsets = {
    right: 6,
    left: -valueLengthOffset + 1,
  };

  const valueXOffsets = {
    right: 6,
    left: -valueLengthOffset + 2,
  };

  const anchorValue: {
    right: SVGAttributes<SVGTextElement>['textAnchor'];
    left: SVGAttributes<SVGTextElement>['textAnchor'];
  } = {
    right: 'start',
    left: 'end',
  };

  return (
    <>
      <text
        x={x + barWidth + labelXOffsets[position]}
        y={yOffset + 10}
        textAnchor={anchorValue[position]}
        fill={theme.tableText}
      >
        {name}
      </text>
      <FinancialText
        as="text"
        x={x + barWidth + valueXOffsets[position]}
        y={yOffset + 26}
        textAnchor={anchorValue[position]}
        fill={theme.tableText}
      >
        <PrivacyFilter>{format(value, 'financial')}</PrivacyFilter>
      </FinancialText>
    </>
  );
}

type CashFlowCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: CashFlowWidget['meta'];
  reportData?: JSONValue;
  onMetaChange: (newMeta: CashFlowWidget['meta']) => void;
};

type CashFlowReportData = {
  [key: string]: JSONValue;
  graphData: {
    [key: string]: JSONValue;
    expense: number;
    income: number;
  };
};

function isCashFlowReportData(
  value: JSONValue | undefined,
): value is CashFlowReportData {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const graphData = value.graphData;
  if (
    graphData === null ||
    typeof graphData !== 'object' ||
    Array.isArray(graphData)
  ) {
    return false;
  }

  return (
    typeof graphData.expense === 'number' &&
    typeof graphData.income === 'number'
  );
}

export function CashFlowCard({
  widgetId,
  isEditing,
  meta = {},
  reportData,
  onMetaChange,
}: CashFlowCardProps) {
  const { t } = useTranslation();
  const animationProps = useRechartsAnimation();
  const [latestTransaction, setLatestTransaction] = useState<string>('');
  const [nameMenuOpen, setNameMenuOpen] = useState(false);

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
    defaultTimeFrame,
    latestTransaction,
  );

  const data = isCashFlowReportData(reportData) ? reportData : null;

  const [isCardHovered, setIsCardHovered] = useState(false);
  const onCardHover = useCallback(() => setIsCardHovered(true), []);
  const onCardHoverEnd = useCallback(() => setIsCardHovered(false), []);

  const { graphData } = data || {};
  const expenses = -(graphData?.expense || 0);
  const income = graphData?.income || 0;

  return (
    <ReportCard
      widgetId={widgetId}
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/cash-flow/${widgetId}`}
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
              name={meta?.name || t('Cash Flow')}
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
              <PrivacyFilter activationFilters={[!isCardHovered]}>
                <Change amount={income - expenses} />
              </PrivacyFilter>
            </View>
          )}
        </View>

        {data ? (
          <Container style={{ height: 'auto', flex: 1 }}>
            {(width, height) => (
              <BarChart
                responsive
                width={width}
                height={height}
                data={[
                  {
                    income,
                    expenses,
                  },
                ]}
                margin={{
                  top: 10,
                  bottom: 0,
                }}
              >
                <Bar
                  dataKey="income"
                  fill={theme.reportsNumberPositive}
                  barSize={14}
                  {...animationProps}
                >
                  <LabelList
                    dataKey="income"
                    position="left"
                    content={<CustomLabel name={t('Income')} />}
                  />
                </Bar>

                <Bar
                  dataKey="expenses"
                  fill={theme.reportsNumberNegative}
                  barSize={14}
                  {...animationProps}
                >
                  <LabelList
                    dataKey="expenses"
                    position="right"
                    content={<CustomLabel name={t('Expenses')} />}
                  />
                </Bar>
              </BarChart>
            )}
          </Container>
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
