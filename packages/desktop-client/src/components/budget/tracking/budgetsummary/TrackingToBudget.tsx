import React, {
  type CSSProperties,
  useCallback,
  useRef,
  useState,
} from 'react';

import { Popover } from '@actual-app/components/popover';
import { View } from '@actual-app/components/view';

import { TrackingToBudgetAmount } from './TrackingToBudgetAmount';
import { TrackingToBudgetMenu } from './TrackingToBudgetMenu';
import { TrackingHoldMenu } from '@desktop-client/components/budget/tracking/TrackingHoldMenu';
import { TrackingTransferMenu } from '@desktop-client/components/budget/tracking/TrackingTransferMenu';
import { TrackingCoverMenu } from '@desktop-client/components/budget/tracking/TrackingCoverMenu';

import { useTrackingSheetValue } from '@desktop-client/components/budget/tracking/TrackingBudgetComponents';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import { trackingBudget } from '@desktop-client/spreadsheet/bindings';

type TrackingToBudgetProps = {
  month: string;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  prevMonthName: string;
  style?: CSSProperties;
  amountStyle?: CSSProperties;
  isCollapsed?: boolean;
};

export function TrackingToBudget({
  month,
  prevMonthName,
  onBudgetAction,
  style,
  amountStyle,
  isCollapsed = false,
}: TrackingToBudgetProps) {
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
  
  const availableValue = useTrackingSheetValue({
    name: trackingBudget.toBudget,
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
        <TrackingToBudgetAmount
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
            <TrackingToBudgetMenu
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
            <TrackingHoldMenu
              onClose={() => setMenuOpen(false)}
              onSubmit={amount => {
                onBudgetAction(month, 'hold', { amount });
              }}
            />
          )}
          {menuStep === 'transfer' && (
            <TrackingTransferMenu
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
            <TrackingCoverMenu
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