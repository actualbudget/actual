import React, { useState, type ComponentPropsWithoutRef } from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { type CSSProperties } from '../../../../style';
import { useSheetValue } from '../../../spreadsheet/useSheetValue';
import { Tooltip } from '../../../tooltips';
import { HoldTooltip } from '../HoldTooltip';
import { TransferTooltip } from '../TransferTooltip';

import { ToBudgetAmount } from './ToBudgetAmount';
import { ToBudgetMenu } from './ToBudgetMenu';

type ToBudgetProps = {
  month: string;
  onBudgetAction: (idx: string, action: string, arg?: unknown) => void;
  prevMonthName: string;
  showTotalsTooltipOnHover?: boolean;
  style?: CSSProperties;
  amountStyle?: CSSProperties;
  menuTooltipProps?: ComponentPropsWithoutRef<typeof Tooltip>;
  totalsTooltipProps?: ComponentPropsWithoutRef<typeof Tooltip>;
  holdTooltipProps?: ComponentPropsWithoutRef<typeof HoldTooltip>;
  transferTooltipProps?: ComponentPropsWithoutRef<typeof TransferTooltip>;
};
export function ToBudget({
  month,
  prevMonthName,
  showTotalsTooltipOnHover,
  onBudgetAction,
  style,
  amountStyle,
  menuTooltipProps,
  totalsTooltipProps,
  holdTooltipProps,
  transferTooltipProps,
}: ToBudgetProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const sheetValue = useSheetValue({
    name: rolloverBudget.toBudget,
    value: 0,
  });
  const availableValue = parseInt(sheetValue);

  return (
    <>
      <ToBudgetAmount
        onClick={() => setMenuOpen('actions')}
        prevMonthName={prevMonthName}
        showTotalsTooltipOnHover={showTotalsTooltipOnHover}
        totalsTooltipProps={totalsTooltipProps}
        style={style}
        amountStyle={amountStyle}
      />
      {menuOpen === 'actions' && (
        <Tooltip
          position="bottom-center"
          width={200}
          style={{ padding: 0 }}
          onClose={() => setMenuOpen(null)}
          {...menuTooltipProps}
        >
          <ToBudgetMenu
            onTransfer={() => setMenuOpen('transfer')}
            onHoldBuffer={() => setMenuOpen('buffer')}
            onResetHoldBuffer={() => {
              onBudgetAction(month, 'reset-hold');
              setMenuOpen(null);
            }}
          />
        </Tooltip>
      )}
      {menuOpen === 'buffer' && (
        <HoldTooltip
          onClose={() => setMenuOpen(null)}
          onSubmit={amount => {
            onBudgetAction(month, 'hold', { amount });
          }}
          {...holdTooltipProps}
        />
      )}
      {menuOpen === 'transfer' && (
        <TransferTooltip
          initialAmount={availableValue}
          onClose={() => setMenuOpen(null)}
          onSubmit={(amount, category) => {
            onBudgetAction(month, 'transfer-available', {
              amount,
              category,
            });
          }}
          {...transferTooltipProps}
        />
      )}
    </>
  );
}
