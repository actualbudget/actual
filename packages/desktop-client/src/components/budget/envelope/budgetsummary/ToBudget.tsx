import React, {
  type CSSProperties,
  useCallback,
  useRef,
  useState,
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
    [ref, _setMenuOpen],
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
  const isMenuOpen = Boolean(menuOpen);
  const contextMenusEnabled = useFeatureFlag('contextMenus');

  const [crossOffset, setCrossOffset] = useState(0);
  const [offset, setOffset] = useState(0);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  return (
    <>
      <View ref={triggerRef}>
        <ToBudgetAmount
          onClick={() => {
            setOffset(0);
            setCrossOffset(0);
            setContextMenuOpen(false);
            setMenuOpen('actions');
          }}
          prevMonthName={prevMonthName}
          style={style}
          amountStyle={amountStyle}
          isTotalsListTooltipDisabled={!isCollapsed || isMenuOpen}
          onContextMenu={e => {
            if (!contextMenusEnabled) return;
            e.preventDefault();
            setMenuOpen('actions');
            const rect = e.currentTarget.getBoundingClientRect();
            setCrossOffset(e.clientX - rect.left);
            setOffset(e.clientY - rect.bottom);
            setContextMenuOpen(true);
          }}
        />
      </View>

      <Popover
        triggerRef={triggerRef}
        placement={contextMenuOpen ? 'bottom start' : 'bottom'}
        isOpen={isMenuOpen}
        onOpenChange={() => setMenuOpen(null)}
        style={{ width: 200, margin: 1 }}
        isNonModal
        crossOffset={crossOffset}
        offset={offset}
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
