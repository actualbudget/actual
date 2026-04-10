import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { View } from '@actual-app/components/view';

import type { SplitTransactionModalProps } from '../../types';
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
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Split Transaction')}
            rightContent={<ModalCloseButton onPress={close} />}
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
              onCancel={close}
              onSave={handleSave}
            />
          </View>
        </>
      )}
    </Modal>
  );
}
