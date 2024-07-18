import React, { useState } from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { BalanceMenu } from './BalanceMenu';
import { CoverMenu } from './CoverMenu';
import { useRolloverSheetValue } from './RolloverComponents';
import { TransferMenu } from './TransferMenu';

type BalanceMovementMenuProps = {
  categoryId: string;
  month: string;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onClose?: () => void;
};

export function BalanceMovementMenu({
  categoryId,
  month,
  onBudgetAction,
  onClose = () => {},
}: BalanceMovementMenuProps) {
  const catBalance = useRolloverSheetValue(
    rolloverBudget.catBalance(categoryId),
  );
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
            onBudgetAction(month, 'cover-overspending', {
              to: categoryId,
              from: fromCategoryId,
            });
          }}
        />
      )}
    </>
  );
}
