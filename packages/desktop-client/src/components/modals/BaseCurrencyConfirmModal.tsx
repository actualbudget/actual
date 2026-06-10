import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Paragraph } from '@actual-app/components/paragraph';
import { View } from '@actual-app/components/view';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import type { Modal as ModalType } from '#modals/modalsSlice';

type BaseCurrencyConfirmModalProps = Extract<
  ModalType,
  { name: 'confirm-base-currency' }
>['options'];

export function BaseCurrencyConfirmModal({
  code,
  mode,
  onConfirm,
}: BaseCurrencyConfirmModalProps) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  const confirm = async (close: () => void) => {
    setIsSaving(true);
    try {
      await onConfirm();
      close();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      name="confirm-base-currency"
      containerProps={{ style: { width: 420 } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Confirm base currency')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ lineHeight: 1.5, gap: 12 }}>
            <Paragraph>
              {mode === 'set' ? (
                <Trans>
                  Set {{ code }} as the base currency for this budget?
                </Trans>
              ) : (
                <Trans>
                  Change the base currency for this budget to {{ code }}? This
                  will recalculate base amounts using effective exchange rates.
                </Trans>
              )}
            </Paragraph>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button
                style={{ marginRight: 10 }}
                isDisabled={isSaving}
                onPress={() => state.close()}
              >
                <Trans>Cancel</Trans>
              </Button>
              <InitialFocus>
                <ButtonWithLoading
                  variant="primary"
                  isLoading={isSaving}
                  isDisabled={isSaving}
                  onPress={() => confirm(() => state.close())}
                >
                  <Trans>Yes</Trans>
                </ButtonWithLoading>
              </InitialFocus>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
