import React, { useState } from 'react';

import { rolloverBudget } from 'loot-core/client/queries';

import { styles } from '../../style';
import { Button } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { FieldLabel } from '../mobile/MobileForms';
import { type CommonModalProps } from '../Modals';
import { useSheetValue } from '../spreadsheet/useSheetValue';
import { AmountInput } from '../util/AmountInput';

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
  const [amount, setAmount] = useState<number>(0);

  const _onSubmit = (newAmount: number) => {
    if (newAmount) {
      onSubmit?.(newAmount);
    }

    modalProps.onClose();
  };

  return (
    <Modal
      title="Hold Buffer"
      showHeader
      focusAfterClose={false}
      {...modalProps}
    >
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
            onEnter={() => _onSubmit(amount)}
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
    </Modal>
  );
}
