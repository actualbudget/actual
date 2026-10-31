import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { currencies } from '../packages/loot-core/src/shared/currencies.ts';

import { auditCurrencyMetadata } from './check-currency-metadata.mjs';

const [metadata, source] = await Promise.all(
  [
    '../packages/loot-core/src/shared/currency-metadata.json',
    './fixtures/cldr-currency-data.json',
  ].map(async path =>
    JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8')),
  ),
);

function withCurrency(code, decimalPlaces) {
  return [
    ...currencies.filter(currency => currency.code !== code),
    { code, decimalPlaces },
  ];
}

void test('accepts the selectable currencies', () => {
  assert.deepEqual(auditCurrencyMetadata(currencies, metadata, source), []);
});

void test('accepts valid currencies at their CLDR precision', () => {
  for (const [code, decimalPlaces] of [
    ['KWD', 3],
    ['DZD', 2],
  ]) {
    assert.deepEqual(
      auditCurrencyMetadata(
        withCurrency(code, decimalPlaces),
        metadata,
        source,
      ),
      [],
    );
  }
});

for (const [name, selectable, message] of [
  ['a code without CLDR tender records', withCurrency('ZZZ', 2), 'ZZZ'],
  ['a non-default precision stored as 2dp', withCurrency('KWD', 2), 'KWD'],
  ['a changed empty-currency precision', withCurrency('', 0), 'empty'],
  [
    'a duplicate code',
    [...currencies, { code: 'USD', decimalPlaces: 2 }],
    'duplicate',
  ],
]) {
  void test(`rejects ${String(name)}`, () => {
    assert.ok(
      auditCurrencyMetadata(selectable, metadata, source).some(error =>
        error.includes(message),
      ),
    );
  });
}

for (const [name, mutate, message] of [
  [
    'an invalid review date',
    m => {
      m.reviewedOn = '2026-02-30';
    },
    'review',
  ],
  [
    'an unpinned source',
    m => {
      m.source = m.source.replace(/\/\d+\.\d+\.\d+\//, '/main/');
    },
    'source',
  ],
  [
    'a source version mismatch',
    m => {
      m.cldrVersion = '47';
    },
    'version',
  ],
  [
    'changed source content',
    m => {
      m.sourceJsonSha256 = '0'.repeat(64);
    },
    'source',
  ],
]) {
  void test(`rejects ${String(name)}`, () => {
    const changed = structuredClone(metadata);
    mutate(changed);
    assert.ok(
      auditCurrencyMetadata(currencies, changed, source).some(error =>
        error.includes(message),
      ),
    );
  });
}

void test('rejects incomplete CLDR source data', () => {
  assert.match(
    auditCurrencyMetadata(currencies, metadata, {})[0],
    /Invalid CLDR source/,
  );
});
