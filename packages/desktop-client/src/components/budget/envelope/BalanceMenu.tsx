import React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import type { MenuItemObject } from '@actual-app/components/menu';
import type { IntegerAmount } from '@actual-app/core/shared/util';

import { getGoalDifference } from '#components/budget/util';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useFormat } from '#hooks/useFormat';
import { envelopeBudget } from '#spreadsheet/bindings';

import { useEnvelopeSheetValue } from './EnvelopeBudgetComponents';

export type BalanceMenuActions = {
  categoryId: string;
  onTransfer?: () => void;
  onCarryover?: (carryOver: boolean) => void;
  onCover?: () => void;
  onFundGoal?: (amount: IntegerAmount) => void;
};

export function useBalanceMenu({
  categoryId,
  onTransfer,
  onCarryover,
  onCover,
  onFundGoal,
}: BalanceMenuActions) {
  const { t } = useTranslation();
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const format = useFormat();

  const carryover = useEnvelopeSheetValue(
    envelopeBudget.catCarryover(categoryId),
  );
  const balance =
    useEnvelopeSheetValue(envelopeBudget.catBalance(categoryId)) ?? 0;
  const goal = useEnvelopeSheetValue(envelopeBudget.catGoal(categoryId));
  const longGoal = useEnvelopeSheetValue(
    envelopeBudget.catLongGoal(categoryId),
  );
  const budgeted =
    useEnvelopeSheetValue(envelopeBudget.catBudgeted(categoryId)) ?? 0;
  const toBudget = useEnvelopeSheetValue(envelopeBudget.toBudget) ?? 0;

  const fundAmount =
    isGoalTemplatesEnabled &&
    onFundGoal &&
    goal != null &&
    longGoal !== 1 &&
    getGoalDifference(budgeted, goal, format.currency.decimalPlaces) < 0
      ? Math.min(goal - budgeted, toBudget)
      : 0;

  const onMenuSelect = (name: string) => {
    switch (name) {
      case 'transfer':
        onTransfer?.();
        break;
      case 'carryover':
        onCarryover?.(!carryover);
        break;
      case 'cover':
        onCover?.();
        break;
      case 'fund-goal':
        onFundGoal?.(fundAmount);
        break;
      default:
        throw new Error(`Unrecognized menu option: ${name}`);
    }
  };

  const items: MenuItemObject<string>[] = [
    ...(balance > 0
      ? [
          {
            name: 'transfer',
            text: t('Transfer to another category'),
          },
        ]
      : []),
    ...(balance < 0
      ? [
          {
            name: 'cover',
            text: t('Cover overspending'),
          },
        ]
      : []),
    ...(fundAmount > 0
      ? [
          {
            name: 'fund-goal',
            text: t('Fund goal from To Budget'),
          },
        ]
      : []),
    {
      name: 'carryover',
      text: carryover
        ? t('Remove overspending rollover')
        : t('Rollover overspending'),
    },
  ];

  return { items, onMenuSelect };
}

type BalanceMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> &
  BalanceMenuActions;

export function BalanceMenu({
  categoryId,
  onTransfer,
  onCarryover,
  onCover,
  onFundGoal,
  ...props
}: BalanceMenuProps) {
  const { items, onMenuSelect } = useBalanceMenu({
    categoryId,
    onTransfer,
    onCarryover,
    onCover,
    onFundGoal,
  });

  return <Menu {...props} onMenuSelect={onMenuSelect} items={items} />;
}
