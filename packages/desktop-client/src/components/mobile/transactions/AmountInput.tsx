import { memo, useEffect, useState } from 'react';
import type { FocusEvent } from 'react';

import { styles } from '@actual-app/components/styles';
import * as Platform from '@actual-app/core/shared/platform';

import { useFeatureFlag } from '#hooks/useFeatureFlag';

import { CalculatorAmountInput } from './CalculatorAmountInput';
import type { CalculatorAmountInputProps } from './CalculatorAmountInput';
import { FocusableAmountInput } from './FocusableAmountInput';

export type AmountInputProps = Omit<CalculatorAmountInputProps, 'onFocus'> & {
  disableNativeAutoFocusOnIOS?: boolean;
  onFocus?: (event?: FocusEvent<HTMLInputElement>) => void;
};

export const AmountInput = memo(function AmountInput({
  autoFocus = false,
  disableNativeAutoFocusOnIOS = false,
  disabled,
  inputRef,
  negate = false,
  onBlur,
  onChange,
  onEnter,
  onFocus,
  value,
  variant = 'normal',
  ...props
}: AmountInputProps) {
  const mobileCalculatorEnabled = useFeatureFlag('mobileCalculator');
  const fallbackAutoFocus =
    autoFocus && !(disableNativeAutoFocusOnIOS && Platform.isIOSAgent);
  const [focused, setFocused] = useState(fallbackAutoFocus);

  useEffect(() => {
    if (fallbackAutoFocus) {
      setFocused(true);
    }
  }, [fallbackAutoFocus]);

  if (mobileCalculatorEnabled) {
    return (
      <CalculatorAmountInput
        {...props}
        autoFocus={autoFocus}
        autoFocusIndirect={disableNativeAutoFocusOnIOS}
        disabled={disabled}
        inputRef={inputRef}
        negate={negate}
        onBlur={onBlur}
        onChange={onChange}
        onEnter={onEnter}
        onFocus={onFocus}
        value={value}
        variant={variant}
      />
    );
  }

  return (
    <FocusableAmountInput
      {...props}
      disabled={disabled}
      focused={focused}
      inputRef={inputRef}
      onBlur={event => {
        setFocused(false);
        onBlur?.(event);
      }}
      onEnter={() => onEnter?.()}
      onFocus={event => {
        setFocused(true);
        onFocus?.(event);
      }}
      onUpdateAmount={onChange}
      sign={value === 0 ? undefined : value < 0 ? '-' : '+'}
      focusedStyle={
        variant === 'large'
          ? {
              width: 'auto',
              padding: '5px',
              paddingLeft: '20px',
              paddingRight: '20px',
              minWidth: '100%',
            }
          : undefined
      }
      style={props.style}
      textStyle={
        variant === 'large'
          ? { ...styles.veryLargeText, textAlign: 'center' }
          : undefined
      }
      value={value}
      zeroSign={negate ? '-' : '+'}
    />
  );
});
