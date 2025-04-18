import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';

import { envelopeBudget } from 'loot-core/client/queries';

import { useEnvelopeSheetValue } from '../EnvelopeBudgetComponents';

type ToBudgetMenuProps = {
  onTransfer?: () => void;
  onCover?: () => void;
  onHoldBuffer?: () => void;
  onResetHoldBuffer?: () => void;
  //@ts-ignore fix this any
  onBudgetAction?: (month: string, action: string, payload: any) => void;
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

  const toBudget = useEnvelopeSheetValue(envelopeBudget.toBudget) ?? 0;
  const forNextMonth = useEnvelopeSheetValue(envelopeBudget.forNextMonth) ?? 0;
  const buffered = useEnvelopeSheetValue(envelopeBudget.manualBuffered) ?? 0;
  const items = [
    ...(toBudget > 0
      ? [
          {
            name: 'transfer',
            text: t('Move to a category'),
          },
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
    ...(forNextMonth > 0 && buffered === 0
      ? [
          {
            name: 'disable-auto-buffer',
            text: t('Reset hold this month'),
          },
        ]
      : []),
    ...(forNextMonth > 0 && buffered !== 0
      ? [
          {
            name: 'reset-buffer',
            text: t('Reset next month’s buffer'),
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
