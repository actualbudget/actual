import { EnableBankingTransaction } from './enablebanking.js';
import { Transaction } from './models-enablebanking.js';

export interface BankProcessor {
  normalizeTransaction: (transaction: Transaction) => EnableBankingTransaction;
}
