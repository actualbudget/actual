import { components } from '../models/enablebanking-openapi.js';
import { EnableBankingTransaction } from '../models/enablebanking.js';

import { BankProcessorFor } from './bank-registry.js';
import { FallbackBankProcessor } from './fallback.bank.js';
import { isKeyValueCache } from './utils.js';

@BankProcessorFor(['NL_ABN AMRO'])
export class ABNAmroBankProcessor extends FallbackBankProcessor {
  name = 'ABNAmroBankProcessor';
  getNoteFromRemittance(remittance_information: string[]) {
    const keyValueCache = isKeyValueCache(remittance_information);
    if (keyValueCache) {
      const notes_parts: string[] = [];
      if (keyValueCache.map.has('Omschrijving')) {
        notes_parts.push(keyValueCache.map.get('Omschrijving') as string);
      }
      if (keyValueCache.map.has('Kenmerk')) {
        notes_parts.push(`kenmerk: ${keyValueCache.map.get('Kenmerk')}`);
      }
      if (keyValueCache.header) {
        notes_parts.push(keyValueCache.header);
      }
      if (notes_parts.length) {
        return notes_parts.join(' | ');
      }
    }
    return remittance_information.join('');
  }

  normalizeTransaction(
    t: components['schemas']['Transaction'],
  ): EnableBankingTransaction {
    const transaction = super.normalizeTransaction(t);
    if (transaction.remittance_information) {
      transaction.notes = this.getNoteFromRemittance(
        transaction.remittance_information as string[],
      );
    }

    return transaction;
  }
}
