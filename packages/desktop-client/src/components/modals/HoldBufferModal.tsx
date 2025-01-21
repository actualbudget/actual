import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';
import { envelopeBudget } from 'loot-core/client/queries';

import { styles } from '../../style';
import { useEnvelopeSheetValue } from '../budget/envelope/EnvelopeBudgetComponents';
import { Button } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { View } from '../common/View';
import { FieldLabel } from '../mobile/MobileForms';
import { AmountInput } from '../util/AmountInput';

type HoldBufferModalProps = Extract<
  ModalType,
  { name: 'hold-buffer' }
>['options'];

export function HoldBufferModal({ onSubmit }: HoldBufferModalProps) {
  const { t } = useTranslation(); // Initialize i18next
  const available = useEnvelopeSheetValue(envelopeBudget.toBudget) ?? 0;
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
            title={t('Hold for next month')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View>
            <FieldLabel title={t('Hold this amount:')} />{' '}
            <InitialFocus>
              <AmountInput
                value={available}
                autoDecimals={true}
                zeroSign="+"
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
              {t('Hold')}
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}
