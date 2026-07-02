import React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';

import { useEnvelopeSheetValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { useFutureBufferMode } from '#hooks/useFutureBufferMode';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import { envelopeBudget } from '#spreadsheet/bindings';

type ToBudgetMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onTransfer: () => void;
  onCover: () => void;
  onHoldBuffer: () => void;
  onResetHoldBuffer: () => void;
  onBudgetAction?: (month: string, action: string, arg?: unknown) => void;
  month: string;
};

export function ToBudgetMenu({
  onTransfer,
  onCover,
  onHoldBuffer,
  onResetHoldBuffer,
  onBudgetAction,
  month,
  ...props
}: ToBudgetMenuProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const {
    isFutureBufferModeAvailable,
    isAutomaticFutureBufferMode,
    isCurrentOrFutureMonth,
  } = useFutureBufferMode();

  // While future buffer mode is active, manual hold/reset controls are
  // hidden for the current and future months because future buffer mode
  // controls those buffers. They remain available for past months.
  const hideManualControls =
    isAutomaticFutureBufferMode && isCurrentOrFutureMonth(month);

  const toBudget = useEnvelopeSheetValue(envelopeBudget.toBudget) ?? 0;
  const forNextMonth = useEnvelopeSheetValue(envelopeBudget.forNextMonth) ?? 0;
  const manualBuffered =
    useEnvelopeSheetValue(envelopeBudget.manualBuffered) ?? 0;
  const autoBuffered = useEnvelopeSheetValue(envelopeBudget.autoBuffered) ?? 0;
  const items = [
    ...(toBudget > 0
      ? [
          {
            name: 'transfer',
            text: t('Move to a category'),
          },
        ]
      : []),
    ...(!hideManualControls && autoBuffered === 0 && toBudget > 0
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
    ...(!hideManualControls && forNextMonth > 0 && manualBuffered === 0
      ? [
          {
            name: 'disable-auto-buffer',
            text: t('Disable current auto hold'),
          },
        ]
      : []),
    ...(!hideManualControls && forNextMonth > 0 && manualBuffered !== 0
      ? [
          {
            name: 'reset-buffer',
            text: t("Reset next month's buffer"),
          },
        ]
      : []),
    ...(isFutureBufferModeAvailable
      ? [
          {
            name: 'future-buffer-mode',
            text: t('Change future buffer mode'),
          },
        ]
      : []),
  ];

  return (
    <Menu
      {...props}
      onMenuSelect={name => {
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
          case 'future-buffer-mode':
            dispatch(
              pushModal({
                modal: {
                  name: 'future-buffer-mode',
                },
              }),
            );
            break;
          default:
            throw new Error(`Unrecognized menu option: ${name}`);
        }
      }}
      items={
        items.length > 0
          ? items
          : [
              {
                name: 'none',
                text: t('No actions available'),
                disabled: true,
              },
            ]
      }
    />
  );
}
