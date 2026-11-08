import { amountToInteger, integerToAmount } from './utils';

describe('public amount helpers', () => {
  it('keep the documented cents default and accept an explicit precision', () => {
    expect(amountToInteger(123.45)).toBe(12345);
    expect(integerToAmount(12345)).toBe(123.45);
    expect(amountToInteger(1.234, 3)).toBe(1234);
    expect(integerToAmount(1234, 'JPY')).toBe(1234);
  });
});
