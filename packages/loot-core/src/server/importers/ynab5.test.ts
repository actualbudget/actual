import { describe, expect, it } from 'vitest';

import { amountToCurrencyInteger } from '#shared/util';

import { getBudgetName, parseFile } from './ynab5';

function toBuffer(obj: unknown): Buffer {
  return Buffer.from(JSON.stringify(obj));
}

describe('ynab5 parseFile', () => {
  it('unwraps the legacy `budget` wrapper', () => {
    const data = parseFile(
      toBuffer({ data: { budget: { name: 'Legacy', accounts: [] } } }),
    );

    expect(data.name).toBe('Legacy');
    expect(getBudgetName('legacy.json', data)).toBe('Legacy');
  });

  it('unwraps the renamed `plan` wrapper from the current YNAB API', () => {
    const data = parseFile(
      toBuffer({ data: { plan: { name: 'Modern', accounts: [] } } }),
    );

    expect(data.name).toBe('Modern');
    expect(getBudgetName('modern.json', data)).toBe('Modern');
  });

  it('returns an already-unwrapped object unchanged', () => {
    const data = parseFile(toBuffer({ name: 'Bare', accounts: [] }));

    expect(data.name).toBe('Bare');
  });
});

// Tests for the YNAB5 milliunit conversion used by amountFromYnab.
// YNAB5 stores all amounts as milliunits: 1 major unit = 1000 milliunits.
// The conversion is: amountToCurrencyInteger(milliamount / 1000, currency)
describe('YNAB5 milliunit conversion', () => {
  it('converts USD 12340 milliunits to 1234', () => {
    // $12.34 = 12340 milliunits; stored as 1234 (cents)
    expect(amountToCurrencyInteger(12340 / 1000, 'USD')).toBe(1234);
  });

  it('converts JPY 1234000 milliunits to 1234 not 123400', () => {
    // Old formula: Math.round(1234000 / 10) = 123400 (×100 inflation)
    // New formula: amountToCurrencyInteger(1234000 / 1000, 'JPY') = 1234
    expect(amountToCurrencyInteger(1234000 / 1000, 'JPY')).toBe(1234);
  });

  it('converts IRR 5678000 milliunits to 5678', () => {
    expect(amountToCurrencyInteger(5678000 / 1000, 'IRR')).toBe(5678);
  });

  it('converts KRW 99000 milliunits to 99', () => {
    expect(amountToCurrencyInteger(99000 / 1000, 'KRW')).toBe(99);
  });

  it('falls back to 2dp for unknown currency', () => {
    // 12340 milliunits = 12.34 major units; 2dp → stored as 1234
    expect(amountToCurrencyInteger(12340 / 1000, 'XYZ')).toBe(1234);
  });
});
