// @ts-strict-ignore
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { ManageRules } from '@desktop-client/components/ManageRules';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type ManageRulesModalProps = Extract<
  ModalType,
  { name: 'manage-rules' }
>['options'];

export function ManageRulesModal({ payeeId }: ManageRulesModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);

  return (
    <Modal name="manage-rules" isLoading={loading}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Rules')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <ManageRules isModal payeeId={payeeId} setLoading={setLoading} />
        </>
      )}
    </Modal>
  );
}
