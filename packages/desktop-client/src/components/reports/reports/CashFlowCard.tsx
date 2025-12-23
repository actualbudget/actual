import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  type SVGAttributes,
} from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { Bar, BarChart, LabelList } from 'recharts';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { type CashFlowWidget } from 'loot-core/types/models';

import { defaultTimeFrame } from './CashFlow';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { Change } from '@desktop-client/components/reports/Change';
import {
  chartTheme,
  useRechartsAnimation,
} from '@desktop-client/components/reports/chart-theme';
import { Container } from '@desktop-client/components/reports/Container';
import { DateRange } from '@desktop-client/components/reports/DateRange';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import { ReportCardName } from '@desktop-client/components/reports/ReportCardName';
import { calculateTimeRange } from '@desktop-client/components/reports/reportRanges';
import { simpleCashFlow } from '@desktop-client/components/reports/spreadsheets/cash-flow-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { useFormat } from '@desktop-client/hooks/useFormat';

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
      <text
        x={x + barWidth + valueXOffsets[position]}
        y={yOffset + 26}
        textAnchor={anchorValue[position]}
        fill={theme.tableText}
      >
        <PrivacyFilter>{format(value, 'financial')}</PrivacyFilter>
      </text>
    </>
  );
}

type CashFlowCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: CashFlowWidget['meta'];
  onMetaChange: (newMeta: CashFlowWidget['meta']) => void;
  onRemove: () => void;
};

export function CashFlowCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
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
    fetchLatestTransaction();
  }, []);

  const [start, end] = calculateTimeRange(
    meta?.timeFrame,
    defaultTimeFrame,
    latestTransaction,
  );

  const params = useMemo(
    () => simpleCashFlow(start, end, meta?.conditions, meta?.conditionsOp),
    [start, end, meta?.conditions, meta?.conditionsOp],
  );
  const data = useReport('cash_flow_simple', params);

  const [isCardHovered, setIsCardHovered] = useState(false);
  const onCardHover = useCallback(() => setIsCardHovered(true), []);
  const onCardHoverEnd = useCallback(() => setIsCardHovered(false), []);

  const { graphData } = data || {};
  const expenses = -(graphData?.expense || 0);
  const income = graphData?.income || 0;

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/cash-flow/${widgetId}`}
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
                  fill={chartTheme.colors.blue}
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
                  fill={chartTheme.colors.red}
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
