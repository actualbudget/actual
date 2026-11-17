import React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import type { MenuItemObject } from '@actual-app/components/menu';

import { useEnvelopeSheetValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { envelopeBudget } from '#spreadsheet/bindings';

export type ToBudgetMenuActions = {
  onTransfer: () => void;
  onCover: () => void;
  onHoldBuffer: () => void;
  onResetHoldBuffer: () => void;
  onBudgetAction?: (month: string, action: string, arg?: unknown) => void;
  month: string;
};

export function useToBudgetMenu({
  onTransfer,
  onCover,
  onHoldBuffer,
  onResetHoldBuffer,
  onBudgetAction,
  month,
}: ToBudgetMenuActions) {
  const { t } = useTranslation();

  const toBudget = useEnvelopeSheetValue(envelopeBudget.toBudget) ?? 0;
  const forNextMonth = useEnvelopeSheetValue(envelopeBudget.forNextMonth) ?? 0;
  const manualBuffered =
    useEnvelopeSheetValue(envelopeBudget.manualBuffered) ?? 0;
  const autoBuffered = useEnvelopeSheetValue(envelopeBudget.autoBuffered) ?? 0;

  const availableItems: MenuItemObject<string>[] = [
    ...(toBudget > 0
      ? [
          {
            name: 'transfer',
            text: t('Move to a category'),
          },
        ]
      : []),
    ...(autoBuffered === 0 && toBudget > 0
      ? [
          {
            name: 'buffer',
            text: t('Hold for next month'),
          },
        ]
      : []),
    ...(toBudget < 0
      ? [
          {
            name: 'cover',
            text: t('Cover from a category'),
          },
        ]
      : []),
    ...(forNextMonth > 0 && manualBuffered === 0
      ? [
          {
            name: 'disable-auto-buffer',
            text: t('Disable current auto hold'),
          },
        ]
      : []),
    ...(forNextMonth > 0 && manualBuffered !== 0
      ? [
          {
            name: 'reset-buffer',
            text: t("Reset next month's buffer"),
          },
        ]
      : []),
  ];

  const items: MenuItemObject<string>[] =
    availableItems.length > 0
      ? availableItems
      : [
          {
            name: 'none',
            text: t('No actions available'),
            disabled: true,
          },
        ];

  const onMenuSelect = (name: string) => {
    switch (name) {
      case 'transfer':
        onTransfer?.();
        break;
      case 'cover':
        onCover?.();
        break;
      case 'buffer':
        onHoldBuffer?.();
        onBudgetAction?.(month, 'reset-income-carryover', {});
        break;
      case 'reset-buffer':
        onResetHoldBuffer?.();
        break;
      case 'disable-auto-buffer':
        onBudgetAction?.(month, 'reset-income-carryover', {});
        break;
      default:
        throw new Error(`Unrecognized menu option: ${name}`);
    }
  };

  return { items, onMenuSelect };
}

type ToBudgetMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> &
  ToBudgetMenuActions;

export function ToBudgetMenu({
  onTransfer,
  onCover,
  onHoldBuffer,
  onResetHoldBuffer,
  onBudgetAction,
  month,
  ...props
}: ToBudgetMenuProps) {
  const { items, onMenuSelect } = useToBudgetMenu({
    onTransfer,
    onCover,
    onHoldBuffer,
    onResetHoldBuffer,
    onBudgetAction,
    month,
  });

  return <Menu {...props} onMenuSelect={onMenuSelect} items={items} />;
}
