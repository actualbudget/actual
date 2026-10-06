import React from 'react';
import { Trans } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { EnvelopeCellValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { CellValueText } from '#components/spreadsheet/CellValue';
import { useFormat } from '#hooks/useFormat';
import { envelopeBudget } from '#spreadsheet/bindings';

import { makeSignedFormatter } from './TotalsList';

const valueStyle = { ...styles.tnum, fontWeight: 600, textAlign: 'right' };

type TotalsDetailsProps = {
  prevMonthName: string;
};

/**
 * The same figures as `TotalsList`, in the same order so the signed values
 * still add up to To Budget, laid out as label–value rows that fit under the
 * compact summary card's header row.
 */
export function TotalsDetails({ prevMonthName }: TotalsDetailsProps) {
  const format = useFormat();
  const signedFormatter = makeSignedFormatter(format);
  const invertedSignedFormatter = makeSignedFormatter(format, true);

  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        columnGap: 10,
        lineHeight: 1.4,
        ...styles.smallText,
      }}
    >
      <Text>
        <Trans>Available funds</Trans>
      </Text>
      <Tooltip
        style={{ ...styles.tooltip, lineHeight: 1.5, padding: '6px 10px' }}
        content={
          <>
            <AlignedText
              left="Income:"
              right={
                <EnvelopeCellValue
                  binding={envelopeBudget.totalIncome}
                  type="financial"
                />
              }
            />
            <AlignedText
              left="From Last Month:"
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
          {props => <CellValueText {...props} style={valueStyle} />}
        </EnvelopeCellValue>
      </Tooltip>

      <Text>
        <Trans>Overspent in {{ prevMonthName }}</Trans>
      </Text>
      <EnvelopeCellValue
        binding={envelopeBudget.lastMonthOverspent}
        type="financial"
      >
        {props => (
          <CellValueText
            {...props}
            style={valueStyle}
            formatter={signedFormatter}
          />
        )}
      </EnvelopeCellValue>

      <Text>
        <Trans>Budgeted</Trans>
      </Text>
      <EnvelopeCellValue
        binding={envelopeBudget.totalBudgeted}
        type="financial"
      >
        {props => (
          <CellValueText
            {...props}
            style={valueStyle}
            formatter={signedFormatter}
          />
        )}
      </EnvelopeCellValue>

      <Text>
        <Trans>For next month</Trans>
      </Text>
      <EnvelopeCellValue binding={envelopeBudget.forNextMonth} type="financial">
        {props => (
          <CellValueText
            {...props}
            style={valueStyle}
            formatter={invertedSignedFormatter}
          />
        )}
      </EnvelopeCellValue>
    </View>
  );
}
