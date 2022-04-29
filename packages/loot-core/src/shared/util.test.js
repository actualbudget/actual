import { looselyParseAmount } from './util';

describe('utility functions', () => {
  test('looseParseAmount works with basic numbers', () => {
    expect(looselyParseAmount('3')).toBe(3);
    expect(looselyParseAmount('3.45')).toBe(3.45);

    // Right now it doesn't actually parse an "amount", it just parses
    // a number. An "amount" is a valid transaction amount, usually a
    // number with 2 decimal places.
    expect(looselyParseAmount('3.456')).toBe(3.456);
  });

  test('looseParseAmount works with alternate formats', () => {
    expect(looselyParseAmount('3,45')).toBe(3.45);
    expect(looselyParseAmount('3,456')).toBe(3.456);
  });

  test('looseParseAmount works with negative numbers', () => {
    expect(looselyParseAmount('-3')).toBe(-3);
    expect(looselyParseAmount('-3.45')).toBe(-3.45);
    expect(looselyParseAmount('-3,45')).toBe(-3.45);
  });

  test('looseParseAmount ignores non-numeric characters', () => {
    // This is strange behavior because it does not work for just
    // `3_45_23` (it needs a decimal amount). This function should be
    // thought through more.
    expect(looselyParseAmount('3_45_23.10')).toBe(34523.1);
  });
});
