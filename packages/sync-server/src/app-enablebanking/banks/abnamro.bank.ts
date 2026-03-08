import type { components } from '../models/enablebanking-openapi.js';
import type { Transaction } from '../models/enablebanking.js';

import type { BankProcessorRegistration } from './bank-registry.js';
import { normalizeFallbackTransaction } from './fallback.bank.js';
import { isKeyValueCache } from './utils.js';

function getNoteFromRemittance(remittance_information: string[]) {
  const keyValueCache = isKeyValueCache(remittance_information);
  if (keyValueCache) {
    const notes_parts: string[] = [];
    if (keyValueCache.map.has('Omschrijving')) {
      const omschrijving = keyValueCache.map.get('Omschrijving');
      if (omschrijving != null) {
        notes_parts.push(omschrijving);
      }
    }
    if (keyValueCache.map.has('Kenmerk')) {
      const kenmerk = keyValueCache.map.get('Kenmerk');
      if (kenmerk != null) {
        notes_parts.push(`kenmerk: ${kenmerk}`);
      }
    }
    if (keyValueCache.header) {
      notes_parts.push(keyValueCache.header);
    }
    if (notes_parts.length) {
      return notes_parts.join(' | ');
    }
  }
  return remittance_information.join(' ');
}

function normalizeABNAmroTransaction(
  t: components['schemas']['Transaction'],
): Transaction {
  const transaction = normalizeFallbackTransaction(t);
  const remittanceInfo = transaction.remittance_information;
  if (remittanceInfo && Array.isArray(remittanceInfo)) {
    transaction.notes = getNoteFromRemittance(remittanceInfo);
  }

  return transaction;
}

export function createABNAmroBankProcessor() {
  return {
    debug: false,
    name: 'ABNAmroBankProcessor',
    normalizeTransaction: normalizeABNAmroTransaction,
  };
}

export const bankProcessorRegistrations = [
  {
    bankIds: ['NL_ABN AMRO'],
    createProcessor: createABNAmroBankProcessor,
  },
] satisfies BankProcessorRegistration[];
