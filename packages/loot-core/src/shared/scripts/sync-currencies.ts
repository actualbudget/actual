/**
 * Script to sync currencies.ts with openexchangerates.org supported currencies.
 *
 * Usage: npx tsx packages/loot-core/src/shared/scripts/sync-currencies.ts
 *
 * This script will:
 * 1. Fetch the current list of supported currencies from openexchangerates.org
 * 2. Compare with the currencies defined in currencies.ts
 * 3. Report any missing or extra currencies
 * 4. Optionally show suggested changes (with --update flag)
 */

/* eslint-disable actual/typography */
import { currencies, type Currency } from '../currencies';

declare const process: { argv: string[] };

const OPENEXCHANGERATES_URL = (() => {
  const url = new URL('https://openexchangerates.org/api/currencies.json');
  const searchParams = new URLSearchParams({
    prettyprint: 'false',
    show_alternative: 'false',
    show_inactive: 'false',
  });
  url.search = searchParams.toString();
  return url.toString();
})();

const LOCALEPLANET_URL =
  'https://www.localeplanet.com/api/auto/currencymap.json?name=Y';

// Currencies marked as deprecated in openexchangerates.
// These are still returned today but may disappear in a future sync.
const DEPRECATED_CURRENCIES = new Set([
  'ANG',
  'SLL',
  'STD',
  'VEF',
  'ZWL',
]);

type LocalePlanetCurrency = {
  name: string;
  decimal_digits: number;
  symbol_native: string;
  symbol: string;
};

// Currencies where our symbol intentionally differs from localeplanet's native symbol
// These are excluded from the symbol mismatch check
type ExpectedSymbolMismatch = {
  code: string;
  expected: string;
  localeplanet: string;
  reasoning: string;
};

const EXPECTED_SYMBOL_MISMATCHES = [
  {
    code: 'CLF',
    expected: 'UF',
    localeplanet: 'CLF',
    reasoning: 'Use "Unidad de Fomento" - standard Chilean abbreviation',
  },
  {
    code: 'CNH',
    expected: 'CN¥',
    localeplanet: '¥',
    reasoning: 'Use to disambiguate offshore yuan from CNY',
  },
  {
    code: 'CUC',
    expected: 'CUC$',
    localeplanet: 'CUC',
    reasoning: 'Use for disambiguation',
  },
  {
    code: 'CVE',
    expected: 'Esc',
    localeplanet: '',
    reasoning: 'Use Escudo',
  },
  {
    code: 'JPY',
    expected: '¥',
    localeplanet: '￥',
    reasoning: 'Use half-width "¥" (U+00A5) for universal compatibility',
  },
  {
    code: 'RON',
    expected: 'lei',
    localeplanet: 'leu',
    reasoning: 'Use plural form',
  },
  {
    code: 'RSD',
    expected: 'дин',
    localeplanet: 'RSD',
    reasoning: 'Use Cyrillic for dinar - standard Serbian notation',
  },
  {
    code: 'SOS',
    expected: 'Sh.So.',
    localeplanet: 'S',
    reasoning: 'Use "Somali Shilling" for clarity',
  },
  {
    code: 'THB',
    expected: '฿',
    localeplanet: 'THB',
    reasoning: 'Use native "฿" symbol',
  },
  {
    code: 'UYU',
    expected: '$U',
    localeplanet: '$',
    reasoning: 'Use standard Uruguayan peso notation',
  },
  {
    code: 'VEF',
    expected: 'Bs.F',
    localeplanet: 'Bs',
    reasoning:
      'Use "Bolívar Fuerte"; deprecated currency with minor difference',
  },
] satisfies ReadonlyArray<ExpectedSymbolMismatch>;

const EXPECTED_SYMBOL_MISMATCHES_BY_CODE = new Map(
  EXPECTED_SYMBOL_MISMATCHES.map(entry => [entry.code, entry]),
);

async function fetchOpenExchangeRatesCurrencies(): Promise<
  Record<string, string>
> {
  const response = await fetch(OPENEXCHANGERATES_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch currencies: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

async function fetchLocalePlanetCurrencies(): Promise<
  Record<string, LocalePlanetCurrency>
> {
  const response = await fetch(LOCALEPLANET_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch localeplanet data: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

function getLocalCurrencies(): Map<string, Currency> {
  const currencyMap = new Map<string, Currency>();
  for (const currency of currencies) {
    if (currency.code !== '') {
      currencyMap.set(currency.code, currency);
    }
  }
  return currencyMap;
}

function generateCurrencyEntry(
  code: string,
  name: string,
  localePlanetData?: LocalePlanetCurrency,
): string {
  const lpData = localePlanetData;
  const currencyName = lpData?.name || name;
  let symbol = lpData?.symbol_native || code;
  const decimalPlaces = lpData?.decimal_digits ?? 2;

  // Disambiguate common symbols by prefixing with country code
  // e.g., AUD -> AU$, CAD -> CA$, FKP -> FK£, GIP -> GI£
  // Keep USD as plain $ and GBP as plain £ (base currencies)
  if (symbol === '$' && code !== 'USD') {
    const prefix = code.slice(0, 2);
    symbol = `${prefix}$`;
  } else if (symbol === '£' && code !== 'GBP') {
    const prefix = code.slice(0, 2);
    symbol = `${prefix}£`;
  }

  return `{ code: '${code}', name: '${currencyName}', symbol: '${symbol}', decimalPlaces: ${decimalPlaces}, numberFormat: 'comma-dot', symbolFirst: true }, // TODO: Review numberFormat and symbolFirst`;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldUpdate = args.includes('--update');

  console.log('Fetching currencies from openexchangerates.org...');
  const oxrCurrencies = await fetchOpenExchangeRatesCurrencies();
  const oxrCodes = new Set(Object.keys(oxrCurrencies));

  console.log(`Found ${oxrCodes.size} currencies from openexchangerates.org\n`);

  console.log('Fetching currency metadata from localeplanet.com...');
  const localePlanetCurrencies = await fetchLocalePlanetCurrencies();
  console.log(
    `Found ${Object.keys(localePlanetCurrencies).length} currencies from localeplanet.com\n`,
  );

  console.log('Loading currencies from currencies.ts...');
  const localCurrencies = getLocalCurrencies();
  const localCodes = new Set(localCurrencies.keys());

  console.log(`Found ${localCodes.size} currencies in currencies.ts\n`);

  // Check for duplicate currency codes
  const seenCodes = new Map<string, Currency[]>();
  for (const currency of currencies) {
    if (currency.code === '') continue;
    const existing = seenCodes.get(currency.code) || [];
    existing.push(currency);
    seenCodes.set(currency.code, existing);
  }

  const duplicates = [...seenCodes.entries()].filter(
    ([, entries]) => entries.length > 1,
  );

  if (duplicates.length > 0) {
    console.log(`❌ Duplicate currency codes found (${duplicates.length}):\n`);
    for (const [code, entries] of duplicates.sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      console.log(`   ${code} appears ${entries.length} times:`);
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        console.log(
          `     [${i + 1}] name: "${entry.name}", symbol: "${entry.symbol}", decimalPlaces: ${entry.decimalPlaces}, numberFormat: "${entry.numberFormat}", symbolFirst: ${entry.symbolFirst}`,
        );
      }
      console.log();
    }
  } else {
    console.log('✅ No duplicate currencies\n');
  }

  // Find missing currencies (in OXR but not in local)
  const missingCurrencies: string[] = [];
  for (const code of oxrCodes) {
    if (!localCodes.has(code)) {
      missingCurrencies.push(code);
    }
  }

  // Find extra currencies (in local but not in OXR)
  const extraCurrencies: string[] = [];
  for (const code of localCodes) {
    if (!oxrCodes.has(code)) {
      extraCurrencies.push(code);
    }
  }

  // Report results
  if (missingCurrencies.length > 0) {
    console.log(
      '❌ Missing currencies (in openexchangerates but not in currencies.ts):',
    );
    for (const code of missingCurrencies.sort()) {
      const name = oxrCurrencies[code];
      console.log(`   ${code}: ${name}`);
    }
    console.log();
  } else {
    console.log('✅ No missing currencies\n');
  }

  if (extraCurrencies.length > 0) {
    console.log(
      '❌ Extra currencies (in currencies.ts but not in openexchangerates):',
    );
    for (const code of extraCurrencies.sort()) {
      const currency = localCurrencies.get(code);
      console.log(`   ${code}: ${currency?.name}`);
    }
    console.log();
  } else {
    console.log('✅ No extra currencies\n');
  }

  // Summary
  const isInSync =
    missingCurrencies.length === 0 && extraCurrencies.length === 0;
  if (isInSync) {
    console.log('✅ currencies.ts is in sync with openexchangerates.org!');

    // Check for symbol mismatches with localeplanet data
    console.log('\nChecking symbol accuracy against localeplanet.com...');

    const symbolMismatches: Array<{
      code: string;
      current: string;
      expected: string;
    }> = [];
    const expectedMismatchDrift: Array<{
      code: string;
      current: string;
      expected: string;
      localeplanet: string;
      reasoning: string;
    }> = [];

    for (const [code, currency] of localCurrencies) {
      // Skip currencies with expected/intentional mismatches
      const expectedMismatch = EXPECTED_SYMBOL_MISMATCHES_BY_CODE.get(code);
      if (expectedMismatch) {
        if (currency.symbol !== expectedMismatch.expected) {
          expectedMismatchDrift.push({
            code,
            current: currency.symbol,
            expected: expectedMismatch.expected,
            localeplanet: expectedMismatch.localeplanet,
            reasoning: expectedMismatch.reasoning,
          });
        }
        continue;
      }

      const lpData = localePlanetCurrencies[code];
      if (lpData?.symbol_native) {
        // Use endsWith to handle disambiguated symbols (e.g., A$ ends with $)
        if (!currency.symbol.endsWith(lpData.symbol_native)) {
          symbolMismatches.push({
            code,
            current: currency.symbol,
            expected: lpData.symbol_native,
          });
        }
      }
    }

    if (symbolMismatches.length > 0) {
      console.log(
        `\n⚠️  Symbol mismatches (${symbolMismatches.length} currencies):`,
      );
      for (const { code, current, expected } of symbolMismatches.sort((a, b) =>
        a.code.localeCompare(b.code),
      )) {
        console.log(
          `   ${code}: current "${current}" does not end with native "${expected}"`,
        );
      }
      console.log(
        '\n   (Add intentional mismatches to EXPECTED_SYMBOL_MISMATCHES with reasoning)',
      );
    } else {
      console.log('\n✅ All symbols match localeplanet native symbols');
    }

    if (expectedMismatchDrift.length > 0) {
      console.log(
        `\n⚠️  Expected symbol mismatches out of sync (${expectedMismatchDrift.length} currencies):`,
      );
      for (const entry of expectedMismatchDrift.sort((a, b) =>
        a.code.localeCompare(b.code),
      )) {
        console.log(
          `   ${entry.code}: current "${entry.current}"; expected "${entry.expected}"`,
        );
        console.log(
          `     Reasoning: ${entry.reasoning}; localeplanet has "${entry.localeplanet}"`,
        );
      }
    }

    if (EXPECTED_SYMBOL_MISMATCHES.length > 0) {
      console.log(
        `\nℹ️  ${EXPECTED_SYMBOL_MISMATCHES.length} currencies have intentional symbol differences (see EXPECTED_SYMBOL_MISMATCHES)`,
      );
    }

    const deprecatedInUse: string[] = [];
    for (const code of DEPRECATED_CURRENCIES) {
      if (localCodes.has(code)) {
        deprecatedInUse.push(code);
      }
    }

    if (deprecatedInUse.length > 0) {
      console.log('\n⚠️  Deprecated currencies still in currencies.ts:');
      for (const code of deprecatedInUse.sort()) {
        const currency = localCurrencies.get(code);
        console.log(`   ${code}: ${currency?.name}`);
      }
      console.log(
        '   (These are still in openexchangerates but may be removed in the future)\n',
      );
    }
  } else {
    console.log('📋 Summary:');
    console.log(`   Missing: ${missingCurrencies.length} currencies`);
    console.log(`   Extra: ${extraCurrencies.length} currencies`);

    if (shouldUpdate) {
      console.log('\n🔧 Suggested changes:');

      if (missingCurrencies.length > 0) {
        console.log('\nAdd these entries to currencies.ts:');
        for (const code of missingCurrencies.sort()) {
          console.log(
            generateCurrencyEntry(
              code,
              oxrCurrencies[code],
              localePlanetCurrencies[code],
            ),
          );
        }
      }

      if (extraCurrencies.length > 0) {
        console.log('\nRemove these currency codes from currencies.ts:');
        for (const code of extraCurrencies.sort()) {
          console.log(`   ${code}`);
        }
      }
    } else {
      console.log('\nRun with --update flag to see suggested changes.');
    }
  }
}

main().catch(console.error);
