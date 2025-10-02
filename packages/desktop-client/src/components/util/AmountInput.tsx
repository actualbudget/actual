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

import { useFormat } from '@desktop-client/hooks/useFormat';
import { useMergedRefs } from '@desktop-client/hooks/useMergedRefs';

type AmountInputProps = {
  id?: string;
  inputRef?: Ref<HTMLInputElement>;
  value: number;
  zeroSign?: '-' | '+';
  onChangeValue?: (value: string) => void;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onEnter?: (event: KeyboardEvent<HTMLInputElement>, amount?: number) => void;
  onUpdate?: (amount: number) => void;
  style?: CSSProperties;
  inputStyle?: CSSProperties;
  inputClassName?: string;
  focused?: boolean;
  disabled?: boolean;
  autoDecimals?: boolean;
  options?: { inflow?: boolean; outflow?: boolean };
};

export function AmountInput({
  id,
  inputRef,
  value: initialValue,
  zeroSign = '-', // + or -
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
  options,
}: AmountInputProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [symbol, setSymbol] = useState<'+' | '-'>(() => {
    if (options?.inflow) return '+';
    if (options?.outflow) return '-';
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

  const buttonRef = useRef(null);
  const ref = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs<HTMLInputElement>(inputRef, ref);

  useEffect(() => {
    if (focused) {
      ref.current?.focus();
    }
  }, [focused]);

  useEffect(() => {
    if (options?.inflow) {
      setSymbol('+');
    } else if (options?.outflow) {
      setSymbol('-');
    }
  }, [options]);

  function onSwitch() {
    if (options?.inflow || options?.outflow) {
      return;
    }
    
    const amount = getAmount();
    if (amount === 0) {
      setSymbol(symbol === '+' ? '-' : '+');
    }
    fireUpdate(amount * -1);
  }

  function getAmount() {
    const signedValued = symbol === '-' ? symbol + value : value;
    return format.fromEdit(signedValued, 0);
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
    
    if (options?.inflow) {
      setSymbol('+');
    } else if (options?.outflow) {
      setSymbol('-');
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
    if (!ref.current?.contains(e.relatedTarget)) {
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
        isDisabled={disabled || options?.inflow || options?.outflow}
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
        onFocus={e => {
          setIsFocused(true);
          setValue(format.forEdit(Math.abs(initialValue)));
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
