import { memo, useEffect, useState } from 'react';

import { styles } from '@actual-app/components/styles';
import { amountToInteger, integerToAmount } from '@actual-app/core/shared/util';

import { AmountInput as LegacyAmountInput } from '#components/util/AmountInput';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { CalculatorAmountInput } from './CalculatorAmountInput';
import type { CalculatorAmountInputProps } from './CalculatorAmountInput';

export type SplitAmountInputProps = CalculatorAmountInputProps;

export const SplitAmountInput = memo(function SplitAmountInput({
  autoFocus = false,
  disabled,
  inputRef,
  negate = false,
  onBlur,
  onChange,
  onEnter,
  onFocus,
  value,
  ...props
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
        {...props}
        autoFocus={autoFocus}
        disabled={disabled}
        inputRef={inputRef}
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
          ...props.style,
        }}
        value={value}
      />
    );
  }

  return (
    <LegacyAmountInput
      ref={inputRef}
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
