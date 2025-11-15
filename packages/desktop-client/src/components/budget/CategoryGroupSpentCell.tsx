import React, { type ComponentPropsWithoutRef } from 'react';
import { Cell as ReactAriaCell } from 'react-aria-components';

import * as monthUtils from 'loot-core/shared/months';
import type { CategoryGroupEntity } from 'loot-core/types/models';

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

type CategoryGroupSpentCellProps = ComponentPropsWithoutRef<
  typeof ReactAriaCell
> & {
  month: string;
  categoryGroup: CategoryGroupEntity;
};

export function CategoryGroupSpentCell({
  month,
  categoryGroup,
  style,
  ...props
}: CategoryGroupSpentCellProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const bindingBudgetType: SheetNames =
    budgetType === 'rollover' ? 'envelope-budget' : 'tracking-budget';

  const groupSpentBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.groupSumAmount(categoryGroup.id)
      : trackingBudget.groupSumAmount(categoryGroup.id);

  return (
    <ReactAriaCell style={{ textAlign: 'right', ...style }} {...props}>
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <CellValue<typeof bindingBudgetType, typeof groupSpentBinding>
          type="financial"
          binding={groupSpentBinding}
        >
          {props => (
            <CellValueText
              {...props}
              style={{
                paddingRight: 5,
              }}
            />
          )}
        </CellValue>
      </SheetNameProvider>
    </ReactAriaCell>
  );
}
