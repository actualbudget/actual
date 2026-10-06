import {
  buildExchangeRequest,
  crossRate,
  exchangeOtherAccount,
  impliedRate,
  otherAmountFromRate,
} from './exchange-entry';
import type { ExchangeEntry } from './exchange-entry';

const usd = {
  id: 'usd',
  currency: null,
  currency_precision: null,
  offbudget: 0,
} as const;
const usdOff = { ...usd, id: 'usdOff', offbudget: 1 } as const;
const jpy = {
  id: 'jpy',
  currency: 'JPY',
  currency_precision: 0,
  offbudget: 0,
} as const;
const jpy2 = { ...jpy, id: 'jpy2' } as const;
const kwd = {
  id: 'kwd',
  currency: 'KWD',
  currency_precision: 3,
  offbudget: 0,
} as const;

const entry = (overrides: Partial<ExchangeEntry>): ExchangeEntry => ({
  date: '2026-03-10',
  register: usd,
  other: jpy,
  registerAmount: -10000,
  otherAmount: 15000,
  fee: null,
  feeSide: 'register',
  baseValue: null,
  category: null,
  feeCategory: null,
  notes: null,
  cleared: false,
  ...overrides,
});

describe('exchangeOtherAccount', () => {
  const payees = [
    { id: 'to-jpy', transfer_acct: 'jpy' },
    { id: 'to-jpy2', transfer_acct: 'jpy2' },
    { id: 'to-usdOff', transfer_acct: 'usdOff' },
    { id: 'shop', transfer_acct: null },
  ];
  const accounts = [usd, usdOff, jpy, jpy2, kwd];

  test('finds only transfers between different encodings', () => {
    expect(
      exchangeOtherAccount(
        { account: 'usd', payee: 'to-jpy' },
        payees,
        accounts,
      ),
    ).toBe(jpy);
    expect(
      exchangeOtherAccount(
        { account: 'jpy', payee: 'to-jpy2' },
        payees,
        accounts,
      ),
    ).toBeNull();
    expect(
      exchangeOtherAccount(
        { account: 'usd', payee: 'to-usdOff' },
        payees,
        accounts,
      ),
    ).toBeNull();
    expect(
      exchangeOtherAccount({ account: 'usd', payee: 'shop' }, payees, accounts),
    ).toBeNull();
  });
});

describe('buildExchangeRequest', () => {
  test('makes the paying register the source', () => {
    expect(buildExchangeRequest(entry({}))).toEqual({
      ok: true,
      request: {
        date: '2026-03-10',
        sourceAccount: 'usd',
        destinationAccount: 'jpy',
        sourceAmount: 10000,
        destinationAmount: 15000,
        notes: null,
        cleared: false,
        initiatingAccount: 'usd',
      },
    });
  });

  test('makes a depositing register the destination', () => {
    const result = buildExchangeRequest(
      entry({
        register: jpy,
        other: usd,
        registerAmount: 15000,
        otherAmount: 10000,
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      request: {
        sourceAccount: 'usd',
        destinationAccount: 'jpy',
        sourceAmount: 10000,
        destinationAmount: 15000,
        initiatingAccount: 'jpy',
      },
    });
  });

  test('puts the fee on the chosen side', () => {
    expect(
      buildExchangeRequest(entry({ fee: 300, feeSide: 'register' })),
    ).toMatchObject({ request: { sourceFee: 300 } });
    expect(
      buildExchangeRequest(entry({ fee: 300, feeSide: 'other' })),
    ).toMatchObject({ request: { destinationFee: 300 } });
    // Entered in the destination register, the register's fee is the
    // destination's.
    expect(
      buildExchangeRequest(
        entry({
          register: jpy,
          other: usd,
          registerAmount: 15000,
          otherAmount: 10000,
          fee: 300,
          feeSide: 'register',
        }),
      ),
    ).toMatchObject({ request: { destinationFee: 300 } });
  });

  test('sends a category only for on/off-budget transfers', () => {
    expect(
      buildExchangeRequest(entry({ category: 'saving' })).ok &&
        'category' in
          (
            buildExchangeRequest(entry({ category: 'saving' })) as {
              request: object;
            }
          ).request,
    ).toBe(false);
    expect(
      buildExchangeRequest(entry({ register: usdOff, category: 'saving' })),
    ).toMatchObject({ request: { category: 'saving' } });
  });

  test('sends a base value only between two foreign accounts', () => {
    expect(
      buildExchangeRequest(
        entry({
          register: jpy,
          other: kwd,
          registerAmount: -15000,
          otherAmount: 30500,
          baseValue: 10000,
        }),
      ),
    ).toMatchObject({ request: { baseAmount: 10000 } });
    const withBase = buildExchangeRequest(entry({ baseValue: 10000 }));
    expect(withBase.ok && 'baseAmount' in withBase.request).toBe(false);
  });

  test('reports missing or invalid inputs', () => {
    expect(buildExchangeRequest(entry({ registerAmount: 0 }))).toEqual({
      ok: false,
      error: 'amount-required',
    });
    expect(buildExchangeRequest(entry({ otherAmount: null }))).toEqual({
      ok: false,
      error: 'other-amount-required',
    });
    expect(buildExchangeRequest(entry({ fee: -1 }))).toEqual({
      ok: false,
      error: 'fee-invalid',
    });
  });
});

describe('rate helpers', () => {
  test('fills the other amount from a rate in both directions', () => {
    // $100.00 at 150 yen per dollar.
    expect(otherAmountFromRate(entry({}), '150', 2)).toBe(15000);
    // A $3.00 source fee comes off the principal first.
    expect(
      otherAmountFromRate(
        entry({ registerAmount: -10300, fee: 300 }),
        '150',
        2,
      ),
    ).toBe(15000);
    // ¥15,000 received at 150 yen per dollar was $100.00 sent.
    expect(
      otherAmountFromRate(
        entry({ register: jpy, other: usd, registerAmount: 15000 }),
        '150',
        2,
      ),
    ).toBe(10000);
    // ¥1,001 at 0.0065 KWD per yen is 6.506 KWD (tie to even at 3dp).
    expect(
      otherAmountFromRate(
        entry({ register: jpy, other: kwd, registerAmount: -1001 }),
        '0.0065',
        2,
      ),
    ).toBe(6506);
    expect(otherAmountFromRate(entry({}), 'abc', 2)).toBeNull();
  });

  test('shows the implied rate of the two amounts', () => {
    expect(impliedRate(entry({}), 2)).toBe(150);
    expect(impliedRate(entry({ registerAmount: -10300, fee: 300 }), 2)).toBe(
      150,
    );
  });

  test('derives a cross rate from two base rates', () => {
    // 150 JPY and 0.3 KWD per USD: 0.002 KWD per JPY.
    expect(crossRate('150', '0.3')).toBe('0.002');
    expect(crossRate(null, '0.3')).toBeNull();
  });
});
