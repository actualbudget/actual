// @ts-strict-ignore
import React, {
  type Ref,
  useRef,
  useState,
  useEffect,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd, SvgSubtract } from '@actual-app/components/icons/v1';
import { baseInputStyle, Input } from '@actual-app/components/input';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { evalArithmetic } from 'loot-core/shared/arithmetic';
import { amountToInteger, appendDecimals } from 'loot-core/shared/util';

import { useFormat } from '@desktop-client/hooks/useFormat';
import { useMergedRefs } from '@desktop-client/hooks/useMergedRefs';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

type AmountInputProps = {
  id?: string;
  inputRef?: Ref<HTMLInputElement>;
  value: number;
  zeroSign?: '-' | '+';
  onChangeValue?: (value: string) => void;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onEnter?: KeyboardEventHandler<HTMLInputElement>;
  onUpdate?: (amount: number) => void;
  style?: CSSProperties;
  inputStyle?: CSSProperties;
  inputClassName?: string;
  focused?: boolean;
  disabled?: boolean;
  autoDecimals?: boolean;
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
}: AmountInputProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [symbol, setSymbol] = useState<'+' | '-'>(
    initialValue === 0 ? zeroSign : initialValue > 0 ? '+' : '-',
  );

  const [isFocused, setIsFocused] = useState(focused ?? false);

  const initialValueAbsolute = format(Math.abs(initialValue || 0), 'financial');
  const [value, setValue] = useState(initialValueAbsolute);
  useEffect(() => setValue(initialValueAbsolute), [initialValueAbsolute]);

  const buttonRef = useRef(null);
  const ref = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs<HTMLInputElement>(inputRef, ref);
  const [hideFraction] = useSyncedPref('hideFraction');

  useEffect(() => {
    if (focused) {
      ref.current?.focus();
    }
  }, [focused]);

  function onSwitch() {
    const amount = getAmount();
    if (amount === 0) {
      setSymbol(symbol === '+' ? '-' : '+');
    }
    fireUpdate(amount * -1);
  }

  function getAmount() {
    const signedValued = symbol === '-' ? symbol + value : value;
    return amountToInteger(evalArithmetic(signedValued));
  }

  function onInputTextChange(val) {
    val = autoDecimals
      ? appendDecimals(val, String(hideFraction) === 'true')
      : val;
    setValue(val ? val : '');
    onChangeValue?.(val);
  }

  function fireUpdate(amount) {
    onUpdate?.(amount);
    if (amount > 0) {
      setSymbol('+');
    } else if (amount < 0) {
      setSymbol('-');
    }
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
        isDisabled={disabled}
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
          onFocus?.(e);
        }}
        onBlur={e => {
          setIsFocused(false);
          onInputAmountBlur(e);
        }}
        onEnter={(_, e) => {
          onEnter?.(e);
          const amount = getAmount();
          fireUpdate(amount);
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
