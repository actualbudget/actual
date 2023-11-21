import React from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { styles, type CSSProperties } from '../../../../style';
import AlignedText from '../../../common/AlignedText';
import Block from '../../../common/Block';
import HoverTarget from '../../../common/HoverTarget';
import View from '../../../common/View';
import CellValue from '../../../spreadsheet/CellValue';
import useFormat from '../../../spreadsheet/useFormat';
import { Tooltip } from '../../../tooltips';

type TotalsListProps = {
  prevMonthName: string;
  style?: CSSProperties;
};
export default function TotalsList({ prevMonthName, style }: TotalsListProps) {
  const format = useFormat();
  return (
    <View
      style={{
        flexDirection: 'row',
        lineHeight: 1.5,
        justifyContent: 'center',
        ...styles.smallText,
        ...style,
      }}
    >
      <View
        style={{
          textAlign: 'right',
          marginRight: 10,
          minWidth: 50,
        }}
      >
        <HoverTarget
          style={{ flexShrink: 0 }}
          renderContent={() => (
            <Tooltip
              width={200}
              style={{ lineHeight: 1.5, padding: '6px 10px' }}
            >
              <AlignedText
                left="Income:"
                right={
                  <CellValue
                    binding={rolloverBudget.totalIncome}
                    type="financial"
                    privacyFilter={false}
                  />
                }
              />
              <AlignedText
                left="From Last Month:"
                right={
                  <CellValue
                    binding={rolloverBudget.fromLastMonth}
                    type="financial"
                    privacyFilter={false}
                  />
                }
              />
            </Tooltip>
          )}
        >
          <CellValue
            binding={rolloverBudget.incomeAvailable}
            type="financial"
            style={{ fontWeight: 600 }}
          />
        </HoverTarget>

        <CellValue
          binding={rolloverBudget.lastMonthOverspent}
          type="financial"
          formatter={value => {
            let v = format(value, 'financial');
            return value > 0 ? '+' + v : value === 0 ? '-' + v : v;
          }}
          style={{ fontWeight: 600, ...styles.tnum }}
        />

        <CellValue
          binding={rolloverBudget.totalBudgeted}
          type="financial"
          formatter={value => {
            let v = format(value, 'financial');
            return value > 0 ? '+' + v : value === 0 ? '-' + v : v;
          }}
          style={{ fontWeight: 600, ...styles.tnum }}
        />

        <CellValue
          binding={rolloverBudget.forNextMonth}
          type="financial"
          formatter={value => {
            let n = parseInt(value) || 0;
            let v = format(Math.abs(n), 'financial');
            return n >= 0 ? '-' + v : '+' + v;
          }}
          style={{ fontWeight: 600, ...styles.tnum }}
        />
      </View>

      <View>
        <Block>Available Funds</Block>
        <Block>Overspent in {prevMonthName}</Block>
        <Block>Budgeted</Block>
        <Block>For Next Month</Block>
      </View>
    </View>
  );
}
