import React, { type ComponentPropsWithoutRef, useRef } from 'react';
import { usePress, useFocusable } from 'react-aria';
import { Cell as ReactAriaCell } from 'react-aria-components';

import { css } from '@emotion/css';

import { envelopeBudget, trackingBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';
import type { CategoryEntity } from 'loot-core/types/models';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import { CellValue, CellValueText } from '../spreadsheet/CellValue';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

import { makeAmountGrey } from './util';

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
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
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
      </NamespaceContext.Provider>
    </ReactAriaCell>
  );
}
