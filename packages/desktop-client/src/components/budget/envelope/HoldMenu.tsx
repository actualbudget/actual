import React, { useState, useCallback, type FormEvent, useRef } from 'react';
import { Form } from 'react-aria-components';
import { Trans } from 'react-i18next';

import { envelopeBudget } from 'loot-core/client/queries';
import { evalArithmetic } from 'loot-core/src/shared/arithmetic';
import { integerToCurrency, amountToInteger } from 'loot-core/src/shared/util';

import { Button } from '../../common/Button2';
import { Input } from '../../common/Input';
import { View } from '../../common/View';

import { useEnvelopeSheetValue } from './EnvelopeBudgetComponents';

type HoldMenuProps = {
  onSubmit: (amount: number) => void;
  onClose: () => void;
};
export function HoldMenu({ onSubmit, onClose }: HoldMenuProps) {
  const [amount, setAmount] = useState<string>(
    integerToCurrency(
      useEnvelopeSheetValue(envelopeBudget.toBudget, result => {
        setAmount(integerToCurrency(result?.value ?? 0));
      }) ?? 0,
    ),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmitInner = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (amount === '') {
        inputRef.current?.focus();
        return;
      }

      const parsedAmount = evalArithmetic(amount);
      if (parsedAmount) {
        onSubmit(amountToInteger(parsedAmount));
      }
      onClose();
    },
    [amount, onSubmit, onClose],
  );

  if (amount === null) {
    // See `TransferMenu` for more info about this
    return null;
  }

  return (
    <Form onSubmit={onSubmitInner}>
      <View style={{ padding: 10 }}>
        <View style={{ marginBottom: 5 }}>
          <Trans>Hold this amount:</Trans>
        </View>
        <Input
          ref={inputRef}
          value={amount}
          onChangeValue={(value: string) => setAmount(value)}
          autoFocus
          autoSelect
        />
        <View
          style={{
            alignItems: 'flex-end',
            marginTop: 10,
          }}
        >
          <Button
            variant="primary"
            type="submit"
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
