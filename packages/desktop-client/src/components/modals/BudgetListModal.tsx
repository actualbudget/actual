import React from 'react';
import { useSelector } from 'react-redux';

import { useMetadataPref } from '../../hooks/useMetadataPref';
import { Modal, ModalHeader, ModalCloseButton } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { BudgetList } from '../manager/BudgetList';

const MODAL_NAME = 'budget-list' as const;

type BudgetListModalProps = {
  name: typeof MODAL_NAME;
};

export function BudgetListModal({ name = MODAL_NAME }: BudgetListModalProps) {
  const [id] = useMetadataPref('id');
  const currentFile = useSelector(state =>
    state.budgets.allFiles?.find(f => 'id' in f && f.id === id),
  );

  return (
    <Modal name={name}>
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
BudgetListModal.modalName = MODAL_NAME;
