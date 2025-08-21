import { components } from './enablebanking-openapi.js';
import { EnableBankingTransaction } from './enablebanking.js';

export interface BankProcessor {
  debug: boolean;
  name: string;
  normalizeTransaction: (
    transaction: components['schemas']['Transaction'],
    edited_transaction?: EnableBankingTransaction,
  ) => EnableBankingTransaction;
}
