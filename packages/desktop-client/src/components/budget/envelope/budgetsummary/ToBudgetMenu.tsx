import React, { type ComponentPropsWithoutRef } from 'react';

import { envelopeBudget } from 'loot-core/client/queries';

import { Menu } from '../../../common/Menu';
import { useEnvelopeSheetValue } from '../EnvelopeBudgetComponents';

type ToBudgetMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onTransfer: () => void;
  onCover: () => void;
  onHoldBuffer: () => void;
  onResetHoldBuffer: () => void;
};
export function ToBudgetMenu({
  onTransfer,
  onCover,
  onHoldBuffer,
  onResetHoldBuffer,
  ...props
}: ToBudgetMenuProps) {
  const toBudget = useEnvelopeSheetValue(envelopeBudget.toBudget) ?? 0;
  const forNextMonth = useEnvelopeSheetValue(envelopeBudget.forNextMonth);
  const items = [
    ...(toBudget > 0
      ? [
          {
            name: 'transfer',
            text: 'Move to a category',
          },
          {
            name: 'buffer',
            text: 'Hold for next month',
          },
        ]
      : []),
    ...(toBudget < 0
      ? [
          {
            name: 'cover',
            text: 'Cover from a category',
          },
        ]
      : []),
    ...(forNextMonth > 0
      ? [
          {
            name: 'reset-buffer',
            text: 'Reset next month’s buffer',
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
                text: 'No actions available',
                disabled: true,
              },
            ]
      }
    />
  );
}
