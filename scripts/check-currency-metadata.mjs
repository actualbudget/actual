import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { currencies } from '../packages/loot-core/src/shared/currencies.ts';

function snapshotCurrencyData(source) {
  const { version, currencyData } = source.supplemental;
  const { fractions, region } = currencyData;
  if (
    !version._cldrVersion ||
    !version._unicodeVersion ||
    !/^[0-9]$/.test(fractions.DEFAULT?._digits) ||
    Object.keys(region).length === 0
  ) {
    throw new Error(
      'Missing CLDR version, default precision or currency regions',
    );
  }
  const defaultDigits = Number(fractions.DEFAULT._digits);
  const exceptions = {};
  for (const [code, entry] of Object.entries(fractions)) {
    if (!/^(DEFAULT|[A-Z]{3})$/.test(code) || !/^[0-9]$/.test(entry._digits)) {
      throw new Error(`Invalid CLDR fraction digits for ${code}`);
    }
    if (Number(entry._digits) !== defaultDigits) {
      exceptions[code] = Number(entry._digits);
    }
  }
  return { defaultDigits, exceptions };
}

export function auditCurrencyMetadata(currencies, metadata, source) {
  const errors = [];
  let exceptions;
  let defaultDigits;
  try {
    ({ defaultDigits, exceptions } = snapshotCurrencyData(source));
  } catch (error) {
    return [`Invalid CLDR source: ${error.message}`];
  }
  const { version, currencyData } = source.supplemental;
  if (
    !/^https:\/\/raw\.githubusercontent\.com\/unicode-org\/cldr-json\/\d+\.\d+\.\d+\/cldr-json\/cldr-core\/supplemental\/currencyData\.json$/.test(
      metadata.source,
    )
  ) {
    errors.push('metadata source must identify a pinned CLDR release');
  } else if (
    metadata.source.split('/')[5].split('.')[0] !== version._cldrVersion
  ) {
    errors.push('metadata source release does not match the snapshot version');
  }
  if (
    createHash('sha256').update(JSON.stringify(source)).digest('hex') !==
    metadata.sourceJsonSha256
  ) {
    errors.push('CLDR source content differs from its reviewed digest');
  }
  if (
    metadata.cldrVersion !== version._cldrVersion ||
    metadata.unicodeVersion !== version._unicodeVersion
  ) {
    errors.push('metadata version differs from the reviewed CLDR source');
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(metadata.reviewedOn) ||
    new Date(metadata.reviewedOn).toJSON()?.slice(0, 10) !== metadata.reviewedOn
  ) {
    errors.push('metadata must include a valid review date');
  }

  // A default fraction digit count does not establish a code's validity.
  const validCodes = new Set(
    Object.values(currencyData.region).flatMap(entries =>
      entries.flatMap(entry =>
        Object.entries(entry)
          .filter(
            ([, period]) =>
              period._tender !== 'false' &&
              (!period._from || period._from <= metadata.reviewedOn) &&
              (!period._to || period._to >= metadata.reviewedOn),
          )
          .map(([code]) => code),
      ),
    ),
  );
  const seen = new Set();
  for (const { code, decimalPlaces } of currencies) {
    if (seen.has(code)) {
      errors.push(`${code} is a duplicate selectable currency`);
    }
    seen.add(code);
    if (code === '') {
      if (decimalPlaces !== 2) {
        errors.push('empty currency must retain legacy 2dp precision');
      }
      continue;
    }
    if (!validCodes.has(code)) {
      errors.push(`${code} is not a valid tender currency at the review date`);
    }
    if (decimalPlaces !== (exceptions[code] ?? defaultDigits)) {
      errors.push(`${code} precision differs from CLDR`);
    }
  }
  return errors;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [metadata, source] = await Promise.all([
    readFile(
      new URL(
        '../packages/loot-core/src/shared/currency-metadata.json',
        import.meta.url,
      ),
      'utf8',
    ).then(JSON.parse),
    readFile(
      new URL('./fixtures/cldr-currency-data.json', import.meta.url),
      'utf8',
    ).then(JSON.parse),
  ]);
  const errors = auditCurrencyMetadata(currencies, metadata, source);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(
      `Currency metadata audit passed for ${currencies.filter(c => c.code).length} selectable currencies`,
    );
  }
}
