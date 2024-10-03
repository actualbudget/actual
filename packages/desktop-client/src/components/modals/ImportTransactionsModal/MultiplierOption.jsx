import React from 'react';

import { Input } from '../../common/Input';
import { View } from '../../common/View';

import { CheckboxOption } from './CheckboxOption';

export function MultiplierOption({
  multiplierEnabled,
  multiplierAmount,
  onToggle,
  onChangeAmount,
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, height: 28 }}>
      <CheckboxOption
        id="add_multiplier"
        checked={multiplierEnabled}
        onChange={onToggle}
      >
        Add multiplier
      </CheckboxOption>
      <Input
        type="text"
        style={{ display: multiplierEnabled ? 'inherit' : 'none' }}
        value={multiplierAmount}
        placeholder="Multiplier"
        onChangeValue={onChangeAmount}
      />
    </View>
  );
}
