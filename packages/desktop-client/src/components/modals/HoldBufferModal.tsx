import React, { useState } from 'react';

import { envelopeBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';

import { styles } from '../../style';
import { useEnvelopeSheetValue } from '../budget/envelope/EnvelopeBudgetComponents';
import { Button } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { View } from '../common/View';
import { FieldLabel } from '../mobile/MobileForms';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';
import { AmountInput } from '../util/AmountInput';

const MODAL_NAME = 'hold-buffer' as const;

type HoldBufferModalProps = {
  name: typeof MODAL_NAME;
  month: string;
  onSubmit: (amount: number) => void;
};

export function HoldBufferModal({
  name,
  month,
  onSubmit,
}: HoldBufferModalProps) {
  return (
    <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
      <HoldBufferModalInner name={name} onSubmit={onSubmit} />
    </NamespaceContext.Provider>
  );
}
HoldBufferModal.modalName = MODAL_NAME;

function HoldBufferModalInner({
  name,
  onSubmit,
}: Omit<HoldBufferModalProps, 'month'>) {
  const available = useEnvelopeSheetValue(envelopeBudget.toBudget) ?? 0;
  const [amount, setAmount] = useState<number>(0);

  const _onSubmit = (newAmount: number) => {
    if (newAmount) {
      onSubmit?.(newAmount);
    }
  };

  return (
    <Modal name={name}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Hold Buffer"
            rightContent={<ModalCloseButton onPress={close} />}
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
