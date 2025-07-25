import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import {
  Modal,
  ModalHeader,
  ModalCloseButton,
} from '@desktop-client/components/common/Modal';
import { BudgetFileSelection } from '@desktop-client/components/manager/BudgetFileSelection';
import { useMetadataPref } from '@desktop-client/hooks/useMetadataPref';
import { useSelector } from '@desktop-client/redux';

export function BudgetFileSelectionModal() {
  const { t } = useTranslation();
  const [id] = useMetadataPref('id');
  const currentFile = useSelector(state =>
    state.budgets.allFiles?.find(f => 'id' in f && f.id === id),
  );

  return (
    <Modal name="budget-file-selection">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Switch Budget File')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              margin: '20px 0',
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: 400 }}>
              <Trans>Switching from:</Trans>
            </Text>
            <Text style={{ fontSize: 17, fontWeight: 700 }}>
              {currentFile?.name}
            </Text>
          </View>
          <BudgetFileSelection showHeader={false} quickSwitchMode={true} />
        </>
      )}
    </Modal>
  );
}
