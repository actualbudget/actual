import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import * as undo from '@actual-app/core/platform/client/undo';
import type { NewRuleEntity, RuleEntity } from '@actual-app/core/types/models';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { RuleEditor } from '#components/rules/RuleEditor';

type EditRuleModalProps = {
  rule: RuleEntity | NewRuleEntity;
  onSave?: (rule: RuleEntity) => void;
};

export function EditRuleModal({
  rule: defaultRule,
  onSave: originalOnSave,
}: EditRuleModalProps) {
  const { t } = useTranslation();

  // Tag this modal on the undo state so that undoing a change made from here
  // reopens the rule rather than navigating back to the rules page.
  useEffect(() => {
    // Restore rather than clear on cleanup: `openModal` is global, so a modal
    // opened underneath this one would otherwise lose its own tag.
    const previousOpenModal = undo.getUndoState('openModal');
    const openModal = {
      name: 'edit-rule',
      options: { rule: defaultRule },
    };

    undo.setUndoState('openModal', openModal);

    return () => {
      // Only hand the tag back if we still own it. When this modal and the one
      // underneath it are removed together, that one cleans up first, and
      // restoring our captured value here would resurrect a tag for a modal
      // that is already gone.
      if (undo.getUndoState('openModal') === openModal) {
        undo.setUndoState('openModal', previousOpenModal);
      }
    };
  }, [defaultRule]);

  return (
    <Modal name="edit-rule">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Rule')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <RuleEditor
            rule={defaultRule}
            onSave={rule => {
              originalOnSave?.(rule);
              state.close();
            }}
            onCancel={() => state.close()}
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
