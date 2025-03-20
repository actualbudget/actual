import React, { type ComponentPropsWithoutRef, useRef } from 'react';
import { usePress, useFocusable } from 'react-aria';
import { Cell as ReactAriaCell } from 'react-aria-components';

import { css } from '@emotion/css';
import * as monthUtils from 'loot-core/shared/months';
import type { CategoryEntity } from 'loot-core/types/models';

import { makeAmountGrey } from './util';

import {
  CellValue,
  CellValueText,
} from '@desktop-client/components/spreadsheet/CellValue';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';

type CategorySpentCellProps = ComponentPropsWithoutRef<typeof ReactAriaCell> & {
  month: string;
  category: CategoryEntity;
  onShowActivity: (category: CategoryEntity, month: string) => void;
};

export function CategorySpentCell({
  month,
  category,
  onShowActivity,
  style,
  ...props
}: CategorySpentCellProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  const categorySpentBinding =
    budgetType === 'rollover'
      ? envelopeBudget.catSumAmount(category.id)
      : trackingBudget.catSumAmount(category.id);

  const { pressProps } = usePress({
    onPress: () => onShowActivity(category, month),
  });

  const textRef = useRef<HTMLSpanElement | null>(null);
  const { focusableProps } = useFocusable(
    {
      onKeyUp: e => {
        if (e.key === 'Enter') {
          onShowActivity(category, month);
        }
      },
    },
    textRef,
  );

  return (
    <ReactAriaCell style={{ textAlign: 'right', ...style }} {...props}>
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <CellValue<'envelope-budget', 'sum-amount'>
          type="financial"
          binding={categorySpentBinding}
        >
          {props => (
            <CellValueText
              innerRef={textRef}
              {...pressProps}
              {...focusableProps}
              {...props}
              className={css({
                ...makeAmountGrey(props.value),
                '&:hover': {
                  cursor: 'pointer',
                  textDecoration: 'underline',
                },
                paddingRight: 5,
              })}
            />
          )}
        </CellValue>
      </SheetNameProvider>
    </ReactAriaCell>
  );
}
