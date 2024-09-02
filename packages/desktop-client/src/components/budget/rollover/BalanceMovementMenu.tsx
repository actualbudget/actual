import React, { useCallback, useMemo, useState } from 'react';

import { runQuery } from 'loot-core/client/query-helpers';
import { send } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';
import { rolloverBudget } from 'loot-core/src/client/queries';
import * as monthUtils from 'loot-core/src/shared/months';
import { groupById, integerToCurrency } from 'loot-core/src/shared/util';
import { type CategoryEntity } from 'loot-core/types/models';
import { type WithRequired } from 'loot-core/types/util';

import { useCategories } from '../../../hooks/useCategories';

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

  const { addBudgetTransferNotes } = useBudgetTransferNotes({ month });

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
            addBudgetTransferNotes({
              fromCategoryId: categoryId,
              toCategoryId,
              amount,
            });
          }}
        />
      )}

      {menu === 'cover' && (
        <CoverMenu
          category={categoryId}
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

const useBudgetTransferNotes = ({ month }: { month: string }) => {
  const { list: categories } = useCategories();
  const categoriesById = useMemo(() => {
    return groupById(categories as WithRequired<CategoryEntity, 'id'>[]);
  }, [categories]);

  const getNotes = async (id: string) => {
    const { data: notes } = await runQuery(
      q('notes').filter({ id }).select('note'),
    );
    return (notes && notes[0]?.note) ?? '';
  };

  const addNewLine = (notes?: string) => `${notes}${notes && '\n'}`;

  const addBudgetTransferNotes = useCallback(
    async ({
      fromCategoryId,
      toCategoryId,
      amount,
    }: {
      fromCategoryId: Required<CategoryEntity['id']>;
      toCategoryId: Required<CategoryEntity['id']>;
      amount: number;
    }) => {
      const displayAmount = integerToCurrency(amount);

      const monthBudgetNotesId = `budget-${month}`;
      const existingMonthBudgetNotes = addNewLine(
        await getNotes(monthBudgetNotesId),
      );

      const displayDay = monthUtils.format(monthUtils.currentDate(), 'MMMM dd');
      const fromCategoryName = categoriesById[fromCategoryId || ''].name;
      const toCategoryName = categoriesById[toCategoryId || ''].name;

      await send('notes-save', {
        id: monthBudgetNotesId,
        note: `${existingMonthBudgetNotes}- Reassigned ${displayAmount} from ${fromCategoryName} to ${toCategoryName} on ${displayDay}`,
      });
    },
    [categoriesById, month],
  );

  return { addBudgetTransferNotes };
};
