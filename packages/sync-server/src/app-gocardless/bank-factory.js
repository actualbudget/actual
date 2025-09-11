import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import IntegrationBank from './banks/integration-bank.js';

const dirname = path.resolve(fileURLToPath(import.meta.url), '..');
const banksDir = path.resolve(dirname, 'banks');

async function loadBanks() {
  const bankHandlers = fs
    .readdirSync(banksDir)
    .filter(filename => filename.includes('_') && filename.endsWith('.js'));

  const imports = await Promise.all(
    bankHandlers.map(file => {
      const fileUrlToBank = pathToFileURL(path.resolve(banksDir, file)); // pathToFileURL for ESM compatibility
      return import(fileUrlToBank.toString()).then(handler => handler.default);
    }),
  );

  return imports;
}

export const banks = await loadBanks();

export function BankFactory(institutionId) {
  return (
    banks.find(b => b.institutionIds.includes(institutionId)) || IntegrationBank
  );
}

