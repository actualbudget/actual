import React, { type ComponentPropsWithoutRef } from 'react';
import { Cell as ReactAriaCell } from 'react-aria-components';

import { envelopeBudget, trackingBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';
import type { CategoryGroupEntity } from 'loot-core/types/models';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import type { SheetNames } from '../spreadsheet';
import { CellValue, CellValueText } from '../spreadsheet/CellValue';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

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
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
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
      </NamespaceContext.Provider>
    </ReactAriaCell>
  );
}
