import { looselyParseAmount, getNumberFormat, setNumberFormat } from './util';

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

  test('looseParseAmount works with parentheses (negative)', () => {
    expect(looselyParseAmount('(3.45)')).toBe(-3.45);
    expect(looselyParseAmount('(3)')).toBe(-3);
  });

  test('looseParseAmount ignores non-numeric characters', () => {
    // This is strange behavior because it does not work for just
    // `3_45_23` (it needs a decimal amount). This function should be
    // thought through more.
    expect(looselyParseAmount('3_45_23.10')).toBe(34523.1);
  });

  test('number formatting works with comma-dot format', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    let formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1234.56'))).toBe('1,234.56');

    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1234.56'))).toBe('1,235');
  });

  test('number formatting works with dot-comma format', () => {
    setNumberFormat({ format: 'dot-comma', hideFraction: false });
    let formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1234.56'))).toBe('1.234,56');

    setNumberFormat({ format: 'dot-comma', hideFraction: true });
    formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1234.56'))).toBe('1.235');
  });

  test('number formatting works with space-comma format', () => {
    setNumberFormat({ format: 'space-comma', hideFraction: false });
    let formatter = getNumberFormat().formatter;
    // grouping separator space char is a non-breaking space, or UTF-16 \xa0
    expect(formatter.format(Number('1234.56'))).toBe('1\xa0234,56');

    setNumberFormat({ format: 'space-comma', hideFraction: true });
    formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1234.56'))).toBe('1\xa0235');
  });

  test('number formatting works with space-dot format', () => {
    setNumberFormat({ format: 'space-dot', hideFraction: false });
    let formatter = getNumberFormat().formatter;
    // grouping separator space char is a non-breaking space, or UTF-16 \xa0
    expect(formatter.format(Number('1234.56'))).toBe('1\xa0234.56');

    setNumberFormat({ format: 'space-dot', hideFraction: true });
    formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1234.56'))).toBe('1\xa0235');
  });
});
