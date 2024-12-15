import { TransactionEntity } from 'loot-core/types/models';

export interface ToolsHandlers {
  'tools/fix-split-transactions': () => Promise<{
    numBlankPayees: number;
    numCleared: number;
    numDeleted: number;
    mismatchedSplits: TransactionEntity[];
  }>;
}
