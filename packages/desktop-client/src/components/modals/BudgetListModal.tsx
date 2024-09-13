import React from 'react';
import { useSelector } from 'react-redux';

import { useMetadataPref } from '../../hooks/useMetadataPref';
import { Modal, ModalHeader, ModalCloseButton } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { BudgetList } from '../manager/BudgetList';

export function BudgetListModal() {
  const [id] = useMetadataPref('id');
  const currentFile = useSelector(state =>
    state.budgets.allFiles?.find(f => 'id' in f && f.id === id),
  );

  return (
    <Modal name="budget-list">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Switch Budget File"
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
              Switching from:
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
