import React, {
  type CSSProperties,
  useCallback,
  useRef,
  useState,
} from 'react';

import { Popover } from '@actual-app/components/popover';
import { View } from '@actual-app/components/view';

import { ToBudgetAmount } from './ToBudgetAmount';
import { ToBudgetMenu } from './ToBudgetMenu';

import { CoverMenu } from '@desktop-client/components/budget/envelope/CoverMenu';
import { useEnvelopeSheetValue } from '@desktop-client/components/budget/envelope/EnvelopeBudgetComponents';
import { HoldMenu } from '@desktop-client/components/budget/envelope/HoldMenu';
import { TransferMenu } from '@desktop-client/components/budget/envelope/TransferMenu';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type ToBudgetProps = {
  month: string;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  prevMonthName: string;
  style?: CSSProperties;
  amountStyle?: CSSProperties;
  isCollapsed?: boolean;
};
export function ToBudget({
  month,
  prevMonthName,
  onBudgetAction,
  style,
  amountStyle,
  isCollapsed = false,
}: ToBudgetProps) {
  const [menuStep, _setMenuStep] = useState<string>('actions');
  const triggerRef = useRef(null);
  const format = useFormat();

  const ref = useRef<HTMLSpanElement>(null);
  const setMenuStep = useCallback(
    (menu: string) => {
      if (menu) ref.current?.focus();
      _setMenuStep(menu);
    },
    [ref, _setMenuStep],
  );
  const availableValue = useEnvelopeSheetValue({
    name: envelopeBudget.toBudget,
    value: 0,
  });
  if (typeof availableValue !== 'number' && availableValue !== null) {
    throw new Error(
      'Expected availableValue to be a number but got ' + availableValue,
    );
  }

  const {
    setMenuOpen,
    menuOpen,
    handleContextMenu,
    resetPosition,
    position,
    asContextMenu,
  } = useContextMenu();

  return (
    <>
      <View ref={triggerRef}>
        <ToBudgetAmount
          onClick={() => {
            resetPosition();
            setMenuOpen(true);
          }}
          prevMonthName={prevMonthName}
          style={style}
          amountStyle={amountStyle}
          isTotalsListTooltipDisabled={!isCollapsed || menuOpen}
          onContextMenu={handleContextMenu}
        />
      </View>

      <Popover
        triggerRef={triggerRef}
        placement={asContextMenu ? 'bottom start' : 'bottom'}
        isOpen={menuOpen}
        onOpenChange={() => {
          setMenuStep('actions');
          setMenuOpen(false);
        }}
        style={{ width: 200, margin: 1 }}
        isNonModal
        {...position}
      >
        <span tabIndex={-1} ref={ref}>
          {menuStep === 'actions' && (
            <ToBudgetMenu
              onTransfer={() => setMenuStep('transfer')}
              onCover={() => setMenuStep('cover')}
              onHoldBuffer={() => setMenuStep('buffer')}
              onResetHoldBuffer={() => {
                onBudgetAction(month, 'reset-hold');
                setMenuOpen(false);
              }}
              month={month}
              onBudgetAction={onBudgetAction}
            />
          )}
          {menuStep === 'buffer' && (
            <HoldMenu
              onClose={() => setMenuOpen(false)}
              onSubmit={amount => {
                onBudgetAction(month, 'hold', { amount });
              }}
            />
          )}
          {menuStep === 'transfer' && (
            <TransferMenu
              initialAmount={availableValue}
              onClose={() => setMenuOpen(false)}
              onSubmit={(amount, categoryId) => {
                onBudgetAction(month, 'transfer-available', {
                  amount,
                  category: categoryId,
                });
              }}
            />
          )}
          {menuStep === 'cover' && (
            <CoverMenu
              showToBeBudgeted={false}
              initialAmount={availableValue}
              onClose={() => setMenuOpen(false)}
              onSubmit={(amount, categoryId) => {
                onBudgetAction(month, 'cover-overbudgeted', {
                  category: categoryId,
                  amount,
                  currencyCode: format.currency.code,
                });
              }}
            />
          )}
        </span>
      </Popover>
    </>
  );
}
