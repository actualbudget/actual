import React from 'react';

import { Input } from '../../common/Input';
import { View } from '../../common/View';

import { CheckboxOption } from './CheckboxOption';

type InOutOptionProps = {
  inOutMode: boolean;
  outValue: string;
  disabled: boolean;
  onToggle: () => void;
  onChangeText: (newValue: string) => void;
};

export function InOutOption({
  inOutMode,
  outValue,
  disabled,
  onToggle,
  onChangeText,
}: InOutOptionProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, height: 28 }}>
      <CheckboxOption
        id="form_inOut"
        checked={inOutMode}
        disabled={disabled}
        onChange={onToggle}
      >
        {inOutMode
          ? 'in/out identifier'
          : 'Select column to specify if amount goes in/out'}
      </CheckboxOption>
      {inOutMode && (
        <Input
          type="text"
          value={outValue}
          onChangeValue={onChangeText}
          placeholder="Value for out rows, i.e. Credit"
        />
      )}
    </View>
  );
}
