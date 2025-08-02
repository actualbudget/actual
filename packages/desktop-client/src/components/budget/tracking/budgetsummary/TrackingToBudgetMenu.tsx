import React from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import { styles } from '@actual-app/components/styles';

type TrackingToBudgetMenuProps = {
  onTransfer: () => void;
  onCover: () => void;
  onHoldBuffer: () => void;
  onResetHoldBuffer: () => void;
  month: string;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
};

export function TrackingToBudgetMenu({
  onTransfer,
  onCover,
  onHoldBuffer,
  onResetHoldBuffer,
  month,
  onBudgetAction,
}: TrackingToBudgetMenuProps) {
  const { t } = useTranslation();

  const onMenuSelect = (name: string) => {
    switch (name) {
      case 'transfer':
        onTransfer();
        break;
      case 'cover':
        onCover();
        break;
      case 'hold':
        onHoldBuffer();
        break;
      case 'reset-hold':
        onResetHoldBuffer();
        break;
      default:
        throw new Error(`Unrecognized menu item: ${name}`);
    }
  };

  return (
    <Menu
      onMenuSelect={onMenuSelect}
      getItemStyle={() => ({
        ...styles.menuItem,
        fontSize: 14,
      })}
      items={[
        {
          name: 'transfer',
          text: t('Transfer to another category'),
        },
        {
          name: 'cover',
          text: t('Cover overspending'),
        },
        {
          name: 'hold',
          text: t('Hold for next month'),
        },
        {
          name: 'reset-hold',
          text: t('Reset hold'),
        },
      ]}
    />
  );
} 