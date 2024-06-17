import React, { useRef, useState } from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { type CSSProperties } from '../../../../style';
import { Popover } from '../../../common/Popover';
import { View } from '../../../common/View';
import { useSheetValue } from '../../../spreadsheet/useSheetValue';
import { CoverMenu } from '../CoverMenu';
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
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const triggerRef = useRef(null);
  const sheetValue = useSheetValue({
    name: rolloverBudget.toBudget,
    value: 0,
  });
  const availableValue = parseInt(sheetValue);
  const isMenuOpen = Boolean(menuOpen);

  return (
    <>
      <View ref={triggerRef}>
        <ToBudgetAmount
          onClick={() => setMenuOpen('actions')}
          prevMonthName={prevMonthName}
          style={style}
          amountStyle={amountStyle}
          isTotalsListTooltipDisabled={!isCollapsed || isMenuOpen}
        />
      </View>

      <Popover
        triggerRef={triggerRef}
        placement="bottom"
        isOpen={isMenuOpen}
        onOpenChange={() => setMenuOpen(null)}
        style={{ width: 200 }}
      >
        {menuOpen === 'actions' && (
          <ToBudgetMenu
            onTransfer={() => setMenuOpen('transfer')}
            onCover={() => setMenuOpen('cover')}
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
            onSubmit={(amount, categoryId) => {
              onBudgetAction(month, 'transfer-available', {
                amount,
                category: categoryId,
              });
            }}
          />
        )}
        {menuOpen === 'cover' && (
          <CoverMenu
            showToBeBudgeted={false}
            onClose={() => setMenuOpen(null)}
            onSubmit={categoryId => {
              onBudgetAction(month, 'cover-overbudgeted', {
                category: categoryId,
              });
            }}
          />
        )}
      </Popover>
    </>
  );
}
