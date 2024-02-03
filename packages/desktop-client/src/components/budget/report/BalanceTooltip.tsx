import React from 'react';

import { reportBudget } from 'loot-core/src/client/queries';

import { Menu } from '../../common/Menu';
import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { Tooltip } from '../../tooltips';

type BalanceTooltipProps = {
  categoryId: string;
  tooltip: { close: () => void };
  monthIndex: number;
  onBudgetAction: (idx: number, action: string, arg: unknown) => void;
  onClose?: () => void;
};

export function BalanceTooltip({
  categoryId,
  tooltip,
  monthIndex,
  onBudgetAction,
  onClose,
  ...tooltipProps
}: BalanceTooltipProps) {
  const carryover = useSheetValue(reportBudget.catCarryover(categoryId));

  const _onClose = () => {
    tooltip.close();
    onClose?.();
  };

  return (
    <Tooltip
      position="bottom-right"
      width={200}
      style={{ padding: 0 }}
      onClose={_onClose}
      {...tooltipProps}
    >
      <Menu
        onMenuSelect={() => {
          onBudgetAction(monthIndex, 'carryover', {
            category: categoryId,
            flag: !carryover,
          });
          _onClose();
        }}
        items={[
          {
            name: 'carryover',
            text: carryover
              ? 'Remove overspending rollover'
              : 'Rollover overspending',
          },
        ]}
      />
    </Tooltip>
  );
}
