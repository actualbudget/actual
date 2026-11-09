import React from 'react';

import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { makeAmountGrey } from '#components/budget/util';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { CellValue } from '#components/spreadsheet/CellValue';
import { useApproximateLineTotal } from '#hooks/useCategoryCurrencies';
import { useFormat } from '#hooks/useFormat';
import type { Binding } from '#spreadsheet';

// A total of a category budgeted in several currencies, in the default
// currency. It is only shown: each currency has its own row.
export function TotalCell({
  categoryId,
  month,
  binding,
  width,
  hidden = false,
}: {
  categoryId: string;
  month: string;
  binding: Binding<
    'envelope-budget' | 'tracking-budget',
    'budget-total' | 'sum-amount-total' | 'leftover-total'
  >;
  width: CSSProperties['width'];
  hidden?: boolean;
}) {
  const format = useFormat();
  const { formatter, title } = useApproximateLineTotal(categoryId, month);
  return (
    <View
      style={{
        ...(hidden && { display: 'none' }),
        width,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 5,
      }}
    >
      <CellValue binding={binding} type="financial">
        {({ type, value }) => (
          <PrivacyFilter>
            <Text
              title={title}
              style={{
                ...styles.tnum,
                fontSize: 12,
                fontWeight: 600,
                ...makeAmountGrey(value),
              }}
            >
              {formatter ? formatter(value, type) : format(value, type)}
            </Text>
          </PrivacyFilter>
        )}
      </CellValue>
    </View>
  );
}
