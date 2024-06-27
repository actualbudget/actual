// @ts-strict-ignore
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';

import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
import { ManageRules } from '../ManageRules';
import { type CommonModalProps } from '../Modals';

type ManageRulesModalProps = {
  modalProps: CommonModalProps;
  payeeId?: string;
};

export function ManageRulesModal({
  modalProps,
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
    <Modal isLoading={loading} {...modalProps}>
      {({ close }) => (
        <>
          <ModalHeader
            title="Rules"
            rightContent={<ModalCloseButton onClick={close} />}
          />
          <ManageRules isModal payeeId={payeeId} setLoading={setLoading} />
        </>
      )}
    </Modal>
  );
}
