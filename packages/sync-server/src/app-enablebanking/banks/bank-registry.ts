import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import fg from 'fast-glob';

import { BankProcessor } from '../models/bank-processor.js';

import { FallbackBankProcessor } from './fallback.bank.js';

class ProcessorRegistry {
  private map = new Map<string, new () => BankProcessor>();

  register(id: string, ctor: new () => BankProcessor) {
    if (this.map.has(id)) throw new Error(`Duplicate bank processor id: ${id}`);
    this.map.set(id, ctor);
  }
  get(id: string) {
    const Ctor: (new () => BankProcessor) | undefined = this.map.get(id);
    if (!Ctor) {
      console.log(`Enable Banking: No dedicated processor found for '${id}'`);
      return new FallbackBankProcessor();
    }

    if (!(Ctor.prototype instanceof FallbackBankProcessor)) {
      console.warn(`Enable Banking: Unsafe ctor for '${id}', using fallback.`);
      return new FallbackBankProcessor();
    }

    const processor = new Ctor();
    console.debug(
      `Enable Banking: Using '${processor.name}' to process '${id}'.`,
    );
    return processor;
  }
  list() {
    return [...this.map.keys()].sort();
  }
}

export const registry = new ProcessorRegistry();

//This is a decorator that allows a class to be added to the registry when in'app-enablebanking/banks/*.banks.*'.
export function BankProcessorFor(bankIds: string[]) {
  return function <T extends new () => BankProcessor>(ctor: T) {
    for (const bankId of bankIds) {
      registry.register(bankId, ctor);
    }
  };
}

// --- run-once loader used by top-level await ---
let loadOnce: Promise<void> | null = null;
function ensureBankProcessorsLoaded() {
  if (!loadOnce) {
    loadOnce = (async () => {
      const thisDir = path.dirname(fileURLToPath(import.meta.url));
      const patterns = '**/*.bank.*';

      const files = await fg(patterns, { cwd: thisDir, absolute: true });
      const seen = new Set<string>();
      for (const abs of files) {
        const rp = await fs.realpath(abs).catch(() => abs);
        if (seen.has(rp)) continue;
        seen.add(rp);
        await import(pathToFileURL(rp).href); // decorators run -> registry fills
      }
    })();
  }
  return loadOnce;
}

export async function getLoadedRegistry() {
  await ensureBankProcessorsLoaded();
  return registry;
}
