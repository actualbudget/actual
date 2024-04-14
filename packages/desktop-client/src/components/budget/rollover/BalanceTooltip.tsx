import React, { useState } from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { useSheetValue } from '../../spreadsheet/useSheetValue';

import { BalanceMenu } from './BalanceMenu';
import { CoverTooltip } from './CoverTooltip';
import { TransferTooltip } from './TransferTooltip';

type BalanceTooltipProps = {
  categoryId: string;
  month: string;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onClose?: () => void;
};

export function BalanceTooltip({
  categoryId,
  month,
  onBudgetAction,
  onClose = () => {},
}: BalanceTooltipProps) {
  const catBalance = useSheetValue(rolloverBudget.catBalance(categoryId));
  const [menu, setMenu] = useState('menu');

  return (
    <>
      {menu === 'menu' && (
        <BalanceMenu
          categoryId={categoryId}
          onCarryover={carryover => {
            onBudgetAction(month, 'carryover', {
              category: categoryId,
              flag: carryover,
            });
            onClose();
          }}
          onTransfer={() => setMenu('transfer')}
          onCover={() => setMenu('cover')}
        />
      )}

      {menu === 'transfer' && (
        <TransferTooltip
          initialAmount={catBalance}
          showToBeBudgeted={true}
          onClose={onClose}
          onSubmit={(amount, toCategoryId) => {
            onBudgetAction(month, 'transfer-category', {
              amount,
              from: categoryId,
              to: toCategoryId,
            });
          }}
        />
      )}

      {menu === 'cover' && (
        <CoverTooltip
          onClose={onClose}
          onSubmit={fromCategoryId => {
            onBudgetAction(month, 'cover', {
              to: categoryId,
              from: fromCategoryId,
            });
          }}
        />
      )}
    </>
  );
}
