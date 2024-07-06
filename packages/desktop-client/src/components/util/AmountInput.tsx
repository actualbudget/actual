// @ts-strict-ignore
import React, {
  type Ref,
  useRef,
  useState,
  useEffect,
  type FocusEventHandler,
  type KeyboardEventHandler,
} from 'react';

import { evalArithmetic } from 'loot-core/src/shared/arithmetic';
import { amountToInteger, appendDecimals } from 'loot-core/src/shared/util';

import { useLocalPref } from '../../hooks/useLocalPref';
import { useMergedRefs } from '../../hooks/useMergedRefs';
import { SvgAdd, SvgSubtract } from '../../icons/v1';
import { type CSSProperties, theme } from '../../style';
import { Button } from '../common/Button2';
import { InputWithContent } from '../common/InputWithContent';
import { View } from '../common/View';
import { useFormat } from '../spreadsheet/useFormat';

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
  focused,
  disabled = false,
  autoDecimals = false,
}: AmountInputProps) {
  const format = useFormat();
  const negative = (initialValue === 0 && zeroSign === '-') || initialValue < 0;

  const initialValueAbsolute = format(Math.abs(initialValue || 0), 'financial');
  const [value, setValue] = useState(initialValueAbsolute);
  useEffect(() => setValue(initialValueAbsolute), [initialValueAbsolute]);

  const buttonRef = useRef();
  const ref = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs<HTMLInputElement>(inputRef, ref);
  const [hideFraction = false] = useLocalPref('hideFraction');

  useEffect(() => {
    if (focused) {
      ref.current?.focus();
    }
  }, [focused]);

  function onSwitch() {
    fireUpdate(!negative);
  }

  function getAmount(negate) {
    const valueOrInitial = Math.abs(amountToInteger(evalArithmetic(value)));
    return negate ? valueOrInitial * -1 : valueOrInitial;
  }

  function onInputTextChange(val) {
    val = autoDecimals ? appendDecimals(val, hideFraction) : val;
    setValue(val ? val : '');
    onChangeValue?.(val);
  }

  function fireUpdate(negate) {
    onUpdate?.(getAmount(negate));
  }

  function onInputAmountBlur(e) {
    if (!ref.current?.contains(e.relatedTarget)) {
      fireUpdate(negative);
    }
    onBlur?.(e);
  }

  return (
    <InputWithContent
      id={id}
      inputRef={mergedRef}
      inputMode="decimal"
      leftContent={
        <Button
          variant="bare"
          isDisabled={disabled}
          aria-label={`Make ${negative ? 'positive' : 'negative'}`}
          style={{ padding: '0 7px' }}
          onPress={onSwitch}
          ref={buttonRef}
        >
          {negative ? (
            <SvgSubtract style={{ width: 8, height: 8, color: 'inherit' }} />
          ) : (
            <SvgAdd style={{ width: 8, height: 8, color: 'inherit' }} />
          )}
        </Button>
      }
      value={value}
      disabled={disabled}
      focused={focused}
      style={{ flex: 1, alignItems: 'stretch', ...style }}
      inputStyle={inputStyle}
      onKeyUp={e => {
        if (e.key === 'Enter') {
          fireUpdate(negative);
        }
      }}
      onChangeValue={onInputTextChange}
      onBlur={onInputAmountBlur}
      onFocus={onFocus}
      onEnter={onEnter}
    />
  );
}

export function BetweenAmountInput({ defaultValue, onChange }) {
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
      <View style={{ margin: '0 5px' }}>and</View>
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
