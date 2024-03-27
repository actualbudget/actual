import React, { type ComponentPropsWithoutRef } from 'react';

import { Menu } from '../../../common/Menu';

type ToBudgetMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onTransfer: () => void;
  onHoldBuffer: () => void;
  onResetHoldBuffer: () => void;
};
export function ToBudgetMenu({
  onTransfer,
  onHoldBuffer,
  onResetHoldBuffer,
  ...props
}: ToBudgetMenuProps) {
  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'transfer':
            onTransfer?.();
            break;
          case 'buffer':
            onHoldBuffer?.();
            break;
          case 'reset-buffer':
            onResetHoldBuffer?.();
            break;
          default:
            throw new Error(`Unsupported item: ${name}`);
        }
      }}
      items={[
        {
          name: 'transfer',
          text: 'Move to a category',
        },
        {
          name: 'buffer',
          text: 'Hold for next month',
        },
        {
          name: 'reset-buffer',
          text: 'Reset next month’s buffer',
        },
      ]}
    />
  );
}
