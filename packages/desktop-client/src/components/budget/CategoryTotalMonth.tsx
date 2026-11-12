import React from 'react';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { css } from '@emotion/css';

import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import { Field } from '#components/table';
import { useApproximateLineTotal } from '#hooks/useCategoryCurrencies';
import type { Binding } from '#spreadsheet';

import { makeAmountGrey, makeBalanceAmountStyle } from './util';

type TotalColumn = 'budgeted' | 'spent' | 'balance';

type TotalBindings = {
  budgeted: Binding<'envelope-budget' | 'tracking-budget', 'budget-total'>;
  spent: Binding<'envelope-budget' | 'tracking-budget', 'sum-amount-total'>;
  balance: Binding<'envelope-budget' | 'tracking-budget', 'leftover-total'>;
};

type CategoryTotalMonthProps = {
  categoryId: string;
  month: string;
  // The columns of the category's month, in order
  columns: readonly TotalColumn[];
  // Without them, the month is left empty: a currency line before its
  // first month
  bindings?: Partial<TotalBindings>;
  onShowActivity?: () => void;
};

// The total of a category budgeted in several currencies, in the default
// currency. It is only shown: each currency is budgeted on its own line.
export function CategoryTotalMonth({
  categoryId,
  month,
  columns,
  bindings,
  onShowActivity,
}: CategoryTotalMonthProps) {
  const { formatter, title } = useApproximateLineTotal(categoryId, month);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetCurrentMonth
          : theme.budgetOtherMonth,
      }}
    >
      {columns.map((column, index) => {
        const binding = bindings?.[column];
        return (
          <Field
            key={column}
            name={column}
            width="flex"
            style={{
              textAlign: 'right',
              ...(index === columns.length - 1 && {
                paddingRight: styles.monthRightPadding,
              }),
            }}
          >
            {binding && (
              <View onClick={column === 'spent' ? onShowActivity : undefined}>
                <CellValue<
                  'envelope-budget' | 'tracking-budget',
                  'budget-total' | 'sum-amount-total' | 'leftover-total'
                >
                  binding={binding}
                  type="financial"
                >
                  {props => (
                    <CellValueText
                      {...props}
                      formatter={formatter}
                      title={title}
                      className={css({
                        ...styles.tnum,
                        ...(column === 'balance'
                          ? makeBalanceAmountStyle(props.value)
                          : makeAmountGrey(props.value)),
                        ...(column === 'spent' && {
                          cursor: 'pointer',
                          ':hover': { textDecoration: 'underline' },
                        }),
                      })}
                    />
                  )}
                </CellValue>
              </View>
            )}
          </Field>
        );
      })}
    </View>
  );
}
