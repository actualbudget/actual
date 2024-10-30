import React, {
  useRef,
  useState,
  type CSSProperties,
  useCallback,
} from 'react';

import { envelopeBudget } from 'loot-core/src/client/queries';

import { useFeatureFlag } from '../../../../hooks/useFeatureFlag';
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
  const [menuOpen, _setMenuOpen] = useState<string | null>(null);
  const triggerRef = useRef(null);

  const ref = useRef<HTMLSpanElement>(null);
  const setMenuOpen = useCallback(
    (menu: string | null) => {
      if (menu) ref.current?.focus();
      _setMenuOpen(menu);
    },
    [ref],
  );
  const sheetValue = useEnvelopeSheetValue({
    name: envelopeBudget.toBudget,
    value: 0,
  });
  const availableValue = sheetValue;
  if (typeof availableValue !== 'number' && availableValue !== null) {
    throw new Error(
      'Expected availableValue to be a number but got ' + availableValue,
    );
  }
  const isMenuOpen = Boolean(menuOpen);
  const contextMenusEnabled = useFeatureFlag('contextMenus');

  return (
    <>
      <View ref={triggerRef}>
        <ToBudgetAmount
          onClick={() => setMenuOpen('actions')}
          prevMonthName={prevMonthName}
          style={style}
          amountStyle={amountStyle}
          isTotalsListTooltipDisabled={!isCollapsed || isMenuOpen}
          onContextMenu={e => {
            if (!contextMenusEnabled) return;
            e.preventDefault();
            setMenuOpen('actions');
          }}
        />
      </View>

      <Popover
        triggerRef={triggerRef}
        placement="bottom"
        isOpen={isMenuOpen}
        onOpenChange={() => setMenuOpen(null)}
        style={{ width: 200 }}
        isNonModal
      >
        <span tabIndex={-1} ref={ref}>
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
              initialAmount={availableValue ?? undefined}
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
        </span>
      </Popover>
    </>
  );
}
