// @ts-strict-ignore
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';

import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { ManageRules } from '../ManageRules';

const MODAL_NAME = 'manage-rules' as const;

type ManageRulesModalProps = {
  name: typeof MODAL_NAME;
  payeeId?: string;
};

export function ManageRulesModal({
  name = MODAL_NAME,
  payeeId,
}: ManageRulesModalProps) {
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
    <Modal name={name} isLoading={loading}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Rules"
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <ManageRules isModal payeeId={payeeId} setLoading={setLoading} />
        </>
      )}
    </Modal>
  );
}
ManageRulesModal.modalName = MODAL_NAME;
