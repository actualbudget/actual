import React, { useState } from 'react';

import {
  integerToCurrency,
  currencyToInteger
} from 'loot-core/src/shared/util';
import {
  View,
  Button,
  InputWithContent
} from 'loot-design/src/components/common';
import Add from 'loot-design/src/svg/v1/Add';
import Subtract from 'loot-design/src/svg/v1/Subtract';

export function AmountInput({ defaultValue = 0, onChange, style }) {
  let [negative, setNegative] = useState(defaultValue <= 0);
  let [value, setValue] = useState(integerToCurrency(Math.abs(defaultValue)));

  function onSwitch() {
    setNegative(!negative);
    fireChange(!negative);
  }

  function fireChange(neg = negative) {
    let v = currencyToInteger(value);
    let amount = neg ? (v < 0 ? v : -v) : v > 0 ? v : -v;

    onChange(amount);
  }

  return (
    <InputWithContent
      leftContent={
        <Button bare style={{ padding: '0 7px' }} onClick={onSwitch}>
          {negative ? (
            <Subtract style={{ width: 8, height: 8 }} />
          ) : (
            <Add style={{ width: 8, height: 8 }} />
          )}
        </Button>
      }
      value={value}
      style={{ flex: 1, alignItems: 'stretch', ...style }}
      inputStyle={{ paddingLeft: 0 }}
      onChange={e => setValue(e.target.value)}
      onBlur={e => fireChange()}
    />
  );
}

export function BetweenAmountInput({ defaultValue, onChange }) {
  let [num1, setNum1] = useState(defaultValue.num1);
  let [num2, setNum2] = useState(defaultValue.num2);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <AmountInput
        defaultValue={num1}
        onChange={value => {
          setNum1(value);
          onChange({ num1: value, num2 });
        }}
      />
      <View style={{ margin: '0 5px' }}>and</View>
      <AmountInput
        defaultValue={num2}
        onChange={value => {
          setNum2(value);
          onChange({ num1, num2: value });
        }}
      />
    </View>
  );
}
