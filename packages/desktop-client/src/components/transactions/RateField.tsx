import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgSwap } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { invertRate, parseRate } from '@actual-app/core/shared/exchange-rate';

import { useSyncedPref } from '#hooks/useSyncedPref';

/**
 * The side of a rate the user types. Stored rates are always foreign units
 * per budget unit; the reverse form is inverted before use.
 */
export type RateDirection = 'foreign-per-base' | 'base-per-foreign';

/** The stored rate (foreign units per budget unit) for typed input. */
export function storedRate(input: string, direction: RateDirection): string {
  const typed = parseRate(input.trim());
  return direction === 'foreign-per-base' ? typed : invertRate(typed);
}

/** A stored rate as typed in `direction`, if it can be shown that way. */
export function rateInDirection(
  rate: string,
  direction: RateDirection,
): string | undefined {
  try {
    return direction === 'foreign-per-base' ? rate : invertRate(rate);
  } catch {
    return undefined;
  }
}

type RateFieldProps = {
  name: string;
  currencyCode: string;
  value: string;
  placeholder?: string;
  direction: RateDirection;
  onChange: (value: string, direction: RateDirection) => void;
};

/** A rate typed as `1 X = [rate] Y`, with a switch to swap X and Y. */
export function RateField({
  name,
  currencyCode,
  value,
  placeholder,
  direction,
  onChange,
}: RateFieldProps) {
  const { t } = useTranslation();
  const [budgetCurrency] = useSyncedPref('defaultCurrencyCode');
  const [refused, setRefused] = useState(false);
  const base = budgetCurrency || t('budget currency');
  const [from, to] =
    direction === 'foreign-per-base'
      ? [base, currencyCode]
      : [currencyCode, base];

  function swap() {
    const next =
      direction === 'foreign-per-base'
        ? 'base-per-foreign'
        : 'foreign-per-base';
    // A typed rate swaps only when its reciprocal inverts back to exactly
    // the same rate, so the swap never changes the rate's value.
    let nextValue = value;
    if (value.trim() !== '') {
      try {
        const typed = parseRate(value.trim());
        const inverted = invertRate(typed);
        nextValue = invertRate(inverted) === typed ? inverted : '';
      } catch {
        nextValue = '';
      }
      if (nextValue === '') {
        setRefused(true);
        return;
      }
    }
    setRefused(false);
    onChange(nextValue, next);
  }

  // Laid out like an InlineField row, the formula's left side as its label.
  return (
    <View style={{ margin: '7px 0', width: '100%' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          width: '100%',
        }}
      >
        <Text
          style={{
            width: 75,
            flexShrink: 0,
            textAlign: 'right',
            paddingRight: 4,
            whiteSpace: 'nowrap',
          }}
        >
          <Trans>1 {{ from }} =</Trans>
        </Text>
        <Input
          name={name}
          aria-label={t('Rate in {{to}} per 1 {{from}}', { from, to })}
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChangeValue={next => {
            setRefused(false);
            onChange(next, direction);
          }}
          style={{ flex: 1 }}
        />
        <Text style={{ whiteSpace: 'nowrap' }}>{to}</Text>
        <Button
          variant="bare"
          aria-label={t('Swap rate direction')}
          onPress={swap}
        >
          <SvgSwap width={12} height={12} />
        </Button>
      </View>
      {refused && (
        <Text style={{ color: theme.warningText }}>
          <Trans>
            This rate cannot be swapped without changing it. Enter it in this
            direction.
          </Trans>
        </Text>
      )}
    </View>
  );
}
