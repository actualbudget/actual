import React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import type { MenuItemObject } from '@actual-app/components/menu';

import { envelopeBudget } from '#spreadsheet/bindings';

import { useEnvelopeSheetValue } from './EnvelopeBudgetComponents';

export type BalanceMenuActions = {
  categoryId: string;
  onTransfer?: () => void;
  onCarryover?: (carryOver: boolean) => void;
  onCover?: () => void;
};

export function useBalanceMenu({
  categoryId,
  onTransfer,
  onCarryover,
  onCover,
}: BalanceMenuActions) {
  const { t } = useTranslation();

  const carryover = useEnvelopeSheetValue(
    envelopeBudget.catCarryover(categoryId),
  );
  const balance =
    useEnvelopeSheetValue(envelopeBudget.catBalance(categoryId)) ?? 0;

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
  ...props
}: BalanceMenuProps) {
  const { items, onMenuSelect } = useBalanceMenu({
    categoryId,
    onTransfer,
    onCarryover,
    onCover,
  });

  return <Menu {...props} onMenuSelect={onMenuSelect} items={items} />;
}
