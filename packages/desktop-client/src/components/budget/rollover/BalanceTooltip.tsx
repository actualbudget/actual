import React, { useState } from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { Tooltip } from '../../tooltips';

import { BalanceMenu } from './BalanceMenu';
import { CoverTooltip } from './CoverTooltip';
import { TransferTooltip } from './TransferTooltip';

type BalanceTooltipProps = {
  categoryId: string;
  tooltip: { close: () => void };
  monthIndex: number;
  onBudgetAction: (idx: number, action: string, arg?: unknown) => void;
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
  const catBalance = useSheetValue(rolloverBudget.catBalance(categoryId));
  const [menu, setMenu] = useState('menu');

  const _onClose = () => {
    tooltip.close();
    onClose?.();
  };

  return (
    <>
      {menu === 'menu' && (
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
              onBudgetAction(monthIndex, 'carryover', {
                category: categoryId,
                flag: carryover,
              });
              _onClose();
            }}
            onTransfer={() => setMenu('transfer')}
            onCover={() => setMenu('cover')}
          />
        </Tooltip>
      )}

      {menu === 'transfer' && (
        <TransferTooltip
          initialAmount={catBalance}
          showToBeBudgeted={true}
          onClose={_onClose}
          onSubmit={(amount, toCategoryId) => {
            onBudgetAction(monthIndex, 'transfer-category', {
              amount,
              from: categoryId,
              to: toCategoryId,
            });
          }}
        />
      )}

      {menu === 'cover' && (
        <CoverTooltip
          onClose={_onClose}
          onSubmit={fromCategoryId => {
            onBudgetAction(monthIndex, 'cover', {
              to: categoryId,
              from: fromCategoryId,
            });
          }}
        />
      )}
    </>
  );
}
