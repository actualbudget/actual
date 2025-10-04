#!/usr/bin/env npx tsx
/**
 * Script to inject currency names from loot-core/shared/currencies.ts
 * into the i18n translation files.
 *
 * This runs after i18next-parser extracts translations from source code.
 * Currency names need to be injected because t(currency.name) uses dynamic keys
 * that can't be statically extracted.
 *
 * Usage: npx tsx bin/inject-currency-translations.ts
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Import currencies from loot-core
// eslint-disable-next-line typescript-paths/absolute-parent-import
import { currencies } from '../../loot-core/src/shared/currencies';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOCALE_DIR = join(__dirname, '..', 'locale');
const EN_LOCALE_FILE = join(LOCALE_DIR, 'en.json');

function injectCurrencyTranslations() {
  console.log('Injecting currency name translations...');

  // Read the existing en.json file
  if (!existsSync(EN_LOCALE_FILE)) {
    console.error(`Locale file not found: ${EN_LOCALE_FILE}`);
    process.exit(1);
  }

  const existingTranslations = JSON.parse(
    readFileSync(EN_LOCALE_FILE, 'utf-8'),
  ) as Record<string, string>;

  // Count new and existing currency names
  let added = 0;
  let existing = 0;

  // Add each currency name (skip empty codes)
  for (const currency of currencies) {
    if (currency.code === '' || currency.name === '') {
      continue;
    }

    // Only add if not already present
    if (!(currency.name in existingTranslations)) {
      existingTranslations[currency.name] = currency.name;
      added++;
    } else {
      existing++;
    }
  }

  // Sort the keys alphabetically (matching i18next-parser's sort: true)
  const sortedTranslations: Record<string, string> = {};
  for (const key of Object.keys(existingTranslations).sort()) {
    sortedTranslations[key] = existingTranslations[key];
  }

  // Write back to en.json
  writeFileSync(
    EN_LOCALE_FILE,
    JSON.stringify(sortedTranslations, null, 2) + '\n',
    'utf-8',
  );

  console.log(`  Added ${added} new currency names`);
  console.log(`  ${existing} currency names already existed`);
  console.log(`  Total: ${currencies.length - 1} currencies (excluding empty)`);
  console.log(`Done! Updated ${EN_LOCALE_FILE}`);
}

injectCurrencyTranslations();
