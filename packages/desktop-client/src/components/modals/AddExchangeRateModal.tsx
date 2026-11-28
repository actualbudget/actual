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

/** Asks for the rates a foreign account's sync needs, then retries that sync with them. */
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
              onSubmit={operationRates => {
                state.close();
                syncAndDownload({ id: accountId, operationRates });
              }}
            />
          </View>
        </>
      )}
    </Modal>
  );
}
