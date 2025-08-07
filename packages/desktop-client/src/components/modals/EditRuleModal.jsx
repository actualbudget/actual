import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { RuleEditor } from '@desktop-client/components/rules/RuleEditor';

export function EditRuleModal({
  rule: defaultRule,
  onSave: originalOnSave = undefined,
}) {
  const { t } = useTranslation();

  const handleSave = async (rule) => {
    if (originalOnSave) {
      await originalOnSave(rule);
    }
  };

  return (
    <Modal name="edit-rule">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Rule')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <RuleEditor
            rule={defaultRule}
            onSave={async (rule) => {
              await handleSave(rule);
              close();
            }}
            onCancel={close}
            showTransactionPreview={true}
            style={{
              maxWidth: '100%',
              width: 900,
              height: '80vh',
              flexGrow: 0,
              flexShrink: 0,
              flexBasis: 'auto',
              overflow: 'hidden',
            }}
          />
        </>
      )}
    </Modal>
  );
}
