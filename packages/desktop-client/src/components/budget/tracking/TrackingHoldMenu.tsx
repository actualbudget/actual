import React, { useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { View } from '@actual-app/components/view';

import { evalArithmetic } from 'loot-core/shared/arithmetic';
import { integerToCurrency, amountToInteger } from 'loot-core/shared/util';

import { useTrackingSheetValue } from '@desktop-client/components/budget/tracking/TrackingBudgetComponents';
import { trackingBudget } from '@desktop-client/spreadsheet/bindings';

type TrackingHoldMenuProps = {
  onSubmit: (amount: number) => void;
  onClose: () => void;
};

export function TrackingHoldMenu({ onSubmit, onClose }: TrackingHoldMenuProps) {
  const [amount, setAmount] = useState<string | null>(null);

  const toBudgetValue = useTrackingSheetValue(trackingBudget.toBudget);
  
  React.useEffect(() => {
    if (toBudgetValue !== null && toBudgetValue !== undefined) {
      setAmount(integerToCurrency(Math.max(toBudgetValue || 0, 0)));
    }
  }, [toBudgetValue]);

  function _onSubmit(newAmount: string) {
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
    <Form
      onSubmit={e => {
        e.preventDefault();
        _onSubmit(amount);
      }}
    >
      <View style={{ padding: 10 }}>
        <View style={{ marginBottom: 5 }}>
          <Trans>Hold this amount:</Trans>
        </View>
        <View>
          <InitialFocus>
            <Input value={amount} onChangeValue={setAmount} />
          </InitialFocus>
        </View>
        <View
          style={{
            alignItems: 'flex-end',
            marginTop: 10,
          }}
        >
          <Button
            type="submit"
            variant="primary"
            style={{
              fontSize: 12,
              paddingTop: 3,
              paddingBottom: 3,
            }}
          >
            <Trans>Hold</Trans>
          </Button>
        </View>
      </View>
    </Form>
  );
} 