import React, { type MutableRefObject, useRef, useState } from 'react';

import evalArithmetic from 'loot-core/src/shared/arithmetic';
import { amountToInteger } from 'loot-core/src/shared/util';

import { useMergedRefs } from '../../hooks/useMergedRefs';
import Add from '../../icons/v1/Add';
import Subtract from '../../icons/v1/Subtract';
import { type CSSProperties, theme } from '../../style';
import Button from '../common/Button';
import InputWithContent from '../common/InputWithContent';
import View from '../common/View';
import useFormat from '../spreadsheet/useFormat';

type AmountInputProps = {
  id?: string;
  inputRef?: MutableRefObject<HTMLInputElement>;
  initialValue: number;
  zeroSign?: '-' | '+';
  onChange?: (value: number) => void;
  onBlur?: () => void;
  style?: CSSProperties;
  textStyle?: CSSProperties;
  focused?: boolean;
};

export function AmountInput({
  id,
  inputRef,
  initialValue,
  zeroSign = '-', // + or -
  onChange,
  onBlur,
  style,
  textStyle,
  focused,
}: AmountInputProps) {
  let format = useFormat();
  let [negative, setNegative] = useState(
    (initialValue === 0 && zeroSign === '-') || initialValue < 0,
  );
  let initialValueAbsolute = format(Math.abs(initialValue), 'financial');
  let [value, setValue] = useState(initialValueAbsolute);
  let buttonRef = useRef();

  function onSwitch() {
    setNegative(!negative);
    fireChange(value, !negative);
  }

  function fireChange(val, neg) {
    let valueOrInitial = Math.abs(
      amountToInteger(evalArithmetic(val, initialValueAbsolute)),
    );
    let amount = neg ? valueOrInitial * -1 : valueOrInitial;

    onChange?.(amount);
  }

  function onInputAmountChange(value) {
    setValue(value ? value : '');
  }

  let ref = useRef<HTMLInputElement>();
  let mergedRef = useMergedRefs<HTMLInputElement>(inputRef, ref);

  function onInputAmountBlur(e) {
    fireChange(value, negative);
    if (!ref.current?.contains(e.relatedTarget)) {
      onBlur?.();
    }
  }

  return (
    <InputWithContent
      id={id}
      inputRef={mergedRef}
      inputMode="decimal"
      leftContent={
        <Button
          type="bare"
          style={{ padding: '0 7px' }}
          disabled={!focused}
          onPointerUp={onSwitch}
          onPointerDown={e => e.preventDefault()}
          ref={buttonRef}
        >
          {negative ? (
            <Subtract style={{ width: 8, height: 8, color: 'inherit' }} />
          ) : (
            <Add style={{ width: 8, height: 8, color: 'inherit' }} />
          )}
        </Button>
      }
      value={value}
      focused={focused}
      style={{ flex: 1, alignItems: 'stretch', ...style }}
      inputStyle={{ paddingLeft: 0, ...textStyle }}
      onKeyUp={e => {
        if (e.key === 'Enter') {
          fireChange(value, negative);
          onBlur?.();
        }
      }}
      onUpdate={onInputAmountChange}
      onBlur={onInputAmountBlur}
    />
  );
}

export function BetweenAmountInput({ defaultValue, onChange }) {
  let [num1, setNum1] = useState(defaultValue.num1);
  let [num2, setNum2] = useState(defaultValue.num2);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <AmountInput
        initialValue={num1}
        onChange={value => {
          setNum1(value);
          onChange({ num1: value, num2 });
        }}
        style={{ color: theme.formInputText }}
      />
      <View style={{ margin: '0 5px' }}>and</View>
      <AmountInput
        initialValue={num2}
        onChange={value => {
          setNum2(value);
          onChange({ num1, num2: value });
        }}
        style={{ color: theme.formInputText }}
      />
    </View>
  );
}
