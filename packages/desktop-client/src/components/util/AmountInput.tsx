// @ts-strict-ignore
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEventHandler,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd, SvgSubtract } from '@actual-app/components/icons/v1';
import { baseInputStyle, Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { type IntegerAmount } from 'loot-core/shared/util';

import { useFormat } from '@desktop-client/hooks/useFormat';
import { useMergedRefs } from '@desktop-client/hooks/useMergedRefs';

type AmountInputProps = {
  id?: string;
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
  const [symbol, setSymbol] = useState<'+' | '-'>(() => {
    if (sign) return sign;
    return initialValue === 0 ? zeroSign : initialValue > 0 ? '+' : '-';
  });

  const [isFocused, setIsFocused] = useState(focused ?? false);

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
  useEffect(
    () => setValue(getDisplayValue(initialValue, isFocused)),
    [initialValue, isFocused, getDisplayValue],
  );

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const innerRef = useRef<HTMLInputElement | null>(null);
  const mergedRef = useMergedRefs<HTMLInputElement>(ref, innerRef);

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
    const signedValued = symbol === '-' ? symbol + value : value;
    return format.fromEdit(signedValued, 0);
  }, [symbol, value, format]);

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
    if (autoDecimals) {
      const digits = val.replace(/\D/g, '');
      if (digits === '') {
        newText = '';
      } else {
        const intValue = parseInt(digits, 10);
        newText = format.forEdit(intValue);
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
        ref={mergedRef}
        inputMode="decimal"
        value={value}
        disabled={disabled}
        style={{ ...inputStyle, ...styles.tnum }}
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
        onFocus={e => {
          setIsFocused(true);
          setValue(format.forEdit(Math.abs(initialValue ?? 0)));
          onFocus?.(e);
        }}
        onBlur={e => {
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
