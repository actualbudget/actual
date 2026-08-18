// @ts-strict-ignore
import { useTranslation } from 'react-i18next';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { ManageRules } from '#components/ManageRules';
import type { Modal as ModalType } from '#modals/modalsSlice';

type ManageRulesModalProps = Extract<
  ModalType,
  { name: 'manage-rules' }
>['options'];

export function ManageRulesModal({ payeeId }: ManageRulesModalProps) {
  const { t } = useTranslation();

  return (
    <Modal name="manage-rules">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Rules')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <ManageRules isModal payeeId={payeeId} />
        </>
      )}
    </Modal>
  );
}
