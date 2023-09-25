import React, { useRef, useState } from 'react';

import {
  currencyToInteger,
  integerToCurrency,
} from 'loot-core/src/shared/util';

import { useMergedRefs } from '../../hooks/useMergedRefs';
import Add from '../../icons/v1/Add';
import Subtract from '../../icons/v1/Subtract';
import { theme } from '../../style';
import Button from '../common/Button';
import InputWithContent from '../common/InputWithContent';
import View from '../common/View';

export function AmountInput({
  id,
  inputRef,
  initialValue = 0,
  onChange,
  onEdit,
  style,
  textStyle,
  focused,
}) {
  let [negative, setNegative] = useState(initialValue <= 0);
  let initialValueAbsolute = integerToCurrency(Math.abs(initialValue || 0));
  let [value, setValue] = useState(initialValueAbsolute);
  let ref = useRef();
  let buttonRef = useRef();
  let mergedInputRef = useMergedRefs(inputRef, ref);

  function onSwitch() {
    ref.current?.focus();
    setNegative(!negative);
    fireChange(value, !negative);
  }

  function fireChange(val, neg) {
    let valueOrInitial = Math.abs(
      currencyToInteger(val ? val : initialValueAbsolute),
    );
    let amount = neg ? valueOrInitial * -1 : valueOrInitial;

    onChange?.(amount);
  }

  function onInputAmountChange(value) {
    setValue(value ? value : '');
  }

  function onInputAmountBlur(e) {
    fireChange(value, negative);
    if (!buttonRef.current?.contains(e.relatedTarget)) {
      onEdit?.(null);
    }
  }

  return (
    <InputWithContent
      id={id}
      inputRef={mergedInputRef}
      inputMode="decimal"
      leftContent={
        <Button
          type="bare"
          style={{ padding: '0 7px' }}
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
