import type { FocusEvent, ReactNode } from 'react';
import { memo, useEffect, useState } from 'react';

import { styles } from '@actual-app/components/styles';
import { amountToInteger, integerToAmount } from '@actual-app/core/shared/util';

import { AmountInput as LegacyAmountInput } from '#components/util/AmountInput';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { CalculatorAmountInput } from './CalculatorAmountInput';

export type SplitAmountInputProps = {
  value: number;
  negate?: boolean;
  onEnter?: () => void;
  onChange?: (value: number) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  keyboardHeader?: ReactNode;
  autoFocus?: boolean;
  disabled?: boolean;
};

export const SplitAmountInput = memo(function SplitAmountInput({
  autoFocus = false,
  disabled,
  negate = false,
  onBlur,
  onChange,
  onEnter,
  onFocus,
  value,
  keyboardHeader,
}: SplitAmountInputProps) {
  const mobileCalculatorEnabled = useFeatureFlag('mobileCalculator');
  const [hideFraction] = useSyncedPref('hideFraction');
  const [focused, setFocused] = useState(autoFocus);

  useEffect(() => {
    if (autoFocus) {
      setFocused(true);
    }
  }, [autoFocus]);

  if (mobileCalculatorEnabled) {
    return (
      <CalculatorAmountInput
        autoFocus={autoFocus}
        disabled={disabled}
        keyboardHeader={keyboardHeader}
        negate={negate}
        onBlur={onBlur}
        onChange={onChange}
        onEnter={onEnter}
        onFocus={onFocus}
        style={{
          ...styles.smallText,
          marginRight: 8,
          textAlign: 'right',
          minWidth: 0,
        }}
        value={value}
      />
    );
  }

  return (
    <LegacyAmountInput
      autoDecimals={String(hideFraction) !== 'true'}
      disabled={disabled}
      focused={focused}
      inputStyle={{
        ...styles.smallText,
        textAlign: 'right',
        minWidth: 0,
      }}
      onBlur={event => {
        setFocused(false);
        onBlur?.(event);
      }}
      onEnter={() => onEnter?.()}
      onFocus={event => {
        setFocused(true);
        onFocus?.(event);
      }}
      onUpdate={amount => {
        const nextAmount = integerToAmount(amount);
        if (nextAmount !== value) {
          onChange?.(nextAmount);
        }
      }}
      style={{ marginRight: 8 }}
      value={amountToInteger(value)}
      zeroSign={negate ? '-' : '+'}
    />
  );
});
