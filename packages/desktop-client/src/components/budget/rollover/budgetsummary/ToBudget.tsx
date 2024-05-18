import React, { useRef, useState } from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { type CSSProperties } from '../../../../style';
import { Popover } from '../../../common/Popover';
import { View } from '../../../common/View';
import { useSheetValue } from '../../../spreadsheet/useSheetValue';
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
};
export function ToBudget({
  month,
  prevMonthName,
  onBudgetAction,
  style,
  amountStyle,
}: ToBudgetProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const triggerRef = useRef(null);
  const sheetValue = useSheetValue({
    name: rolloverBudget.toBudget,
    value: 0,
  });
  const availableValue = parseInt(sheetValue);

  return (
    <>
      <View ref={triggerRef}>
        <ToBudgetAmount
          onClick={() => setMenuOpen('actions')}
          prevMonthName={prevMonthName}
          style={style}
          amountStyle={amountStyle}
        />
      </View>

      <Popover
        triggerRef={triggerRef}
        placement="bottom"
        isOpen={!!menuOpen}
        onOpenChange={() => setMenuOpen(null)}
        style={{ width: 200 }}
      >
        {menuOpen === 'actions' && (
          <ToBudgetMenu
            onTransfer={() => setMenuOpen('transfer')}
            onHoldBuffer={() => setMenuOpen('buffer')}
            onResetHoldBuffer={() => {
              onBudgetAction(month, 'reset-hold');
              setMenuOpen(null);
            }}
          />
        )}
        {menuOpen === 'buffer' && (
          <HoldMenu
            onClose={() => setMenuOpen(null)}
            onSubmit={amount => {
              onBudgetAction(month, 'hold', { amount });
            }}
          />
        )}
        {menuOpen === 'transfer' && (
          <TransferMenu
            initialAmount={availableValue}
            onClose={() => setMenuOpen(null)}
            onSubmit={(amount, category) => {
              onBudgetAction(month, 'transfer-available', {
                amount,
                category,
              });
            }}
          />
        )}
      </Popover>
    </>
  );
}
