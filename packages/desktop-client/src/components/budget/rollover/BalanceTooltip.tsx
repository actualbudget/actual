import React, { useState } from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';

import Menu from '../../common/Menu';
import useSheetValue from '../../spreadsheet/useSheetValue';
import { Tooltip } from '../../tooltips';

import CoverTooltip from './CoverTooltip';
import TransferTooltip from './TransferTooltip';

type BalanceTooltipProps = {
  categoryId: string;
  tooltip: { close: () => void };
  monthIndex: number;
  onBudgetAction: (idx: number, action: string, arg?: unknown) => void;
};
export default function BalanceTooltip({
  categoryId,
  tooltip,
  monthIndex,
  onBudgetAction,
  ...tooltipProps
}: BalanceTooltipProps) {
  let carryover = useSheetValue(rolloverBudget.catCarryover(categoryId));
  let balance = useSheetValue(rolloverBudget.catBalance(categoryId));
  let [menu, setMenu] = useState('menu');

  return (
    <>
      {menu === 'menu' && (
        <Tooltip
          position="bottom-right"
          width={200}
          style={{ padding: 0 }}
          onClose={tooltip.close}
          {...tooltipProps}
        >
          <Menu
            onMenuSelect={type => {
              if (type === 'carryover') {
                onBudgetAction(monthIndex, 'carryover', {
                  category: categoryId,
                  flag: !carryover,
                });
                tooltip.close();
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
          onClose={tooltip.close}
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
          onClose={tooltip.close}
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
