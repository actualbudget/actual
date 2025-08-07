import React from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';

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
            onSave={originalOnSave}
            onCancel={close}
            style={{
              maxWidth: '100%',
              width: 900,
              height: '80vh',
              flexGrow: 0,
              flexShrink: 0,
              flexBasis: 'auto',
              overflow: 'hidden',
              color: theme.pageTextLight,
            }}
          />
        </>
      )}
    </Modal>
  );
}
