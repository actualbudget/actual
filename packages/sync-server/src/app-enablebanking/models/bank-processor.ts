import { components } from './enablebanking-openapi.js';
import { Transaction } from './enablebanking.js';

export interface BankProcessor {
  debug: boolean;
  name: string;
  normalizeTransaction: (
    transaction: components['schemas']['Transaction'],
    edited_transaction?: Transaction,
  ) => Transaction;
}
