import React, { type FormEvent, useCallback, useState } from 'react';
import { Form } from 'react-aria-components';

import { envelopeBudget } from 'loot-core/client/queries';

import { styles } from '../../style';
import { useEnvelopeSheetValue } from '../budget/envelope/EnvelopeBudgetComponents';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { View } from '../common/View';
import { FieldLabel } from '../mobile/MobileForms';
import { AmountInput } from '../util/AmountInput';

type HoldBufferModalProps = {
  month: string;
  onSubmit: (amount: number) => void;
};

export function HoldBufferModal({ onSubmit }: HoldBufferModalProps) {
  const available = useEnvelopeSheetValue(envelopeBudget.toBudget) ?? 0;
  const [amount, setAmount] = useState<number>(0);

  const _onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (amount) {
        onSubmit?.(amount);
      }
    },
    [amount, onSubmit],
  );

  return (
    <Modal name="hold-buffer">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Hold Buffer"
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <Form onSubmit={_onSubmit}>
            <View>
              <FieldLabel title="Hold this amount:" />
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
                autoFocus
                autoSelect
              />
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
                type="submit"
                style={{
                  height: styles.mobileMinHeight,
                  marginLeft: styles.mobileEditingPadding,
                  marginRight: styles.mobileEditingPadding,
                }}
              >
                Hold
              </Button>
            </View>
          </Form>
        </>
      )}
    </Modal>
  );
}
