import React from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';

import type { RuleEntity, NewRuleEntity } from 'loot-core/types/models';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { RuleEditor } from '@desktop-client/components/rules/RuleEditor';

type EditRuleModalProps = {
  rule: RuleEntity | NewRuleEntity;
  onSave?: (rule: RuleEntity) => void;
};

export function EditRuleModal({
  rule: defaultRule,
  onSave = undefined,
}: EditRuleModalProps) {
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
            onSave={onSave}
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
