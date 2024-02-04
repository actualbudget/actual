// @ts-strict-ignore
import React, { useState } from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { Menu } from '../../common/Menu';
import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { Tooltip } from '../../tooltips';

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
  const carryover = useSheetValue<boolean>(
    rolloverBudget.catCarryover(categoryId),
  );
  const balance = useSheetValue<number>(rolloverBudget.catBalance(categoryId));
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
          <Menu
            onMenuSelect={type => {
              if (type === 'carryover') {
                onBudgetAction(monthIndex, 'carryover', {
                  category: categoryId,
                  flag: !carryover,
                });
                _onClose();
              } else {
                setMenu(type);
              }
            }}
            items={[
              {
                name: 'transfer',
                text: 'Transfer to another category',
              },
              {
                name: 'carryover',
                text: carryover
                  ? 'Remove overspending rollover'
                  : 'Rollover overspending',
              },
              balance < 0 && {
                name: 'cover',
                text: 'Cover overspending',
              },
            ].filter(x => x)}
          />
        </Tooltip>
      )}

      {menu === 'transfer' && (
        <TransferTooltip
          initialAmountName={rolloverBudget.catBalance(categoryId)}
          showToBeBudgeted={true}
          onClose={_onClose}
          onSubmit={(amount, toCategory) => {
            onBudgetAction(monthIndex, 'transfer-category', {
              amount,
              from: categoryId,
              to: toCategory,
            });
          }}
        />
      )}

      {menu === 'cover' && (
        <CoverTooltip
          onClose={_onClose}
          onSubmit={fromCategory => {
            onBudgetAction(monthIndex, 'cover', {
              to: categoryId,
              from: fromCategory,
            });
          }}
        />
      )}
    </>
  );
}
