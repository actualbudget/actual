import React, { type ComponentPropsWithoutRef } from 'react';
import { Cell as ReactAriaCell } from 'react-aria-components';

import { envelopeBudget, trackingBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';
import type { CategoryGroupEntity } from 'loot-core/types/models';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import type { SheetNames } from '../spreadsheet';
import { CellValue, CellValueText } from '../spreadsheet/CellValue';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

import { balanceColumnPaddingStyle } from './BudgetCategoriesV2';

type CategoryGroupBalanceCellProps = ComponentPropsWithoutRef<
  typeof ReactAriaCell
> & {
  month: string;
  categoryGroup: CategoryGroupEntity;
};

export function CategoryGroupBalanceCell({
  month,
  categoryGroup,
  style,
  ...props
}: CategoryGroupBalanceCellProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const bindingBudgetType: SheetNames =
    budgetType === 'rollover' ? 'envelope-budget' : 'tracking-budget';

  const groupBalanceBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.groupBalance(categoryGroup.id)
      : trackingBudget.groupBalance(categoryGroup.id);

  return (
    <ReactAriaCell style={{ textAlign: 'right', ...style }} {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <CellValue<typeof bindingBudgetType, typeof groupBalanceBinding>
          type="financial"
          binding={groupBalanceBinding}
        >
          {props => (
            <CellValueText
              {...props}
              style={{
                ...balanceColumnPaddingStyle,
              }}
            />
          )}
        </CellValue>
      </NamespaceContext.Provider>
    </ReactAriaCell>
  );
}
