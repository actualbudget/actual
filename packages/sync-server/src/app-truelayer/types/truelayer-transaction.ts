import type { TrueLayerRunningBalance } from './truelayer-running-balance';
import type { TrueLayerTransactionMeta } from './truelayer-transaction-meta';

export type TrueLayerTransaction = {
  transaction_id: string;
  timestamp: string;
  description?: string;
  amount: number;
  currency: string;
  transaction_type?: string;
  merchant_name?: string;
  meta?: TrueLayerTransactionMeta;
  running_balance?: TrueLayerRunningBalance;
};
