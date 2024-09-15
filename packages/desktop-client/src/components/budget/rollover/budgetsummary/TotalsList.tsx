import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { styles, type CSSProperties } from '../../../../style';
import { AlignedText } from '../../../common/AlignedText';
import { Block } from '../../../common/Block';
import { Tooltip } from '../../../common/Tooltip';
import { View } from '../../../common/View';
import { useFormat } from '../../../spreadsheet/useFormat';
import { RolloverCellValue } from '../RolloverComponents';

type TotalsListProps = {
  prevMonthName: string;
  style?: CSSProperties;
};
export function TotalsList({ prevMonthName, style }: TotalsListProps) {
  const { t } = useTranslation();

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
        <Tooltip
          style={{ ...styles.tooltip, lineHeight: 1.5, padding: '6px 10px' }}
          content={
            <>
              <AlignedText
                left={t('Income:')}
                right={
                  <RolloverCellValue
                    binding={rolloverBudget.totalIncome}
                    type="financial"
                    privacyFilter={false}
                  />
                }
              />
              <AlignedText
                left={t('From Last Month:')}
                right={
                  <RolloverCellValue
                    binding={rolloverBudget.fromLastMonth}
                    type="financial"
                    privacyFilter={false}
                  />
                }
              />
            </>
          }
          placement="bottom end"
        >
          <RolloverCellValue
            binding={rolloverBudget.incomeAvailable}
            type="financial"
            style={{ fontWeight: 600 }}
          />
        </Tooltip>

        <RolloverCellValue
          binding={rolloverBudget.lastMonthOverspent}
          type="financial"
          formatter={value => {
            const v = format(value, 'financial');
            return value > 0 ? '+' + v : value === 0 ? '-' + v : v;
          }}
          style={{ fontWeight: 600, ...styles.tnum }}
        />

        <RolloverCellValue
          binding={rolloverBudget.totalBudgeted}
          type="financial"
          formatter={value => {
            const v = format(value, 'financial');
            return value > 0 ? '+' + v : value === 0 ? '-' + v : v;
          }}
          style={{ fontWeight: 600, ...styles.tnum }}
        />

        <RolloverCellValue
          binding={rolloverBudget.forNextMonth}
          type="financial"
          formatter={value => {
            const n = parseInt(value) || 0;
            const v = format(Math.abs(n), 'financial');
            return n >= 0 ? '-' + v : '+' + v;
          }}
          style={{ fontWeight: 600, ...styles.tnum }}
        />
      </View>

      <View>
        <Block>
          <Trans>Available Funds</Trans>
        </Block>
        <Block>
          <Trans>Overspent in {prevMonthName}</Trans>
        </Block>
        <Block>
          <Trans>Budgeted</Trans>
        </Block>
        <Block>
          <Trans>For Next Month</Trans>
        </Block>
      </View>
    </View>
  );
}
