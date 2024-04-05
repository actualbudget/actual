import React, { useState } from 'react';

import { rolloverBudget } from 'loot-core/client/queries';
import { evalArithmetic } from 'loot-core/shared/arithmetic';
import { amountToInteger, integerToCurrency } from 'loot-core/shared/util';

import { styles } from '../../style';
import { Button } from '../common/Button';
import { InitialFocus } from '../common/InitialFocus';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { FieldLabel, InputField } from '../mobile/MobileForms';
import { type CommonModalProps } from '../Modals';
import { useSheetValue } from '../spreadsheet/useSheetValue';

type HoldBufferModalProps = {
  modalProps: CommonModalProps;
  month: string;
  onSubmit: (amount: number) => void;
};

export function HoldBufferModal({
  modalProps,
  onSubmit,
}: HoldBufferModalProps) {
  const available = useSheetValue(rolloverBudget.toBudget);
  const initialAmount = integerToCurrency(Math.max(available, 0));
  const [amount, setAmount] = useState<string | null>(null);

  const _onSubmit = (newAmount: string | null) => {
    const parsedAmount = evalArithmetic(newAmount || '');
    if (parsedAmount) {
      onSubmit?.(amountToInteger(parsedAmount));
    }

    modalProps.onClose();
  };

  return (
    <Modal
      title="Hold Buffer"
      showHeader
      focusAfterClose={false}
      {...modalProps}
      padding={0}
      style={{
        flex: 1,
        padding: '0 10px',
        paddingBottom: 10,
        borderRadius: '6px',
      }}
    >
      {() => (
        <>
          <View>
            <FieldLabel title="Hold this amount:" />
            <InitialFocus>
              <InputField
                defaultValue={initialAmount}
                onUpdate={value => setAmount(value)}
                onEnter={() => _onSubmit(amount)}
              />
            </InitialFocus>
          </View>
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 10,
            }}
          >
            <Button
              type="primary"
              style={{
                height: styles.mobileMinHeight,
                marginLeft: styles.mobileEditingPadding,
                marginRight: styles.mobileEditingPadding,
              }}
              onClick={() => _onSubmit(amount)}
            >
              Hold
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}
