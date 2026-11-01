import { useTranslation } from 'react-i18next';

import { View } from '@actual-app/components/view';

import { useSyncAndDownloadMutation } from '#accounts';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { MissingRateForm } from '#components/modals/ImportTransactionsModal/MissingRateForm';
import type { Modal as ModalType } from '#modals/modalsSlice';

type AddExchangeRateModalProps = Extract<
  ModalType,
  { name: 'add-exchange-rate' }
>['options'];

/** Saves the rate a foreign account's sync needs, then syncs it again. */
export function AddExchangeRateModal({
  accountId,
  currencyCode,
  dates,
}: AddExchangeRateModalProps) {
  const { t } = useTranslation();
  const { mutate: syncAndDownload } = useSyncAndDownloadMutation();

  return (
    <Modal name="add-exchange-rate" containerProps={{ style: { width: 480 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Add exchange rate')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ padding: '0 20px 20px' }}>
            <MissingRateForm
              dates={dates}
              currencyCode={currencyCode}
              onSaved={() => {
                state.close();
                syncAndDownload({ id: accountId });
              }}
            />
          </View>
        </>
      )}
    </Modal>
  );
}
