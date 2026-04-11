import type { TransactionEntity } from 'loot-core/types/models';

import type { TransactionRowContentProps } from '../types';

import { PreviewTransactionRowCells } from './PreviewTransactionRowCells';
import { RegularTransactionRowCells } from './RegularTransactionRowCells';
import { SplitChildTransactionRowCells } from './SplitChildTransactionRowCells';
import { SplitParentTransactionRowCells } from './SplitParentTransactionRowCells';

type TransactionRowCellsProps = TransactionRowContentProps & {
  isExpanded: boolean;
  onToggleRowExpansion: () => void;
};

function isPreviewTransaction(transaction: TransactionEntity) {
  return transaction.id?.startsWith('preview/');
}

export function TransactionRowCells(props: TransactionRowCellsProps) {
  const { transaction, isExpanded, onToggleRowExpansion } = props;

  if (transaction.is_child) {
    return <SplitChildTransactionRowCells {...props} />;
  }

  if (isPreviewTransaction(transaction)) {
    return (
      <PreviewTransactionRowCells
        {...props}
        isExpanded={isExpanded}
        onToggleRowExpansion={onToggleRowExpansion}
      />
    );
  }

  if (transaction.is_parent) {
    return (
      <SplitParentTransactionRowCells
        {...props}
        isExpanded={isExpanded}
        onToggleRowExpansion={onToggleRowExpansion}
      />
    );
  }

  return (
    <RegularTransactionRowCells
      {...props}
      isExpanded={isExpanded}
      onToggleRowExpansion={onToggleRowExpansion}
    />
  );
}
