import { fromAmountInput, isMoney, toMoney } from './money';

describe('Money', () => {
  it('round-trips integers at the safe limit', () => {
    const max = Number.MAX_SAFE_INTEGER;
    expect(toMoney(max, 'USD')).toEqual({ amount: max, currencyCode: 'USD' });
    expect(fromAmountInput(toMoney(-max, 'JPY'), 'JPY')).toBe(-max);
    expect(fromAmountInput({ amount: 1234, currencyCode: 'KWD' }, 'KWD')).toBe(
      1234,
    );
  });

  it('accepts the empty legacy currency without substituting USD', () => {
    expect(toMoney(100, '')).toEqual({ amount: 100, currencyCode: '' });
    expect(fromAmountInput({ amount: 100, currencyCode: '' }, '')).toBe(100);
    expect(() =>
      fromAmountInput({ amount: 100, currencyCode: 'USD' }, ''),
    ).toThrow('currency-mismatch');
  });

  it('passes raw integers through unchanged', () => {
    expect(fromAmountInput(9007199254740987, 'USD')).toBe(9007199254740987);
    expect(fromAmountInput(0, '')).toBe(0);
  });

  it('rejects invalid values', () => {
    expect(() => toMoney(1.5, 'USD')).toThrow('money-invalid');
    expect(() => toMoney(1, 'usd')).toThrow('money-invalid');
    expect(() => toMoney(Number.MAX_SAFE_INTEGER + 1, 'USD')).toThrow(
      'money-invalid',
    );
    expect(() => fromAmountInput(1.5, 'USD')).toThrow('amount-invalid');
    expect(() => fromAmountInput(Number.NaN, 'USD')).toThrow('amount-invalid');
    expect(() =>
      fromAmountInput({ amount: '1', currencyCode: 'USD' } as never, 'USD'),
    ).toThrow('money-invalid');
    expect(() =>
      fromAmountInput({ amount: 100, currencyCode: 'JPY' }, 'USD'),
    ).toThrow('currency-mismatch');
  });

  it('identifies only valid Money values', () => {
    expect(isMoney({ amount: 1, currencyCode: 'USD' })).toBe(true);
    expect(isMoney({ amount: 1, currencyCode: '' })).toBe(true);
    expect(isMoney(1)).toBe(false);
    expect(isMoney(null)).toBe(false);
    expect(isMoney({ amount: '1', currencyCode: null })).toBe(false);
    expect(isMoney({ amount: 1.5, currencyCode: 'USD' })).toBe(false);
    expect(
      isMoney({ amount: Number.MAX_SAFE_INTEGER + 1, currencyCode: 'USD' }),
    ).toBe(false);
    expect(isMoney({ amount: 1, currencyCode: ['USD'] })).toBe(false);
  });

  it('requires a string currency code', () => {
    expect(() => toMoney(1, ['USD'] as never)).toThrow('money-invalid');
  });
});
