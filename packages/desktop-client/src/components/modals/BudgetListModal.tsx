import React from 'react';
import { useSelector } from 'react-redux';

import { useLocalPref } from '../../hooks/useLocalPref';
import { Modal } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { BudgetList } from '../manager/BudgetList';
import { type CommonModalProps } from '../Modals';

type BudgetListModalProps = {
  modalProps: CommonModalProps;
};

export function BudgetListModal({ modalProps }: BudgetListModalProps) {
  const [id] = useLocalPref('id');
  const currentFile = useSelector(state =>
    state.budgets.allFiles?.find(f => 'id' in f && f.id === id),
  );

  return (
    <Modal
      title="Switch Budget File"
      showHeader
      focusAfterClose={false}
      {...modalProps}
    >
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          margin: '20px 0',
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: 400 }}>Switching from:</Text>
        <Text style={{ fontSize: 17, fontWeight: 700 }}>
          {currentFile?.name}
        </Text>
      </View>
      <BudgetList showHeader={false} quickSwitchMode={true} />
    </Modal>
  );
}
