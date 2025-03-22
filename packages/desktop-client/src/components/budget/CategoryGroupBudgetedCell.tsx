import React, { type ComponentPropsWithoutRef } from 'react';
import { Cell as ReactAriaCell } from 'react-aria-components';

import { envelopeBudget, trackingBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';
import type { CategoryGroupEntity } from 'loot-core/types/models';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import type { SheetNames } from '../spreadsheet';
import { CellValue, CellValueText } from '../spreadsheet/CellValue';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

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
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
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
      </NamespaceContext.Provider>
    </ReactAriaCell>
  );
}
