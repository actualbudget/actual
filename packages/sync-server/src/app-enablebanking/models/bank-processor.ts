import { EnableBankingTransaction } from './enablebanking.js';
import { Transaction } from './models-enablebanking.js';

export interface BankProcessor {
  debug: boolean;
  name: string;
  normalizeTransaction: (transaction: Transaction) => EnableBankingTransaction;
}
