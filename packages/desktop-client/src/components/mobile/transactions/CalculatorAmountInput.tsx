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
import { useFormat } from '#hooks/useFormat';
import { useSyncedPref } from '#hooks/useSyncedPref';

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

  const format = useFormat();
  const [hideFraction] = useSyncedPref('hideFraction');
  const autoDecimals =
    String(hideFraction) !== 'true' && format.currency.decimalPlaces !== 0;

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
    (rawText: string, caret?: number | null) => {
      setIosInitialInteraction(true);

      let text = rawText;
      if (autoDecimals) {
        const result = applyAutoDecimals(
          rawText,
          caret ?? rawText.length,
          rawText.length < expression.length,
        );
        text = result.text;
        // Write the reformatted text straight to the input so the caret can
        // be placed now; React then finds nothing left to update. A plain
        // assignment, not the keypad's native setter: React has to record it.
        const input = inputRef.current;
        if (input && text !== rawText) {
          input.value = text;
          input.setSelectionRange(result.caret, result.caret);
        }
      }

      setExpression(text);
      const amount = text.trim() === '' ? 0 : evalArithmetic(text);
      if (amount === null) {
        return;
      }
      setLiveValue(negate && isNegative.current ? -amount : amount);
    },
    [
      setExpression,
      setLiveValue,
      setIosInitialInteraction,
      negate,
      isNegative,
      autoDecimals,
      expression,
      inputRef,
    ],
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
        onChange={e =>
          onChangeExpression(e.target.value, e.target.selectionEnd)
        }
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

// A number runs up to the nearest operator or parenthesis on either side
const NUMBER_BEFORE = /[^-+*/^()]*$/;
const NUMBER_END = /[-+*/^()]|$/;

// Typed digits fill in from the cents, like the amount input this replaces:
// 1, 2, 3 reads 1.23. Only the number at the caret is reformatted.
// ponytail: a number right after * or / is left as typed, so "* 2" doubles
// instead of multiplying by 0.02. A factor anywhere else ("2 * 1.50",
// "1.50 * (2") still needs the 2 typed as 200.
function applyAutoDecimals(text: string, caret: number, isDeleting: boolean) {
  const start = text.slice(0, caret).search(NUMBER_BEFORE);
  const end = caret + text.slice(caret).search(NUMBER_END);
  // A minus right after * or / is the factor's sign, not a subtraction
  const previousChar =
    text[start - 1] === '-' ? text[start - 2] : text[start - 1];
  if (previousChar === '*' || previousChar === '/') {
    return { text, caret };
  }

  const digits = text.slice(start, end).replace(/\D/g, '');
  const cents = Number(digits);
  // Deleting the last digit clears the number rather than leaving "0.00"
  const formatted =
    digits === '' || (isDeleting && cents === 0)
      ? ''
      : amountToCurrency(cents / 100);

  const digitsAfterCaret = text.slice(caret, end).replace(/\D/g, '').length;
  let offset = formatted.length;
  let seen = 0;
  while (offset > 0 && seen < digitsAfterCaret) {
    offset--;
    if (/\d/.test(formatted[offset])) seen++;
  }
  // Keep the caret against the digit before it, so backspace removes that
  // digit rather than a separator that would only be put back
  while (offset > 0 && /\D/.test(formatted[offset - 1])) {
    offset--;
  }

  return {
    text: text.slice(0, start) + formatted + text.slice(end),
    caret: start + offset,
  };
}

function formatAmount(value: number) {
  return value === 0 ? '' : amountToCurrency(value);
}

function isNegativeAmount(value: number) {
  return value < 0 || Object.is(value, -0);
}
