import React, { useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { View } from '@actual-app/components/view';

import { type IntegerAmount } from 'loot-core/shared/util';

import { FinancialInput } from '@desktop-client/components/util/FinancialInput';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';

type HoldMenuProps = {
  onSubmit: (amount: number) => void;
  onClose: () => void;
};
export function HoldMenu({ onSubmit, onClose }: HoldMenuProps) {
  const [amount, setAmount] = useState<IntegerAmount | null>(null);

  useSheetValue<'envelope-budget', 'to-budget'>('to-budget', ({ value }) => {
    setAmount(Math.max(value || 0, 0));
  });

  if (amount === null) {
    // See `TransferMenu` for more info about this
    return null;
  }

  return (
    <Form
      onSubmit={e => {
        e.preventDefault();
        onSubmit(amount);
        onClose();
      }}
    >
      <View style={{ padding: 10 }}>
        <View style={{ marginBottom: 5 }}>
          <Trans>Hold this amount:</Trans>
        </View>
        <View>
          <InitialFocus>
            <FinancialInput value={amount} onChangeValue={setAmount} />
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
