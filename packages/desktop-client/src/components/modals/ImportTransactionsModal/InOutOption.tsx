import React from 'react';

import { Input } from '@actual-app/components/input';
import { View } from '@actual-app/components/view';

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
          ? 'In/Out outflow value'
          : 'Select column to specify if amount goes in/out'}
      </CheckboxOption>
      {inOutMode && (
        <Input
          type="text"
          value={outValue}
          onChangeValue={onChangeText}
          placeholder="Value for out rows, e.g: ‘Credit’"
        />
      )}
    </View>
  );
}
