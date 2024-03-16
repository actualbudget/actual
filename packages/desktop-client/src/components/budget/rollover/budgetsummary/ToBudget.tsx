import React, { useState, type ComponentPropsWithoutRef } from 'react';

import { css } from 'glamor';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { theme, styles, type CSSProperties } from '../../../../style';
import { Block } from '../../../common/Block';
import { HoverTarget } from '../../../common/HoverTarget';
import { Menu } from '../../../common/Menu';
import { View } from '../../../common/View';
import { PrivacyFilter } from '../../../PrivacyFilter';
import { useFormat } from '../../../spreadsheet/useFormat';
import { useSheetName } from '../../../spreadsheet/useSheetName';
import { useSheetValue } from '../../../spreadsheet/useSheetValue';
import { Tooltip } from '../../../tooltips';
import { HoldTooltip } from '../HoldTooltip';
import { TransferTooltip } from '../TransferTooltip';

import { TotalsList } from './TotalsList';

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
  const sheetName = useSheetName(rolloverBudget.toBudget);
  const sheetValue = useSheetValue({
    name: rolloverBudget.toBudget,
    value: 0,
  });
  const format = useFormat();
  const availableValue = parseInt(sheetValue);
  const num = isNaN(availableValue) ? 0 : availableValue;
  const isNegative = num < 0;

  return (
    <View style={{ alignItems: 'center', ...style }}>
      <Block>{isNegative ? 'Overbudgeted:' : 'To Budget:'}</Block>
      <View>
        <HoverTarget
          disabled={!showTotalsTooltipOnHover || !!menuOpen}
          renderContent={() => (
            <Tooltip position="bottom-center" {...totalsTooltipProps}>
              <TotalsList
                prevMonthName={prevMonthName}
                style={{
                  padding: 7,
                }}
              />
            </Tooltip>
          )}
        >
          <PrivacyFilter blurIntensity={7}>
            <Block
              onClick={() => setMenuOpen('actions')}
              data-cellname={sheetName}
              className={`${css([
                styles.veryLargeText,
                {
                  fontWeight: 400,
                  userSelect: 'none',
                  cursor: 'pointer',
                  color: isNegative ? theme.errorText : theme.pageTextPositive,
                  marginBottom: -1,
                  borderBottom: '1px solid transparent',
                  ':hover': {
                    borderColor: isNegative
                      ? theme.errorBorder
                      : theme.pageTextPositive,
                  },
                },
                amountStyle,
              ])}`}
            >
              {format(num, 'financial')}
            </Block>
          </PrivacyFilter>
        </HoverTarget>
        {menuOpen === 'actions' && (
          <Tooltip
            position="bottom-center"
            width={200}
            style={{ padding: 0 }}
            onClose={() => setMenuOpen(null)}
            {...menuTooltipProps}
          >
            <Menu
              onMenuSelect={type => {
                if (type === 'reset-buffer') {
                  onBudgetAction(month, 'reset-hold');
                  setMenuOpen(null);
                } else {
                  setMenuOpen(type);
                }
              }}
              items={[
                {
                  name: 'transfer',
                  text: 'Move to a category',
                },
                {
                  name: 'buffer',
                  text: 'Hold for next month',
                },
                {
                  name: 'reset-buffer',
                  text: 'Reset next month’s buffer',
                },
              ]}
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
      </View>
    </View>
  );
}
