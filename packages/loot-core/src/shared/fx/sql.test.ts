import { MAX_SAFE_NUMBER } from '#shared/util';

import type { RateRecord } from './rates';
import {
  convertBetweenCurrencies,
  convertSqlAmount,
  convertTransferAmount,
  getSqlDefaultCurrencyCode,
  isSqlConversionEnabled,
  resetSqlConversionState,
  setSqlConversionState,
} from './sql';

function rate(id: string, value: number, date: string): RateRecord {
  return {
    id,
    from_currency: 'USD',
    to_currency: 'CAD',
    rate: value,
    date,
    source: 'manual',
    created_at: 1,
  };
}

const RATES = [rate('jan', 1.25, '2026-01-01'), rate('jun', 1.5, '2026-06-01')];

function setState({
  enabled = true,
  rateMode = 'latest',
  rates = RATES,
}: {
  enabled?: boolean;
  rateMode?: 'latest' | 'historical';
  rates?: RateRecord[];
} = {}) {
  setSqlConversionState({
    enabled,
    defaultCurrencyCode: 'CAD',
    rateMode,
    rates,
  });
}

afterEach(() => {
  resetSqlConversionState();
});

describe('convertSqlAmount', () => {
  it('returns amounts as they are while multiple currencies are off', () => {
    setState({ enabled: false });
    expect(convertSqlAmount(10000, 'USD', 20260115, false)).toBe(10000);
  });

  it('keeps amounts without a currency or in the default currency', () => {
    setState();
    expect(convertSqlAmount(10000, null, 20260115, false)).toBe(10000);
    expect(convertSqlAmount(10000, 'CAD', 20260115, false)).toBe(10000);
  });

  it('converts with the latest rate or the rate of the SQL date', () => {
    setState();
    expect(convertSqlAmount(10000, 'USD', 20260115, false)).toBe(15000);
    expect(convertSqlAmount(10000, 'USD', 20260115, true)).toBe(12500);

    setState({ rateMode: 'historical' });
    expect(convertSqlAmount(10000, 'USD', 20260115, false)).toBe(12500);
    expect(convertSqlAmount(-10000, 'USD', 20260715, false)).toBe(-15000);
    // Before the first rate, the earliest later one is used
    expect(convertSqlAmount(10000, 'USD', 20251231, false)).toBe(12500);
  });

  it('uses new rates and settings as soon as they are set', () => {
    setState({ rateMode: 'historical' });
    expect(convertSqlAmount(10000, 'USD', 20260115, false)).toBe(12500);

    // Rates looked up before must not be reused
    setState({
      rateMode: 'historical',
      rates: [...RATES, rate('jan-10', 2, '2026-01-10')],
    });
    expect(convertSqlAmount(10000, 'USD', 20260115, false)).toBe(20000);

    setState({ rateMode: 'latest' });
    expect(convertSqlAmount(10000, 'USD', 20260115, false)).toBe(15000);
  });

  it('keeps the amount when the conversion is too large to be safe', () => {
    setState();
    expect(convertSqlAmount(MAX_SAFE_NUMBER, 'USD', 20260115, false)).toBe(
      MAX_SAFE_NUMBER,
    );
  });
});

describe('convertBetweenCurrencies', () => {
  it('converts with the rate on or before the date', () => {
    setState({ enabled: false });
    expect(convertBetweenCurrencies(10000, 'USD', 'CAD', '2026-01-15')).toBe(
      12500,
    );
    expect(convertBetweenCurrencies(15000, 'CAD', 'USD', '2026-07-01')).toBe(
      10000,
    );
  });

  it('keeps the amount instead of throwing when it is too large', () => {
    setState();
    expect(
      convertBetweenCurrencies(MAX_SAFE_NUMBER, 'USD', 'CAD', '2026-01-15'),
    ).toBe(MAX_SAFE_NUMBER);
  });
});

describe('convertTransferAmount', () => {
  it('mirrors the amount while multiple currencies are off', () => {
    setState({ enabled: false });
    expect(convertTransferAmount(10000, 'USD', null, '2026-01-15')).toBe(10000);
  });

  it('converts between the currencies of both accounts', () => {
    setState();
    expect(convertTransferAmount(10000, 'USD', null, '2026-01-15')).toBe(12500);
    expect(convertTransferAmount(10000, null, 'CAD', '2026-01-15')).toBe(10000);
  });
});

describe('resetSqlConversionState', () => {
  it('forgets the rates and settings', () => {
    setState();
    resetSqlConversionState();

    expect(isSqlConversionEnabled()).toBe(false);
    expect(getSqlDefaultCurrencyCode()).toBe('');
    expect(convertBetweenCurrencies(10000, 'USD', 'CAD', '2026-01-15')).toBe(
      10000,
    );
  });
});
