import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { envelopeBudget } from 'loot-core/src/client/queries';

import { styles, type CSSProperties } from '../../../../style';
import { AlignedText } from '../../../common/AlignedText';
import { Block } from '../../../common/Block';
import { Tooltip } from '../../../common/Tooltip';
import { View } from '../../../common/View';
import { CellValueText } from '../../../spreadsheet/CellValue';
import { useFormat } from '../../../spreadsheet/useFormat';
import { EnvelopeCellValue } from '../EnvelopeBudgetComponents';

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
                  <EnvelopeCellValue
                    binding={envelopeBudget.totalIncome}
                    type="financial"
                  />
                }
              />
              <AlignedText
                left={t('From Last Month:')}
                right={
                  <EnvelopeCellValue
                    binding={envelopeBudget.fromLastMonth}
                    type="financial"
                  />
                }
              />
            </>
          }
          placement="bottom end"
        >
          <EnvelopeCellValue
            binding={envelopeBudget.incomeAvailable}
            type="financial"
          >
            {props => <CellValueText {...props} style={{ fontWeight: 600 }} />}
          </EnvelopeCellValue>
        </Tooltip>

        <EnvelopeCellValue
          binding={envelopeBudget.lastMonthOverspent}
          type="financial"
        >
          {props => (
            <CellValueText
              {...props}
              style={{ fontWeight: 600 }}
              formatter={(value, type) => {
                const v = format(value, type);
                return value > 0 ? '+' + v : value === 0 ? '-' + v : v;
              }}
            />
          )}
        </EnvelopeCellValue>

        <EnvelopeCellValue
          binding={envelopeBudget.totalBudgeted}
          type="financial"
        >
          {props => (
            <CellValueText
              {...props}
              style={{ fontWeight: 600 }}
              formatter={(value, type) => {
                const v = format(value, type);
                return value > 0 ? '+' + v : value === 0 ? '-' + v : v;
              }}
            />
          )}
        </EnvelopeCellValue>

        <EnvelopeCellValue
          binding={envelopeBudget.forNextMonth}
          type="financial"
        >
          {props => (
            <CellValueText
              {...props}
              style={{ fontWeight: 600 }}
              formatter={(value, type) => {
                const v = format(Math.abs(value), type);
                return value >= 0 ? '-' + v : '+' + v;
              }}
            />
          )}
        </EnvelopeCellValue>
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
