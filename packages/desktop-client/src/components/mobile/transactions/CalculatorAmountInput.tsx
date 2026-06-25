import React, {
  memo,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { CSSProperties, FocusEvent, ReactNode, RefObject } from 'react';

import { defaultInputClassName } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { evalArithmetic } from '@actual-app/core/shared/arithmetic';
import { isIOS } from '@actual-app/core/shared/platform';
import { amountToCurrency } from '@actual-app/core/shared/util';
import { css, cx } from '@emotion/css';

import { makeAmountFullStyle } from '#components/budget/util';

import { CalculatorKeyboard } from './CalculatorKeyboard';

export const calculatorAmountLargeStyle = {
  ...styles.veryLargeText,
  backgroundColor: 'transparent',
  border: 0,
  borderBottom: '1px solid',
  borderBottomColor: theme.formInputBorder,
  display: 'block',
  fieldSizing: 'content',
  minWidth: '80px',
  maxWidth: '100%',
  outline: 0,
  padding: 0,
  textAlign: 'center',
};

export const calculatorAmountNormalStyle = {
  boxShadow: 'none',
  fontSize: 14,
  outline: 0,
  height: styles.mobileMinHeight,
};

export type CalculatorAmountInputProps = {
  value: number;
  variant?: 'normal' | 'large';
  negate?: boolean;
  style?: CSSProperties;
  inputRef?: RefObject<HTMLInputElement | null>;
  keyboardHeader?: ReactNode;
  onEnter?: () => void;
  onChange?: (value: number) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  autoFocusDelay?: number;
  autoFocusIndirect?: boolean;
  disabled?: boolean;
};

const placeholderClassName = css({
  '&[data-focused]::placeholder': {
    color: 'transparent',
  },
  '::placeholder': { color: theme.pageTextSubdued },
});

export const CalculatorAmountInput = memo(function CalculatorAmountInput({
  value,
  style,
  onChange,
  onFocus,
  onBlur,
  negate = false,
  autoFocus = false,
  autoFocusDelay,
  autoFocusIndirect = false,
  onEnter,
  variant = 'normal',
  keyboardHeader,
  ...props
}: CalculatorAmountInputProps) {
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = props.inputRef ?? internalInputRef;
  const [iosInitialInteraction, setIosInitialInteraction] = useState(
    isIOS ? !(autoFocusIndirect && value === 0) : true,
  );

  const [liveValue, setLiveValue] = useState(() => value);
  const [expression, setExpression] = useState(() => formatAmount(liveValue));
  const valueIsNegative = () =>
    isNegativeAmount(negate && value === 0 ? -value : value);
  const isNegative = useRef(valueIsNegative());

  const blurRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const isKeepingFocusRef = useRef(false);
  const keepFocusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const keepFocus = useCallback(() => {
    isKeepingFocusRef.current = true;
    if (keepFocusTimeoutRef.current) {
      clearTimeout(keepFocusTimeoutRef.current);
    }
    keepFocusTimeoutRef.current = setTimeout(() => {
      inputRef.current?.focus();
      isKeepingFocusRef.current = false;
    }, 200);
  }, [inputRef]);
  const stopKeepFocus = useCallback(() => {
    isKeepingFocusRef.current = false;
    if (keepFocusTimeoutRef.current) {
      clearTimeout(keepFocusTimeoutRef.current);
    }
  }, []);

  const onInputFocus = useCallback(() => {
    if (isKeepingFocusRef.current) {
      return;
    }

    if (negate && isNegative.current) {
      setExpression(formatAmount(-value));
    }
    setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      input.setSelectionRange(input.value.length, input.value.length);
    }, 0);

    setFocused(true);
  }, [inputRef, setExpression, negate, isNegative, value, setFocused]);

  const onInputBlur = useCallback(() => {
    if (isKeepingFocusRef.current) {
      inputRef.current?.focus();
      return false;
    }

    setFocused(false);
    setExpression(formatAmount(liveValue));
    if (value === liveValue) {
      return true;
    }
    onChange?.(liveValue);
    return true;
  }, [setExpression, value, liveValue, onChange, inputRef]);

  const onChangeAmount = useCallback(
    (amount: number) => {
      setLiveValue(amount);
      setExpression(formatAmount(negate ? Math.abs(amount) : amount));
    },
    [setExpression, setLiveValue, negate],
  );

  const onChangeExpression = useCallback(
    (text: string) => {
      setIosInitialInteraction(true);

      setExpression(text);
      const amount = text.trim() === '' ? 0 : evalArithmetic(text);
      if (amount === null) {
        return;
      }
      setLiveValue(negate && isNegative.current ? -amount : amount);
    },
    [setExpression, setLiveValue, setIosInitialInteraction, negate, isNegative],
  );

  const valueRef = useRef(value);
  if (value !== valueRef.current) {
    valueRef.current = value;
    isNegative.current = valueIsNegative();
    setLiveValue(value);
    setExpression(formatAmount(value));
  }

  useLayoutEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [inputRef, autoFocus]);

  return (
    <>
      <div ref={blurRef} tabIndex={-1} />
      <input
        ref={inputRef}
        data-testid="amount-input"
        type="text"
        value={expression}
        placeholder="0.00"
        onChange={e => onChangeExpression(e.target.value)}
        onFocus={e => {
          onInputFocus();
          onFocus?.(e);
        }}
        onBlur={e => {
          if (onInputBlur()) {
            onBlur?.(e);
          }
        }}
        inputMode="none"
        autoCapitalize="none"
        className={cx(
          variant === 'normal' && defaultInputClassName,
          placeholderClassName,
        )}
        style={{
          ...makeAmountFullStyle(liveValue, {
            positiveColor: theme.numberPositive,
            negativeColor: theme.numberNegative,
            zeroColor: theme.pageTextSubdued,
          }),
          scrollMarginTop: 100,
          ...(variant === 'large'
            ? calculatorAmountLargeStyle
            : calculatorAmountNormalStyle),
          ...style,
        }}
        disabled={props.disabled}
        {...{
          ...(focused &&
            iosInitialInteraction && {
              'data-focused': true,
            }),
          ...(props.disabled && {
            'data-disabled': true,
          }),
        }}
      />

      <CalculatorKeyboard
        inputRef={inputRef}
        header={keyboardHeader}
        isOpen={focused}
        initialTransitionDelay={autoFocusDelay}
        onInteractionStart={keepFocus}
        onEquals={() => {
          onChangeAmount(liveValue);
          if (negate) {
            isNegative.current = isNegativeAmount(liveValue);
          }
        }}
        onClear={() => {
          onChangeExpression('');
        }}
        onToggleSign={() => {
          isNegative.current = !isNegative.current;
          onChangeAmount(-liveValue);
        }}
        onReset={() => {
          onChangeAmount(value);
          isNegative.current = valueIsNegative();
        }}
        onDismiss={() => {
          stopKeepFocus();
          setLiveValue(value);
          isNegative.current = valueIsNegative();
          setTimeout(() => {
            blurRef.current?.focus();
          }, 0);
        }}
        onApply={() => {
          stopKeepFocus();
          blurRef.current?.focus();
          onEnter?.();
        }}
      />
    </>
  );
});

function formatAmount(value: number) {
  return value === 0 ? '' : amountToCurrency(value);
}

function isNegativeAmount(value: number) {
  return value < 0 || Object.is(value, -0);
}
