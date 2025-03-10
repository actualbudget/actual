import React, { type ComponentProps } from 'react';

import { Input } from '@actual-app/components/input';
import { View } from '@actual-app/components/view';

import { CheckboxOption } from './CheckboxOption';

type MultiplierOptionProps = {
  multiplierEnabled: boolean;
  multiplierAmount: string;
  onToggle: ComponentProps<typeof CheckboxOption>['onChange'];
  onChangeAmount: (newValue: string) => void;
};

export function MultiplierOption({
  multiplierEnabled,
  multiplierAmount,
  onToggle,
  onChangeAmount,
}: MultiplierOptionProps) {
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
