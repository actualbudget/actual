import React, { useCallback, useRef, useState } from 'react';

import { BalanceMenu } from './BalanceMenu';
import { CoverMenu } from './CoverMenu';
import { useEnvelopeSheetValue } from './EnvelopeBudgetComponents';
import { TransferMenu } from './TransferMenu';

import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

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
  const catBalance =
    useEnvelopeSheetValue(envelopeBudget.catBalance(categoryId)) ?? 0;

  const [menu, _setMenu] = useState('menu');

  const ref = useRef<HTMLSpanElement>(null);
  // Keep focus inside the popover on menu change
  const setMenu = useCallback(
    (menu: string) => {
      ref.current?.focus();
      _setMenu(menu);
    },
    [ref],
  );

  return (
    <span tabIndex={-1} ref={ref}>
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
          categoryId={categoryId}
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
          categoryId={categoryId}
          onClose={onClose}
          onSubmit={fromCategoryId => {
            onBudgetAction(month, 'cover-overspending', {
              to: categoryId,
              from: fromCategoryId,
            });
          }}
        />
      )}
    </span>
  );
}
