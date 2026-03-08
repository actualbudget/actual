import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import createDebug from 'debug';
import fg from 'fast-glob';

import type { BankProcessor } from '../models/bank-processor.js';

import { createFallbackBankProcessor } from './fallback.bank.js';

const debug = createDebug('actual:enablebanking:registry');

export type BankProcessorRegistration = {
  bankIds: string[];
  createProcessor: () => BankProcessor;
};

class ProcessorRegistry {
  private map = new Map<string, () => BankProcessor>();

  register(id: string, createProcessor: () => BankProcessor) {
    if (this.map.has(id)) throw new Error(`Duplicate bank processor id: ${id}`);
    this.map.set(id, createProcessor);
  }

  registerForBanks(bankIds: string[], createProcessor: () => BankProcessor) {
    for (const bankId of bankIds) {
      this.register(bankId, createProcessor);
    }
  }

  get(id: string): BankProcessor {
    const createProcessor = this.map.get(id);
    if (!createProcessor) {
      debug('No dedicated processor found for %s', id);
      return createFallbackBankProcessor();
    }

    if (typeof createProcessor !== 'function') {
      debug('Unsafe processor factory type: %s', typeof createProcessor);
      return createFallbackBankProcessor();
    }

    try {
      const processor = createProcessor();
      if (!isValidProcessor(processor)) {
        debug('Invalid bank processor object for %s', id);
        return createFallbackBankProcessor();
      }
      debug('Using %s to process %s', processor.name, id);
      return processor;
    } catch (error) {
      debug('Error creating processor for %s: %O', id, error);
      return createFallbackBankProcessor();
    }
  }

  list() {
    return [...this.map.keys()].sort();
  }
}

export const registry = new ProcessorRegistry();

function isObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object';
}

function isValidProcessor(value: unknown): value is BankProcessor {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.name === 'string' &&
    typeof value.debug === 'boolean' &&
    typeof value.normalizeTransaction === 'function'
  );
}

function isBankProcessorRegistration(
  value: unknown,
): value is BankProcessorRegistration {
  if (!isObject(value)) {
    return false;
  }

  const bankIds = value.bankIds;
  const createProcessor = value.createProcessor;

  return (
    Array.isArray(bankIds) &&
    bankIds.length > 0 &&
    bankIds.every(bankId => typeof bankId === 'string' && bankId.length > 0) &&
    typeof createProcessor === 'function'
  );
}

function registerFromModule(moduleExport: unknown, modulePath: string) {
  if (!isObject(moduleExport)) {
    return;
  }

  const registrations = moduleExport.bankProcessorRegistrations;
  if (!Array.isArray(registrations)) {
    return;
  }

  for (const registration of registrations) {
    if (!isBankProcessorRegistration(registration)) {
      debug('Skipping invalid registration object from %s', modulePath);
      continue;
    }

    registry.registerForBanks(
      registration.bankIds,
      registration.createProcessor,
    );
  }
}

// --- run-once loader used by top-level await ---
let loadOnce: Promise<void> | null = null;
function ensureBankProcessorsLoaded() {
  if (!loadOnce) {
    loadOnce = (async () => {
      const thisDir = path.dirname(fileURLToPath(import.meta.url));
      const patterns = '**/*.bank.{js,cjs,mjs,ts}';

      const files = await fg(patterns, {
        cwd: thisDir,
        absolute: true,
        ignore: ['**/*.map', '**/*.d.ts'],
      });
      const seen = new Set<string>();
      for (const abs of files) {
        const rp = await fs.realpath(abs).catch(() => abs);
        if (seen.has(rp)) continue;
        seen.add(rp);
        try {
          const importedModule = await import(pathToFileURL(rp).href);
          registerFromModule(importedModule, rp);
        } catch (error) {
          console.error(`Failed to import bank processor from ${rp}:`, error);
          // Continue loading other processors
        }
      }
    })();
  }
  return loadOnce;
}

export async function getLoadedRegistry() {
  await ensureBankProcessorsLoaded();
  return registry;
}
