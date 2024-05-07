import React, { useState } from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { useSheetValue } from '../../spreadsheet/useSheetValue';

import { BalanceMenu } from './BalanceMenu';
import { CoverMenu } from './CoverMenu';
import { TransferMenu } from './TransferMenu';

type BalancePopoverContentProps = {
  categoryId: string;
  month: string;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onClose?: () => void;
};

export function BalancePopoverContent({
  categoryId,
  month,
  onBudgetAction,
  onClose = () => {},
}: BalancePopoverContentProps) {
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
        <TransferMenu
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
        <CoverMenu
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
