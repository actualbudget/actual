import React, { type ComponentProps } from 'react';
import { Trans, useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', gap: 10, height: 28 }}>
      <CheckboxOption
        id="add_multiplier"
        checked={multiplierEnabled}
        onChange={onToggle}
      >
        <Trans>Multiply amount</Trans>
      </CheckboxOption>
      <Input
        type="text"
        style={{ display: multiplierEnabled ? 'inherit' : 'none' }}
        value={multiplierAmount}
        placeholder={t('Multiplier')}
        onChangeValue={onChangeAmount}
      />
    </View>
  );
}
