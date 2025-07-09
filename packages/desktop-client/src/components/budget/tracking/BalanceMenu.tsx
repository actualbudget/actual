import React, { type ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';

import { useTrackingSheetValue } from './TrackingBudgetComponents';

import { trackingBudget } from '@desktop-client/spreadsheet/bindings';

type BalanceMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  categoryId: string;
  onCarryover: (carryover: boolean) => void;
};

export function BalanceMenu({
  categoryId,
  onCarryover,
  ...props
}: BalanceMenuProps) {
  const { t } = useTranslation();
  const carryover = useTrackingSheetValue(
    trackingBudget.catCarryover(categoryId),
  );
  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'carryover':
            onCarryover?.(!carryover);
            break;
          default:
            throw new Error(`Unrecognized menu option: ${name}`);
        }
      }}
      items={[
        {
          name: 'carryover',
          text: carryover
            ? t('Remove overspending rollover')
            : t('Rollover overspending'),
        },
      ]}
    />
  );
}
