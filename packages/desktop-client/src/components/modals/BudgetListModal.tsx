import React from 'react';
import { useSelector } from 'react-redux';

import { useLocalPref } from '../../hooks/useLocalPref';
import { Modal } from '../common/Modal';
import { BudgetList } from '../manager/BudgetList';
import { type CommonModalProps } from '../Modals';

type BudgetListModalProps = {
  modalProps: CommonModalProps;
};

export function BudgetListModal({ modalProps }: BudgetListModalProps) {
  const [id] = useLocalPref('id');
  const allFiles = useSelector(state => state.budgets.allFiles);
  const currentFile = allFiles.find(f => f.id === id);
  return (
    <Modal
      title={`From: ${currentFile?.name}`}
      showHeader
      focusAfterClose={false}
      {...modalProps}
      padding={0}
      style={{
        flex: 1,
        height: '50vh',
        padding: '0 10px',
        paddingBottom: 10,
        borderRadius: '6px',
      }}
    >
      <BudgetList showHeader={false} quickSwitchMode={true} />
    </Modal>
  );
}
