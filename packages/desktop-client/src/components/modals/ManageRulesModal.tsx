// @ts-strict-ignore
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';
import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';

import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { ManageRules } from '../ManageRules';

type ManageRulesModalProps = Extract<
  ModalType,
  { name: 'manage-rules' }
>['options'];

export function ManageRulesModal({ payeeId }: ManageRulesModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  if (isNonProductionEnvironment()) {
    if (location.pathname !== '/payees') {
      throw new Error(
        `Possibly invalid use of ManageRulesModal, add the current url \`${location.pathname}\` to the allowlist if you’re confident the modal can never appear on top of the \`/rules\` page.`,
      );
    }
  }

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
