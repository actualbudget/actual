import React, { type ComponentPropsWithoutRef } from 'react';
import { Cell as ReactAriaCell } from 'react-aria-components';

import * as monthUtils from 'loot-core/shared/months';
import type { CategoryGroupEntity } from 'loot-core/types/models';

import { balanceColumnPaddingStyle } from './BudgetCategoriesV2';

import {
  CellValue,
  CellValueText,
} from '@desktop-client/components/spreadsheet/CellValue';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { type SheetNames } from '@desktop-client/spreadsheet';
import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';

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
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
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
      </SheetNameProvider>
    </ReactAriaCell>
  );
}
