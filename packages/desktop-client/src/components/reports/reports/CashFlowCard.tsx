import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import * as d from 'date-fns';
import { ResponsiveContainer } from 'recharts';

import { type CashFlowWidget } from 'loot-core/src/types/models';

import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { View } from '../../common/View';
import { Container } from '../Container';
import { DateRange } from '../DateRange';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { ReportCardName } from '../ReportCardName';
import { calculateTimeRange } from '../reportRanges';
import { simpleCashFlow } from '../spreadsheets/cash-flow-spreadsheet';
import { useReport } from '../useReport';

import { defaultTimeFrame } from './CashFlow';
import { renderCashFlowCardChartCondensed } from './renderCashFlowCardChartCondensed';
import { renderCashFlowCardChartDetailed } from './renderCashFlowCardChartDetailed';
import { renderCashFlowCardViewCondensed } from './renderCashFlowCardViewCondensed';
import { renderCashFlowCardViewDetailed } from './renderCashFlowCardViewDetailed';
import { useCashFlowDataDetailed } from './useCashFlowDataDetailed';

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
  const isDashboardsFeatureEnabled = useFeatureFlag('dashboards');
  const { t } = useTranslation();

  const MIN_DETAILED_CHART_HEIGHT = 290;

  const [start, end] = calculateTimeRange(meta?.timeFrame, defaultTimeFrame);
  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const numDays = d.differenceInCalendarDays(
    d.parseISO(end),
    d.parseISO(start),
  );
  const isConcise = numDays > 31 * 3;

  const [isCardHovered, setIsCardHovered] = useState(false);
  const onCardHover = useCallback(() => setIsCardHovered(true), []);
  const onCardHoverEnd = useCallback(() => setIsCardHovered(false), []);

  const paramsCondensed = useMemo(
    () =>
      simpleCashFlow(start, end, meta?.conditions, meta?.conditionsOp ?? 'and'),
    [start, end, meta?.conditions, meta?.conditionsOp],
  );

  const dataCondensed = useReport('cash_flow_simple', paramsCondensed);

  const dataDetailed = useCashFlowDataDetailed(
    start,
    end,
    isConcise,
    meta?.conditions,
    meta?.conditionsOp ?? 'and',
  );

  let dataOk: boolean = false,
    switchFlag: boolean = false,
    graphDataDetailed = {
      expenses: [{ x: new Date(), y: 0 }],
      income: [{ x: new Date(), y: 0 }],
      balances: [{ x: new Date(), y: 0 }],
      transfers: [{ x: new Date(), y: 0 }],
    },
    totalExpenses: number = 0,
    totalIncome: number = 0,
    totalTransfers: number = 0,
    expenses: number = 0,
    income: number = 0;

  if (meta && meta?.mode !== undefined && meta?.mode === 'full') {
    switchFlag = true;
    graphDataDetailed = dataDetailed?.graphData || {
      expenses: [{ x: new Date(), y: 0 }],
      income: [{ x: new Date(), y: 0 }],
      balances: [{ x: new Date(), y: 0 }],
      transfers: [{ x: new Date(), y: 0 }],
    };
    totalExpenses = dataDetailed?.totalExpenses || 0;
    totalIncome = dataDetailed?.totalIncome || 0;
    totalTransfers = dataDetailed?.totalTransfers || 0;
    dataOk = Boolean(dataDetailed);
  }

  const isCondensedMode = (mode: string | undefined, height: number) =>
    mode === 'condensed' ||
    mode === undefined ||
    height < MIN_DETAILED_CHART_HEIGHT;

  const graphDataCondensed = dataCondensed?.graphData || null;
  income = graphDataCondensed?.income || 0;
  expenses = -(graphDataCondensed?.expense || 0);
  if (
    graphDataCondensed &&
    (meta?.mode === 'condensed' || meta?.mode === undefined)
  ) {
    dataOk = true;
  }

  return (
    <ReportCard
      isEditing={isEditing}
      to={
        isDashboardsFeatureEnabled
          ? `/reports/cash-flow/${widgetId}`
          : '/reports/cash-flow'
      }
      menuItems={[
        {
          name: 'change-view',
          text: switchFlag
            ? t('Switch to condensed graph')
            : t('Switch to detailed graph'),
        },
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
          case 'change-view': {
            const newValue = switchFlag ? 'condensed' : 'full';
            onMetaChange({
              ...meta,
              mode: newValue,
            });
            break;
          }
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
          {dataOk &&
            (meta?.mode === 'condensed' || meta?.mode === undefined
              ? renderCashFlowCardViewCondensed(isCardHovered, income, expenses)
              : renderCashFlowCardViewDetailed(
                  totalIncome,
                  totalExpenses,
                  totalTransfers,
                  isCardHovered,
                ))}
        </View>

        {dataOk ? (
          <Container style={{ height: 'auto', flex: 1 }}>
            {(width, height) => (
              <ResponsiveContainer>
                {isCondensedMode(meta?.mode, height)
                  ? renderCashFlowCardChartCondensed(
                      width,
                      height,
                      income,
                      expenses,
                      t,
                      Boolean(
                        height < MIN_DETAILED_CHART_HEIGHT &&
                          meta?.mode === 'full',
                      ),
                    )
                  : renderCashFlowCardChartDetailed(
                      graphDataDetailed,
                      isConcise,
                    )}
              </ResponsiveContainer>
            )}
          </Container>
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
