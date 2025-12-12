// @ts-strict-ignore
import React, {
  type Ref,
  useRef,
  useState,
  useEffect,
  type FocusEventHandler,
  type KeyboardEvent,
  type CSSProperties,
  useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd, SvgSubtract } from '@actual-app/components/icons/v1';
import { baseInputStyle, Input } from '@actual-app/components/input';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { type IntegerAmount } from 'loot-core/shared/util';

import { MoneyKeypad } from './MoneyKeypad';

import { useFormat } from '@desktop-client/hooks/useFormat';
import { useIsMobileCalculatorKeypadEnabled } from '@desktop-client/hooks/useIsMobileCalculatorKeypadEnabled';
import { useMergedRefs } from '@desktop-client/hooks/useMergedRefs';

type AmountInputProps = {
  id?: string;
  dataTestId?: string;
  ref?: Ref<HTMLInputElement>;
  value: IntegerAmount;
  zeroSign?: '-' | '+';
  sign?: '-' | '+';
  onChangeValue?: (value: string) => void;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onEnter?: (
    event: KeyboardEvent<HTMLInputElement>,
    amount?: IntegerAmount,
  ) => void;
  onUpdate?: (amount: IntegerAmount) => void;
  style?: CSSProperties;
  inputStyle?: CSSProperties;
  inputClassName?: string;
  focused?: boolean;
  disabled?: boolean;
  autoDecimals?: boolean;
};

export function AmountInput({
  id,
  dataTestId,
  ref,
  value: initialValue,
  zeroSign = '-', // + or -
  sign,
  onFocus,
  onBlur,
  onChangeValue,
  onUpdate,
  onEnter,
  style,
  inputStyle,
  inputClassName,
  focused,
  disabled = false,
  autoDecimals = false,
}: AmountInputProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const isMobileKeypadEnabled = useIsMobileCalculatorKeypadEnabled();
  const [symbol, setSymbol] = useState<'+' | '-'>(() => {
    if (sign) return sign;
    return initialValue === 0 ? zeroSign : initialValue > 0 ? '+' : '-';
  });

  const [isFocused, setIsFocused] = useState(focused ?? false);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);

  const applySymbolToExpression = useCallback(
    (expr: string) => {
      const trimmed = expr.trim();
      if (symbol !== '-') {
        return trimmed;
      }

      if (trimmed === '') {
        return trimmed;
      }

      // If the user already typed a leading '-', respect it.
      if (trimmed.startsWith('-')) {
        return trimmed;
      }

      // Apply the sign to the entire expression (not just the first number).
      // `evalArithmetic` doesn't support unary minus before parentheses, so use
      // binary subtraction instead.
      return `0-(${trimmed})`;
    },
    [symbol],
  );

  const getDisplayValue = useCallback(
    (value: number, isEditing: boolean) => {
      const absoluteValue = Math.abs(value || 0);
      return isEditing
        ? format.forEdit(absoluteValue)
        : format(absoluteValue, 'financial');
    },
    [format],
  );

  const [value, setValue] = useState(getDisplayValue(initialValue, false));
  useEffect(() => {
    // Keep the displayed value in sync with external updates when not editing.
    // When focused, the user (or mobile keypad) owns the input state.
    if (!isFocused) {
      setValue(getDisplayValue(initialValue, false));
    }
  }, [initialValue, isFocused, getDisplayValue]);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const innerRef = useRef<HTMLInputElement | null>(null);
  const isKeypadOpenRef = useRef(false);
  const didCommitFromKeypadRef = useRef(false);
  const mergedRef = useMergedRefs<HTMLInputElement>(ref, innerRef);

  const openMobileKeypad = useCallback(() => {
    if (!isMobileKeypadEnabled || disabled || isKeypadOpenRef.current) {
      return;
    }

    setIsFocused(true);
    const editValue =
      (initialValue ?? 0) === 0 ? '' : format.forEdit(Math.abs(initialValue));
    setValue(editValue);

    isKeypadOpenRef.current = true;
    setTimeout(() => {
      // Defer to avoid fighting with focus transitions.
      setIsKeypadOpen(true);
    }, 0);
  }, [disabled, format, initialValue, isMobileKeypadEnabled]);

  useEffect(() => {
    if (focused) {
      innerRef.current?.focus();
    }
  }, [focused]);

  useEffect(() => {
    if (sign) {
      setSymbol(sign);
    }
  }, [sign]);

  const getAmount = useCallback(() => {
    return format.fromEdit(applySymbolToExpression(value), 0);
  }, [applySymbolToExpression, value, format]);

  const parseAmount = useCallback(
    (nextValue: string) => {
      return format.fromEdit(applySymbolToExpression(nextValue), null);
    },
    [format, applySymbolToExpression],
  );

  useEffect(() => {
    if (innerRef.current) {
      (
        innerRef.current as HTMLInputElement & {
          getCurrentAmount?: () => number;
        }
      ).getCurrentAmount = () => getAmount();
    }
  }, [getAmount]);

  function onSwitch() {
    if (sign) {
      return;
    }

    const amount = getAmount();
    if (amount === 0) {
      setSymbol(symbol === '+' ? '-' : '+');
    }
    fireUpdate(amount * -1);
  }

  function onInputTextChange(val) {
    let newText = val;
    const shouldAutoDecimals = autoDecimals && !isMobileKeypadEnabled;
    if (shouldAutoDecimals) {
      // If the user starts typing an arithmetic expression, preserve the raw
      // text so operators like + - * / work.
      const hasArithmetic = /[+\-*/^()]/.test(val);
      if (!hasArithmetic) {
        const digits = val.replace(/\D/g, '');
        if (digits === '') {
          newText = '';
        } else {
          const intValue = parseInt(digits, 10);
          newText = format.forEdit(intValue);
        }
      }
    }

    setValue(newText || '');
    onChangeValue?.(newText);
  }

  function fireUpdate(amount) {
    onUpdate?.(amount);

    if (sign) {
      setSymbol(sign);
    } else {
      if (amount > 0) {
        setSymbol('+');
      } else if (amount < 0) {
        setSymbol('-');
      }
    }
    setValue(format(Math.abs(amount), 'financial'));
  }

  function onInputAmountBlur(e) {
    if (!innerRef.current?.contains(e.relatedTarget)) {
      const amount = getAmount();
      fireUpdate(amount);
    }
    onBlur?.(e);
  }

  return (
    <View
      style={{
        ...baseInputStyle,
        padding: 0,
        flexDirection: 'row',
        flex: 1,
        alignItems: 'stretch',
        ...style,
        ...(isFocused && {
          boxShadow: '0 0 0 1px ' + theme.formInputShadowSelected,
        }),
      }}
    >
      <Button
        variant="bare"
        isDisabled={disabled || !!sign}
        aria-label={symbol === '-' ? t('Make positive') : t('Make negative')}
        style={{ padding: '0 7px' }}
        onPress={onSwitch}
        ref={buttonRef}
      >
        {symbol === '-' && (
          <SvgSubtract style={{ width: 8, height: 8, color: 'inherit' }} />
        )}
        {symbol === '+' && (
          <SvgAdd style={{ width: 8, height: 8, color: 'inherit' }} />
        )}
      </Button>

      <Input
        id={id}
        data-testid={dataTestId}
        ref={mergedRef}
        inputMode={isMobileKeypadEnabled ? 'none' : 'decimal'}
        value={value}
        disabled={disabled}
        style={inputStyle}
        className={cx(
          css({
            width: '100%',
            flex: 1,
            '&, &[data-focused], &[data-hovered]': {
              border: 0,
              backgroundColor: 'transparent',
              boxShadow: 'none',
              color: 'inherit',
            },
          }),
          inputClassName,
        )}
        onPointerDown={() => {
          // On mobile, only open the calculator keypad on an explicit pointer
          // interaction (tap/click). This avoids reopening due to programmatic
          // focus or focus restoration when dismissing the modal.
          openMobileKeypad();
        }}
        onFocus={e => {
          setIsFocused(true);
          if (!isMobileKeypadEnabled) {
            const editValue = format.forEdit(Math.abs(initialValue ?? 0));
            setValue(editValue);
          }

          onFocus?.(e);
        }}
        onBlur={e => {
          if (isMobileKeypadEnabled && isKeypadOpenRef.current) {
            onBlur?.(e);
            return;
          }

          setIsFocused(false);
          onInputAmountBlur(e);
        }}
        onEnter={(_, e) => {
          const amount = getAmount();
          fireUpdate(amount);
          onEnter?.(e, amount);
        }}
        onChangeValue={onInputTextChange}
      />

      {isMobileKeypadEnabled && isKeypadOpen && (
        <MoneyKeypad
          modalName="money-keypad"
          title={t('Amount')}
          defaultValue={value}
          onChangeValue={text => {
            setValue(text);
            onChangeValue?.(text);
          }}
          onClose={() => {
            if (didCommitFromKeypadRef.current) {
              didCommitFromKeypadRef.current = false;
              isKeypadOpenRef.current = false;
              setIsKeypadOpen(false);
              return;
            }

            isKeypadOpenRef.current = false;
            setIsKeypadOpen(false);
            setIsFocused(false);
            setValue(getDisplayValue(initialValue, false));
          }}
          onEvaluate={text => {
            const parsed = parseAmount(text);
            if (parsed == null) {
              return { ok: false as const, error: t('Invalid expression') };
            }

            return {
              ok: true as const,
              value: format.forEdit(Math.abs(parsed)),
            };
          }}
          onDone={text => {
            const parsed = parseAmount(text);
            if (parsed == null) {
              return { ok: false as const, error: t('Invalid expression') };
            }

            fireUpdate(parsed);
            didCommitFromKeypadRef.current = true;
            isKeypadOpenRef.current = false;
            setIsKeypadOpen(false);
            setIsFocused(false);

            return { ok: true as const, value: undefined };
          }}
        />
      )}
    </View>
  );
}

type BetweenAmountInputProps = {
  defaultValue: { num1: number; num2: number };
  onChange: (newValue: { num1: number; num2: number }) => void;
};

export function BetweenAmountInput({
  defaultValue,
  onChange,
}: BetweenAmountInputProps) {
  const { t } = useTranslation();
  const [num1, setNum1] = useState(defaultValue.num1);
  const [num2, setNum2] = useState(defaultValue.num2);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <AmountInput
        value={num1}
        onUpdate={value => {
          setNum1(value);
          onChange({ num1: value, num2 });
        }}
        style={{ color: theme.formInputText }}
      />
      <View style={{ margin: '0 5px' }}>{t('and')}</View>
      <AmountInput
        value={num2}
        onUpdate={value => {
          setNum2(value);
          onChange({ num1, num2: value });
        }}
        style={{ color: theme.formInputText }}
      />
    </View>
  );
}
