// @ts-strict-ignore
import React, {
  type Ref,
  useRef,
  useState,
  useEffect,
  type FocusEventHandler,
} from 'react';

import { evalArithmetic } from 'loot-core/src/shared/arithmetic';
import { amountToInteger } from 'loot-core/src/shared/util';

import { useMergedRefs } from '../../hooks/useMergedRefs';
import { SvgAdd, SvgSubtract } from '../../icons/v1';
import { type CSSProperties, theme } from '../../style';
import { Button } from '../common/Button';
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
  onUpdate?: (amount: number) => void;
  style?: CSSProperties;
  textStyle?: CSSProperties;
  focused?: boolean;
  disabled?: boolean;
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
  style,
  textStyle,
  focused,
  disabled = false,
}: AmountInputProps) {
  const format = useFormat();
  const negative = (initialValue === 0 && zeroSign === '-') || initialValue < 0;

  const initialValueAbsolute = format(Math.abs(initialValue || 0), 'financial');
  const [value, setValue] = useState(initialValueAbsolute);
  useEffect(() => setValue(initialValueAbsolute), [initialValueAbsolute]);

  const buttonRef = useRef();
  const ref = useRef<HTMLInputElement>();
  const mergedRef = useMergedRefs<HTMLInputElement>(inputRef, ref);

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
          type="bare"
          disabled={disabled}
          aria-label={`Make ${negative ? 'positive' : 'negative'}`}
          style={{ padding: '0 7px' }}
          onPointerUp={onSwitch}
          onPointerDown={e => e.preventDefault()}
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
      inputStyle={{ paddingLeft: 0, ...textStyle }}
      onKeyUp={e => {
        if (e.key === 'Enter') {
          fireUpdate(negative);
        }
      }}
      onChangeValue={onInputTextChange}
      onBlur={onInputAmountBlur}
      onFocus={onFocus}
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
