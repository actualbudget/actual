import React, {
  type CSSProperties,
  useCallback,
  useRef,
  useState,
} from 'react';

import { envelopeBudget } from 'loot-core/src/client/queries';

import { useContextMenu } from '../../../../hooks/useContextMenu';
import { Popover } from '../../../common/Popover';
import { View } from '../../../common/View';
import { CoverMenu } from '../CoverMenu';
import { useEnvelopeSheetValue } from '../EnvelopeBudgetComponents';
import { HoldMenu } from '../HoldMenu';
import { TransferMenu } from '../TransferMenu';

import { ToBudgetAmount } from './ToBudgetAmount';
import { ToBudgetMenu } from './ToBudgetMenu';

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
          isTotalsListTooltipDisabled={!isCollapsed || asContextMenu}
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
              initialAmount={availableValue ?? undefined}
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
              onClose={() => setMenuOpen(false)}
              onSubmit={categoryId => {
                onBudgetAction(month, 'cover-overbudgeted', {
                  category: categoryId,
                });
              }}
            />
          )}
        </span>
      </Popover>
    </>
  );
}
