// @ts-strict-ignore
import React from 'react';

import { type TFunction } from 'i18next';
import { Bar, BarChart, LabelList } from 'recharts';

import { integerToCurrency } from 'loot-core/src/shared/util';

import { SvgExclamationSolid } from '../../../icons/v1';
import { styles, theme } from '../../../style';
import { Tooltip } from '../../common/Tooltip';
import { View } from '../../common/View';
import { PrivacyFilter } from '../../PrivacyFilter';
import { chartTheme } from '../chart-theme';

export const renderCashFlowCardChartCondensed = (
  width: number,
  height: number,
  income: number,
  expenses: number,
  t: TFunction,
  hasWarning: boolean,
) => {
  return (
    <View>
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
        <Bar dataKey="income" fill={chartTheme.colors.blue} barSize={14}>
          <LabelList
            dataKey="income"
            position="left"
            content={<CustomLabel name={t('Income')} />}
          />
        </Bar>

        <Bar dataKey="expenses" fill={chartTheme.colors.red} barSize={14}>
          <LabelList
            dataKey="expenses"
            position="right"
            content={<CustomLabel name={t('Expenses')} />}
          />
        </Bar>
      </BarChart>
      {hasWarning && (
        <View style={{ padding: 5, position: 'absolute', bottom: 0 }}>
          <Tooltip
            content={t(
              'Additional widget height required to display the detailed chart, edit dashboard to increase widget height',
            )}
            placement="bottom start"
            style={{ ...styles.tooltip, maxWidth: 300 }}
          >
            <SvgExclamationSolid
              width={20}
              height={20}
              style={{ color: theme.warningText }}
            />
          </Tooltip>
        </View>
      )}
    </View>
  );
};

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
