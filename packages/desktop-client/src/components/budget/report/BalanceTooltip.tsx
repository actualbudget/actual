import React from 'react';

import { Tooltip } from '../../tooltips';

import { BalanceMenu } from './BalanceMenu';

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
      <BalanceMenu
        categoryId={categoryId}
        onCarryover={carryover => {
          onBudgetAction?.(monthIndex, 'carryover', {
            category: categoryId,
            flag: !carryover,
          });
        }}
      />
    </Tooltip>
  );
}
