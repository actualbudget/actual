import type { CSSProperties, KeyboardEvent, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  useEnvelopeSheetName,
  useEnvelopeSheetValue,
} from '#components/budget/envelope/EnvelopeBudgetComponents';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';
import { usePrivacyMode } from '#hooks/usePrivacyMode';
import { envelopeBudget } from '#spreadsheet/bindings';

import { TotalsList } from './TotalsList';

type ToBudgetAmountProps = {
  month: string;
  prevMonthName: string;
  style?: CSSProperties;
  amountStyle?: CSSProperties;
  onClick?: () => void;
  onContextMenu?: MouseEventHandler;
  isTotalsListTooltipDisabled?: boolean;
};

export function ToBudgetAmount({
  month,
  prevMonthName,
  style,
  amountStyle,
  onClick,
  isTotalsListTooltipDisabled = false,
  onContextMenu,
}: ToBudgetAmountProps) {
  const { t } = useTranslation();
  const sheetName = useEnvelopeSheetName(envelopeBudget.toBudget);
  const sheetValue = useEnvelopeSheetValue({
    name: envelopeBudget.toBudget,
    value: 0,
  });
  const format = useFormat();
  const isPrivacyEnabled = usePrivacyMode();
  const availableValue = sheetValue;
  if (typeof availableValue !== 'number' && availableValue !== null) {
    throw new Error(
      'Expected availableValue to be a number but got ' + availableValue,
    );
  }
  const num = availableValue ?? 0;
  const isNegative = num < 0;
  const isPositive = num > 0;

  return (
    <View style={{ alignItems: 'center', ...style }}>
      <Block>{isNegative ? t('Overbudgeted:') : t('To Budget:')}</Block>
      <View>
        <Tooltip
          content={
            <TotalsList
              month={month}
              interactive={false}
              prevMonthName={prevMonthName}
              style={{
                padding: 7,
              }}
            />
          }
          placement="bottom"
          offset={3}
          triggerProps={{ isDisabled: isTotalsListTooltipDisabled }}
        >
          <PrivacyFilter
            style={{
              textAlign: 'center',
            }}
          >
            <Block
              // Only a clickable amount opens the To Budget menu.
              {...(onClick && {
                role: 'button',
                tabIndex: 0,
                'aria-label': isPrivacyEnabled
                  ? t('To Budget menu')
                  : t('To Budget menu: {{amount}}', {
                      amount: format(num, 'financial'),
                    }),
                'aria-haspopup': 'menu',
                onKeyDown: (event: KeyboardEvent) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onClick();
                  }
                },
              })}
              onClick={onClick}
              onContextMenu={onContextMenu}
              data-cellname={sheetName}
              className={css([
                styles.veryLargeText,
                {
                  fontWeight: 400,
                  userSelect: 'none',
                  cursor: onClick ? 'pointer' : 'default',
                  color: isPositive
                    ? theme.toBudgetPositive
                    : isNegative
                      ? theme.toBudgetNegative
                      : theme.toBudgetZero,
                  marginBottom: -1,
                  borderBottom: '1px solid transparent',
                  ':hover': {
                    borderColor: isPositive
                      ? theme.toBudgetPositive
                      : isNegative
                        ? theme.toBudgetNegative
                        : theme.toBudgetZero,
                  },
                },
                amountStyle,
              ])}
            >
              <FinancialText>{format(num, 'financial')}</FinancialText>
            </Block>
          </PrivacyFilter>
        </Tooltip>
      </View>
    </View>
  );
}
