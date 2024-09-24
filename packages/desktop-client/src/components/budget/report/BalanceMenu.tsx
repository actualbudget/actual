import React, { type ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { reportBudget } from 'loot-core/src/client/queries';

import { Menu } from '../../common/Menu';

import { useReportSheetValue } from './ReportComponents';

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
  const carryover = useReportSheetValue(reportBudget.catCarryover(categoryId));
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
