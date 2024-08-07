import React, { useState } from 'react';

import { rolloverBudget } from 'loot-core/client/queries';

import { styles } from '../../style';
import { useRolloverSheetValue } from '../budget/rollover/RolloverComponents';
import { Button } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
import { View } from '../common/View';
import { FieldLabel } from '../mobile/MobileForms';
import { AmountInput } from '../util/AmountInput';

type HoldBufferModalProps = {
  month: string;
  onSubmit: (amount: number) => void;
};

export function HoldBufferModal({ onSubmit }: HoldBufferModalProps) {
  const available = useRolloverSheetValue(rolloverBudget.toBudget);
  const [amount, setAmount] = useState<number>(0);

  const _onSubmit = (newAmount: number) => {
    if (newAmount) {
      onSubmit?.(newAmount);
    }
  };

  return (
    <Modal name="hold-buffer">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Hold Buffer"
            rightContent={<ModalCloseButton onClick={close} />}
          />
          <View>
            <FieldLabel title="Hold this amount:" />
            <InitialFocus>
              <AmountInput
                value={available}
                autoDecimals={true}
                style={{
                  marginLeft: styles.mobileEditingPadding,
                  marginRight: styles.mobileEditingPadding,
                }}
                inputStyle={{
                  height: styles.mobileMinHeight,
                }}
                onUpdate={setAmount}
                onEnter={() => {
                  _onSubmit(amount);
                  close();
                }}
              />
            </InitialFocus>
          </View>
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              paddingTop: 10,
            }}
          >
            <Button
              variant="primary"
              style={{
                height: styles.mobileMinHeight,
                marginLeft: styles.mobileEditingPadding,
                marginRight: styles.mobileEditingPadding,
              }}
              onPress={() => _onSubmit(amount)}
            >
              Hold
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}
