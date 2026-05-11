import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '@actual-app/components/view';
import type { SplitTransactionModalProps } from '../types';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';

import { SplitTransactionEditorList } from './SplitTransactionEditorList';
import { SplitTransactionFooter } from './SplitTransactionFooter';
import { SplitTransactionSummary } from './SplitTransactionSummary';
import {
  buildSplitChildren,
  useSplitTransactionEditor,
} from './useSplitTransactionEditor';

export function SplitTransactionModal({
  transaction,
  childTransactions = [],
  categoryGroups,
  onSave,
  onClose,
}: SplitTransactionModalProps) {
  const { t } = useTranslation();
  const {
    splits,
    remainingAmount,
    percentageAllocated,
    isValid,
    addSplit,
    removeSplit,
    updateSplit,
    distributeRemainder,
  } = useSplitTransactionEditor(transaction, childTransactions);

  const handleSave = useCallback(async () => {
    if (!isValid) {
      return;
    }

    await onSave(transaction, buildSplitChildren(transaction, splits));
    onClose();
  }, [isValid, splits, transaction, onSave, onClose]);

  return (
    <Modal name="split-transaction" onClose={onClose}>
      {({ state }) => {
        const handleClose = () => state.close();
        return (
          <>
            <ModalHeader
              title={t('Split Transaction')}
              rightContent={<ModalCloseButton onPress={handleClose} />}
            />
            <View style={{ padding: 20, maxWidth: 700 }}>
              <SplitTransactionSummary
                transaction={transaction}
                percentageAllocated={percentageAllocated}
                remainingAmount={remainingAmount}
              />
              <SplitTransactionEditorList
                transaction={transaction}
                categoryGroups={categoryGroups}
                splits={splits}
                remainingAmount={remainingAmount}
                onAddSplit={addSplit}
                onRemoveSplit={removeSplit}
                onDistributeRemainder={distributeRemainder}
                onUpdateSplit={updateSplit}
              />
              <SplitTransactionFooter
                isValid={isValid}
                remainingAmount={remainingAmount}
                hasUncategorizedSplit={splits.some(split => !split.category)}
                onCancel={handleClose}
                onSave={handleSave}
              />
            </View>
          </>
        );
      }}
    </Modal>
  );
}
