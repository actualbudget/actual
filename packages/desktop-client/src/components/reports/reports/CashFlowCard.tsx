import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Bar, BarChart, LabelList, ResponsiveContainer } from 'recharts';

import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { type CashFlowWidget } from 'loot-core/src/types/models';

import { theme } from '../../../style';
import { View } from '../../common/View';
import { PrivacyFilter } from '../../PrivacyFilter';
import { Change } from '../Change';
import { chartTheme } from '../chart-theme';
import { Container } from '../Container';
import { DateRange } from '../DateRange';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { ReportCardName } from '../ReportCardName';
import { simpleCashFlow } from '../spreadsheets/cash-flow-spreadsheet';
import { useReport } from '../useReport';

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

  const anchorValue = {
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
        <PrivacyFilter>{integerToCurrency(value)}</PrivacyFilter>
      </text>
    </>
  );
}

type CashFlowCardProps = {
  isEditing?: boolean;
  meta?: CashFlowWidget['meta'];
  onMetaChange: (newMeta: CashFlowWidget['meta']) => void;
  onRemove: () => void;
};

export function CashFlowCard({
  isEditing,
  meta,
  onMetaChange,
  onRemove,
}: CashFlowCardProps) {
  const { t } = useTranslation();
  const end = monthUtils.currentDay();
  const start = monthUtils.currentMonth() + '-01';

  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const params = useMemo(() => simpleCashFlow(start, end), [start, end]);
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
      to="/reports/cash-flow"
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
              <ResponsiveContainer>
                <BarChart
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
                  >
                    <LabelList
                      dataKey="expenses"
                      position="right"
                      content={<CustomLabel name={t('Expenses')} />}
                    />
                  </Bar>
                </BarChart>
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
