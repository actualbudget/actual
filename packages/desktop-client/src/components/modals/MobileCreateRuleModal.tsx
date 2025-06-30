import React from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { Modal, ModalCloseButton, ModalHeader } from '@desktop-client/components/common/Modal';

type MobileCreateRuleModalProps = {
  // Empty for now - will be expanded when rule creation functionality is added
};

export function MobileCreateRuleModal({}: MobileCreateRuleModalProps) {
  const { t } = useTranslation();

  return (
    <Modal name="mobile-create-rule">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Create Rule')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              padding: 20,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
            }}
          >
            <Text style={{ fontSize: 16, textAlign: 'center' }}>
              {t('Rule creation interface will be implemented here.')}
            </Text>
          </View>
        </>
      )}
    </Modal>
  );
}