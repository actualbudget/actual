import React, { type ComponentPropsWithoutRef } from 'react';
import { Cell as ReactAriaCell } from 'react-aria-components';

import * as monthUtils from 'loot-core/shared/months';
import type { CategoryGroupEntity } from 'loot-core/types/models';

import {
  CellValue,
  CellValueText,
} from '@desktop-client/components/spreadsheet/CellValue';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { SheetNames } from '@desktop-client/spreadsheet';
import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';

type CategoryGroupBudgetedCellProps = ComponentPropsWithoutRef<
  typeof ReactAriaCell
> & {
  month: string;
  categoryGroup: CategoryGroupEntity;
};

export function CategoryGroupBudgetedCell({
  month,
  categoryGroup,
  style,
  ...props
}: CategoryGroupBudgetedCellProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const bindingBudgetType: SheetNames =
    budgetType === 'rollover' ? 'envelope-budget' : 'tracking-budget';

  const groupBudgetedBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.groupBudgeted(categoryGroup.id)
      : trackingBudget.groupBudgeted(categoryGroup.id);

  return (
    <ReactAriaCell style={{ textAlign: 'right', ...style }} {...props}>
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <CellValue<typeof bindingBudgetType, typeof groupBudgetedBinding>
          type="financial"
          binding={groupBudgetedBinding}
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
