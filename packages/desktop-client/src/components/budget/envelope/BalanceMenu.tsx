import React, {
  type ComponentPropsWithoutRef,
  useCallback,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';

import { envelopeBudget } from 'loot-core/client/queries';

import { CoverMenu } from './CoverMenu';
import { useEnvelopeSheetValue } from './EnvelopeBudgetComponents';
import { TransferMenu } from './TransferMenu';

type BalanceMenuProps = BalanceMovementMenuProps & {
  month: string;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onClose?: () => void;
};

export function BalanceMenu({
  categoryId,
  month,
  onCarryover,
  onTransfer,
  onCover,
  onBudgetAction,
  onClose = () => {},
  ...props
}: BalanceMenuProps) {
  const catBalance =
    useEnvelopeSheetValue(envelopeBudget.catBalance(categoryId)) ?? 0;

  const [menu, _setMenu] = useState('menu');

  const ref = useRef<HTMLSpanElement>(null);
  // Keep focus inside the popover on menu change
  const setMenu = useCallback(
    (menu: string) => {
      ref.current?.focus();
      _setMenu(menu);
    },
    [ref],
  );

  return (
    <span tabIndex={-1} ref={ref}>
      {menu === 'menu' && (
        <BalanceMovementMenu
          categoryId={categoryId}
          onCarryover={carryover => {
            if (onCarryover) {
              onCarryover(carryover);
              return;
            }

            onBudgetAction(month, 'carryover', {
              category: categoryId,
              flag: carryover,
            });
            onClose();
          }}
          onTransfer={() => {
            if (onTransfer) {
              onTransfer();
              return;
            }

            setMenu('transfer');
          }}
          onCover={() => {
            if (onCover) {
              onCover();
              return;
            }

            setMenu('cover');
          }}
          {...props}
        />
      )}

      {menu === 'transfer' && (
        <TransferMenu
          categoryId={categoryId}
          initialAmount={catBalance}
          showToBeBudgeted={true}
          onClose={onClose}
          onSubmit={(amount, toCategoryId) => {
            onBudgetAction(month, 'transfer-category', {
              amount,
              from: categoryId,
              to: toCategoryId,
            });
          }}
        />
      )}

      {menu === 'cover' && (
        <CoverMenu
          categoryId={categoryId}
          onClose={onClose}
          onSubmit={fromCategoryId => {
            onBudgetAction(month, 'cover-overspending', {
              to: categoryId,
              from: fromCategoryId,
            });
          }}
        />
      )}
    </span>
  );
}

type BalanceMovementMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  categoryId: string;
  onTransfer: () => void;
  onCarryover: (carryOver: boolean) => void;
  onCover: () => void;
};

export function BalanceMovementMenu({
  categoryId,
  onTransfer,
  onCarryover,
  onCover,
  ...props
}: BalanceMovementMenuProps) {
  const { t } = useTranslation();

  const carryover = useEnvelopeSheetValue(
    envelopeBudget.catCarryover(categoryId),
  );
  const balance =
    useEnvelopeSheetValue(envelopeBudget.catBalance(categoryId)) ?? 0;

  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'transfer':
            onTransfer();
            break;
          case 'carryover':
            onCarryover(!carryover);
            break;
          case 'cover':
            onCover();
            break;
          default:
            throw new Error(`Unrecognized menu option: ${name}`);
        }
      }}
      items={[
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
      ]}
    />
  );
}
