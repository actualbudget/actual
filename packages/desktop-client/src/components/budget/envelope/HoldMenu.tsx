import React, { useState, type ChangeEvent } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { View } from '@actual-app/components/view';

import { evalArithmetic } from 'loot-core/shared/arithmetic';
import { integerToCurrency, amountToInteger } from 'loot-core/shared/util';

import { useSheetValue } from '../../spreadsheet/useSheetValue';

type HoldMenuProps = {
  onSubmit: (amount: number) => void;
  onClose: () => void;
};
export function HoldMenu({ onSubmit, onClose }: HoldMenuProps) {
  const [amount, setAmount] = useState<string | null>(null);

  useSheetValue<'envelope-budget', 'to-budget'>('to-budget', ({ value }) => {
    setAmount(integerToCurrency(Math.max(value || 0, 0)));
  });

  function submit(newAmount: string) {
    const parsedAmount = evalArithmetic(newAmount);
    if (parsedAmount) {
      onSubmit(amountToInteger(parsedAmount));
    }
    onClose();
  }

  if (amount === null) {
    // See `TransferMenu` for more info about this
    return null;
  }

  return (
    <View style={{ padding: 10 }}>
      <View style={{ marginBottom: 5 }}>
        <Trans>Hold this amount:</Trans>
      </View>
      <View>
        <InitialFocus>
          <Input
            value={amount}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setAmount(e.target.value)
            }
            onEnter={() => submit(amount)}
          />
        </InitialFocus>
      </View>
      <View
        style={{
          alignItems: 'flex-end',
          marginTop: 10,
        }}
      >
        <Button
          variant="primary"
          style={{
            fontSize: 12,
            paddingTop: 3,
            paddingBottom: 3,
          }}
          onPress={() => submit(amount)}
        >
          <Trans>Hold</Trans>
        </Button>
      </View>
    </View>
  );
}
