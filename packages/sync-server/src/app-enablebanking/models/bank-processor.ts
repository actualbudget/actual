import type { components } from './enablebanking-openapi.js';
import type { Transaction } from './enablebanking.js';

export type BankProcessor = {
  debug: boolean;
  name: string;
  normalizeTransaction: (
    transaction: components['schemas']['Transaction'],
  ) => Transaction;
};
