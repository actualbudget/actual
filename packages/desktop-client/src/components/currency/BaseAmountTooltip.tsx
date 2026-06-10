import type { CSSProperties, ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { integerToCurrency } from '@actual-app/core/shared/util';
import type { IntegerAmount } from '@actual-app/core/shared/util';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';

type CurrencyAmountProps = {
  currency: string;
  amount: IntegerAmount;
};

export function CurrencyAmount({ currency, amount }: CurrencyAmountProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
      <Text
        as="small"
        style={{
          color: theme.pageTextPositive,
          fontSize: 10,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {currency}
      </Text>
      <FinancialText style={{ whiteSpace: 'nowrap' }}>
        <PrivacyFilter activationFilters={[true]}>
          {integerToCurrency(amount)}
        </PrivacyFilter>
      </FinancialText>
    </View>
  );
}

type BaseAmountTooltipProps = CurrencyAmountProps & {
  children: ReactNode;
  nativeCurrency: string;
  nativeAmount: IntegerAmount;
  exchangeRate?: string | null;
  align?: CSSProperties['textAlign'];
  isDisabled?: boolean;
};

function TooltipRow({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 10,
        alignItems: 'baseline',
      }}
    >
      <Text style={{ color: theme.pageTextLight, fontSize: 11 }}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>{children}</View>
    </View>
  );
}

export function BaseAmountTooltip({
  currency,
  amount,
  nativeCurrency,
  nativeAmount,
  exchangeRate,
  align,
  children,
  isDisabled = false,
}: BaseAmountTooltipProps) {
  if (isDisabled) {
    return children;
  }

  const isBaseOnly = nativeCurrency === currency;

  return (
    <Tooltip
      content={
        <View style={{ padding: '4px 2px', gap: 6, minWidth: 170 }}>
          {!isBaseOnly && (
            <TooltipRow label={<Trans>Native</Trans>}>
              <CurrencyAmount currency={nativeCurrency} amount={nativeAmount} />
            </TooltipRow>
          )}
          <TooltipRow label={<Trans>Base</Trans>}>
            <CurrencyAmount currency={currency} amount={amount} />
          </TooltipRow>
          {!isBaseOnly && exchangeRate && (
            <TooltipRow label={<Trans>Rate</Trans>}>
              <Text
                style={{
                  color: theme.pageText,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {exchangeRate}
              </Text>
            </TooltipRow>
          )}
        </View>
      }
      triggerProps={{ delay: 250, closeDelay: 100 }}
      containerStyle={
        align
          ? {
              flex: 1,
              textAlign: align,
            }
          : undefined
      }
      disablePointerEvents
    >
      {children}
    </Tooltip>
  );
}
