import React from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { useMetadataPref } from '../../hooks/useMetadataPref';
import { useSelector } from '../../redux';
import { Modal, ModalHeader, ModalCloseButton } from '../common/Modal';
import { BudgetList } from '../manager/BudgetList';

export function BudgetListModal() {
  const { t } = useTranslation();
  const [id] = useMetadataPref('id');
  const currentFile = useSelector(state =>
    state.budgets.allFiles?.find(f => 'id' in f && f.id === id),
  );

  return (
    <Modal name="budget-list">
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
              {t('Switching from:')}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: 700 }}>
              {currentFile?.name}
            </Text>
          </View>
          <BudgetList showHeader={false} quickSwitchMode={true} />
        </>
      )}
    </Modal>
  );
}
