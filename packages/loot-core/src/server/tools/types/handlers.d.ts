import { TransactionEntity } from '../../../types/models';

export interface ToolsHandlers {
  'tools/fix-split-transactions': () => Promise<{
    numBlankPayees: number;
    numCleared: number;
    numDeleted: number;
    numTransfersFixed: number;
    numNonParentErrorsFixed: number;
    mismatchedSplits: TransactionEntity[];
  }>;
}
