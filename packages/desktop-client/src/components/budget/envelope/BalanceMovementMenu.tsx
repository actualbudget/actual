import React, { useCallback, useRef, useState } from 'react';

import { theme } from '@actual-app/components/theme';

import { GoalStatus } from '#components/budget/GoalStatus';
import { useFormat } from '#hooks/useFormat';
import { envelopeBudget } from '#spreadsheet/bindings';

import { BalanceMenu } from './BalanceMenu';
import { CoverMenu } from './CoverMenu';
import { useEnvelopeSheetValue } from './EnvelopeBudgetComponents';
import { TransferMenu } from './TransferMenu';

type BalanceMovementMenuProps = {
  categoryId: string;
  month: string;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onClose: () => void;
};

export function BalanceMovementMenu({
  categoryId,
  month,
  onBudgetAction,
  onClose,
}: BalanceMovementMenuProps) {
  const format = useFormat();

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
          header={
            <GoalStatus
              balance={envelopeBudget.catBalance(categoryId)}
              goal={envelopeBudget.catGoal(categoryId)}
              budgeted={envelopeBudget.catBudgeted(categoryId)}
              longGoal={envelopeBudget.catLongGoal(categoryId)}
              style={{
                padding: 10,
                borderBottom: '1px solid ' + theme.menuBorder,
              }}
            />
          }
          onCarryover={carryover => {
            onBudgetAction(month, 'carryover', {
              category: categoryId,
              flag: carryover,
            });
            onClose();
          }}
          onTransfer={() => setMenu('transfer')}
          onCover={() => setMenu('cover')}
          onFundGoal={amount => {
            onBudgetAction(month, 'transfer-available', {
              amount,
              category: categoryId,
            });
            onClose();
          }}
        />
      )}

      {menu === 'transfer' && (
        <TransferMenu
          categoryId={categoryId}
          initialAmount={catBalance}
          showToBeBudgeted
          onClose={onClose}
          onSubmit={(amount, toCategoryId) => {
            onBudgetAction(month, 'transfer-category', {
              amount,
              from: categoryId,
              to: toCategoryId,
              currencyCode: format.currency.code,
            });
          }}
        />
      )}

      {menu === 'cover' && (
        <CoverMenu
          categoryId={categoryId}
          initialAmount={catBalance}
          onClose={onClose}
          onSubmit={(amount, fromCategoryId) => {
            onBudgetAction(month, 'cover-overspending', {
              to: categoryId,
              from: fromCategoryId,
              amount,
              currencyCode: format.currency.code,
            });
          }}
        />
      )}
    </span>
  );
}
