import { EnableBankingTransaction } from '../models/enablebanking.js';
import { Transaction } from '../models/models-enablebanking.js';

import { BankProcessorFor } from './bank-registry.js';
import { FallbackBankProcessor } from './fallback.bank.js';

@BankProcessorFor(['NL_Rabobank'])
export class RabobankProcessor extends FallbackBankProcessor {
  normalizeTransaction(t: Transaction): EnableBankingTransaction {
    const transaction = super.normalizeTransaction(t);
    return transaction;
  }
}
