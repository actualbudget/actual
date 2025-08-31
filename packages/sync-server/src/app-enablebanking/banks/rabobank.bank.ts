import { components } from '../models/enablebanking-openapi.js';
import { Transaction } from '../models/enablebanking.js';

import { BankProcessorFor } from './bank-registry.js';
import { FallbackBankProcessor } from './fallback.bank.js';

@BankProcessorFor(['NL_Rabobank'])
export class RabobankBankProcessor extends FallbackBankProcessor {
  name = 'RabobankBankProcessor';
  normalizeTransaction(
    t: components['schemas']['Transaction'],
  ): Transaction {
    const transaction = super.normalizeTransaction(t);
    return transaction;
  }
}
