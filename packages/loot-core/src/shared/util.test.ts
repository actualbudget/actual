import {
  amountToInteger,
  currencyToAmount,
  getNumberFormat,
  integerToAmount,
  integerToCurrency,
  looselyParseAmount,
  setNumberFormat,
  stringToInteger,
  titleFirst,
} from './util';

const parseCurrency = (text: string) =>
  currencyToAmount(text, getNumberFormat().thousandsSeparator);
const parseLoose2 = (text: string) => looselyParseAmount(text, 2);

describe('utility functions', () => {
  test('looseParseAmount works with basic numbers', () => {
    // Parsing is currently limited to 1,2 decimal places or 5-9.
    // Ignoring 3 places removes the possibility of improper parse
    //  of amounts without decimal amounts included.
    expect(parseLoose2('3')).toBe(3);
    expect(parseLoose2('3.4')).toBe(3.4);
    expect(parseLoose2('3.45')).toBe(3.45);
    // cant tell if this next case should be decimal or different format
    // so we set as full numbers
    expect(parseLoose2('3.456')).toBe(3456); // the expected failing case
    expect(parseLoose2('3.4500')).toBe(3.45);
    expect(parseLoose2('3.45000')).toBe(3.45);
    expect(parseLoose2('3.450000')).toBe(3.45);
    expect(parseLoose2('3.4500000')).toBe(3.45);
    expect(parseLoose2('3.45000000')).toBe(3.45);
    expect(parseLoose2('3.450000000')).toBe(3.45);
  });

  test('looseParseAmount works with alternate formats', () => {
    expect(parseLoose2('3,45')).toBe(3.45);
    expect(parseLoose2('3,456')).toBe(3456); //expected failing case
    expect(parseLoose2('3,4500')).toBe(3.45);
    expect(parseLoose2('3,45000')).toBe(3.45);
    expect(parseLoose2('3,450000')).toBe(3.45);
    expect(parseLoose2('3,4500000')).toBe(3.45);
    expect(parseLoose2('3,45000000')).toBe(3.45);
    expect(parseLoose2('3,450000000')).toBe(3.45);
    expect(parseLoose2("3'456.78")).toBe(3456.78);
    expect(parseLoose2("3'456.78000")).toBe(3456.78);
    expect(parseLoose2('1,00,000.99')).toBe(100000.99);
    expect(parseLoose2('1,00,000.99000')).toBe(100000.99);
  });

  test('looseParseAmount works with leading decimal characters', () => {
    expect(parseLoose2('.45')).toBe(0.45);
    expect(parseLoose2(',45')).toBe(0.45);
  });

  test('looseParseAmount works with negative numbers', () => {
    expect(parseLoose2('-3')).toBe(-3);
    expect(parseLoose2('-3.45')).toBe(-3.45);
    expect(parseLoose2('-3,45')).toBe(-3.45);
    // Unicode minus
    expect(parseLoose2('−3')).toBe(-3);
    expect(parseLoose2('−3.45')).toBe(-3.45);
    expect(parseLoose2('−3,45')).toBe(-3.45);
  });

  test('looseParseAmount works with parentheses (negative)', () => {
    expect(parseLoose2('(3.45)')).toBe(-3.45);
    expect(parseLoose2('(3)')).toBe(-3);
    // Parentheses with Unicode minus
    expect(parseLoose2('(−3.45)')).toBe(-3.45);
    expect(parseLoose2('(−3)')).toBe(-3);
  });

  test('looseParseAmount ignores non-numeric characters', () => {
    // This is strange behavior because it does not work for just
    // `3_45_23` (it needs a decimal amount). This function should be
    // thought through more.
    expect(parseLoose2('3_45_23.10')).toBe(34523.1);
    expect(parseLoose2('(1 500.99)')).toBe(-1500.99);
  });

  test('looseParseAmount handles trailing whitespace', () => {
    expect(parseLoose2('1055 ')).toBe(1055);
    expect(parseLoose2('$1,055 ')).toBe(1055);
    expect(parseLoose2('$1,055.00 ')).toBe(1055);
    expect(parseLoose2(' $1,055 ')).toBe(1055);
    expect(parseLoose2('3.45 ')).toBe(3.45);
    expect(parseLoose2(' 3.45 ')).toBe(3.45);
  });

  test('loose parsing uses destination precision for fractions and limits', () => {
    expect(looselyParseAmount('3.456', 3)).toBe(3.456);
    expect(looselyParseAmount('3,456', 3)).toBe(3.456);
    expect(looselyParseAmount('1,234,567', 3)).toBe(1234567);
    expect(looselyParseAmount('1.234.567', 3)).toBe(1234567);
    expect(looselyParseAmount('1,234.567', 3)).toBe(1234.567);
    expect(looselyParseAmount('1.234,567', 3)).toBe(1234.567);
    expect(looselyParseAmount('3.456', 2)).toBe(3456);
    expect(looselyParseAmount('2251799813686', 3)).toBeNull();
    expect(looselyParseAmount('2251799813686', 2)).toBe(2251799813686);
    expect(looselyParseAmount('Infinity', 3)).toBeNull();
  });

  test('looseParseAmount does not count a currency suffix as decimal places', () => {
    expect(parseLoose2('3.4 €')).toBe(3.4);
    expect(parseLoose2('3.45€')).toBe(3.45);
    expect(parseLoose2('3.45 €')).toBe(3.45);
    expect(parseLoose2('3,45 €')).toBe(3.45);
    expect(parseLoose2('3.45 USD')).toBe(3.45);
    expect(parseLoose2('3.45000000 €')).toBe(3.45);
    expect(parseLoose2(' -110.7 €')).toBe(-110.7);
    expect(parseLoose2('1.234,5 kr')).toBe(1234.5);
    expect(parseLoose2('(3.4 €)')).toBe(-3.4);
    // three places are still ambiguous, same as without a suffix
    expect(parseLoose2('3.456 €')).toBe(3456);
    expect(parseLoose2('1.500 €')).toBe(1500);
  });

  test('number formatting works with comma-dot format', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    let formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1234.56'))).toBe('1,234.56');

    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1234.56'))).toBe('1,235');
  });

  test('number formatting works with comma-dot-in format', () => {
    setNumberFormat({ format: 'comma-dot-in', hideFraction: false });
    let formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1234567.89'))).toBe('12,34,567.89');

    setNumberFormat({ format: 'comma-dot-in', hideFraction: true });
    formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1234567.89'))).toBe('12,34,568');
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
    // grouping separator space char is a narrow non-breaking space (U+202F)
    expect(formatter.format(Number('1234.56'))).toBe('1\u202F234,56');

    setNumberFormat({ format: 'space-comma', hideFraction: true });
    formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1234.56'))).toBe('1\u202F235');
  });

  test('number formatting works with apostrophe-dot format', () => {
    setNumberFormat({ format: 'apostrophe-dot', hideFraction: false });
    let formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1234.56'))).toBe(`1\u2019234.56`);

    setNumberFormat({ format: 'apostrophe-dot', hideFraction: true });
    formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1234.56'))).toBe(`1\u2019235`);
  });

  test('number formatting works with small negative numbers with 0 decimal places', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    const formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('-0.1'))).toBe('0');
    expect(formatter.format(Number('-0.5'))).toBe('-1');
    expect(formatter.format(Number('-0.9'))).toBe('-1');
    expect(formatter.format(Number('-1.2'))).toBe('-1');
  });

  test('currencyToAmount works with basic numbers', () => {
    expect(parseCurrency('3')).toBe(3);
    expect(parseCurrency('3.4')).toBe(3.4);
    expect(parseCurrency('3.45')).toBe(3.45);
    expect(parseCurrency('3.45060')).toBe(3.4506);
  });

  test('currencyToAmount works with varied formats', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(parseCurrency('3,45')).toBe(3.45);
    expect(parseCurrency('3,456')).toBe(3456);
    expect(parseCurrency('3,45000')).toBe(345000);
    expect(parseCurrency("3'456.78")).toBe(3456.78);
    expect(parseCurrency("3'456.78000")).toBe(3456.78);
    expect(parseCurrency('1,00,000.99')).toBe(100000.99);
    expect(parseCurrency('1,00,000.99000')).toBe(100000.99);
  });

  test('currencyToAmount works with leading decimal characters', () => {
    expect(parseCurrency('.45')).toBe(0.45);
    expect(parseCurrency(',45')).toBe(0.45);
  });

  test('currencyToAmount works with negative numbers', () => {
    expect(parseCurrency('-3')).toBe(-3);
    expect(parseCurrency('-3.45')).toBe(-3.45);
    expect(parseCurrency('-3,45')).toBe(-3.45);
    // Unicode minus
    expect(parseCurrency('−3')).toBe(-3);
    expect(parseCurrency('−3.45')).toBe(-3.45);
    expect(parseCurrency('−3,45')).toBe(-3.45);
  });

  test('currencyToAmount works with non-fractional numbers', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    expect(parseCurrency('3.')).toBe(3);
    expect(parseCurrency('3,')).toBe(3);
    expect(parseCurrency('3,000')).toBe(3000);
    expect(parseCurrency('3,000.')).toBe(3000);
  });

  test('currencyToAmount works with hidden fractions', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(parseCurrency('3.45')).toBe(3.45);
    expect(parseCurrency('3.456')).toBe(3.456);
    expect(parseCurrency('3.4500')).toBe(3.45);
    expect(parseCurrency('3.')).toBe(3);
    expect(parseCurrency('3,')).toBe(3);
    expect(parseCurrency('3,000')).toBe(3000);
    expect(parseCurrency('3,000.')).toBe(3000);
  });

  test('currencyToAmount works with apostrophe-dot format', () => {
    setNumberFormat({ format: 'apostrophe-dot', hideFraction: false });

    // Test with regular apostrophe (U+0027) - what users type on keyboard
    const keyboardApostrophe = '12\u0027345.67';
    expect(keyboardApostrophe.charCodeAt(2)).toBe(0x0027); // Verify it's U+0027
    expect(parseCurrency(keyboardApostrophe)).toBe(12345.67);
    expect(parseCurrency('1\u0027234.56')).toBe(1234.56);
    expect(parseCurrency('1\u0027000.33')).toBe(1000.33);
    expect(parseCurrency('100\u0027000.99')).toBe(100000.99);
    expect(parseCurrency('1\u0027000\u0027000.50')).toBe(1000000.5);

    // Test with right single quotation mark (U+2019) - what Intl.NumberFormat outputs
    const intlApostrophe = '12\u2019345.67';
    expect(intlApostrophe.charCodeAt(2)).toBe(0x2019); // Verify it's U+2019
    expect(parseCurrency(intlApostrophe)).toBe(12345.67);
    expect(parseCurrency('1\u2019234.56')).toBe(1234.56);
    expect(parseCurrency('1\u2019000.33')).toBe(1000.33);
  });

  test('currencyToAmount works with dot-comma', () => {
    setNumberFormat({ format: 'dot-comma', hideFraction: false });
    expect(parseCurrency('3,45')).toBe(3.45);
    expect(parseCurrency('3,456')).toBe(3.456);
    expect(parseCurrency('3,4500')).toBe(3.45);
    expect(parseCurrency('3,')).toBe(3);
    expect(parseCurrency('3.')).toBe(3);
    expect(parseCurrency('3.000')).toBe(3000);
    expect(parseCurrency('3.000,')).toBe(3000);
  });

  test('titleFirst works with all inputs', () => {
    expect(titleFirst('')).toBe('');
    expect(titleFirst(undefined)).toBe('');
    expect(titleFirst(null)).toBe('');
    expect(titleFirst('a')).toBe('A');
    expect(titleFirst('abc')).toBe('Abc');
  });

  test('stringToInteger works with negative numbers', () => {
    expect(stringToInteger('-3')).toBe(-3);
    // Unicode minus
    expect(stringToInteger('−3')).toBe(-3);
  });

  test.each([
    ['', 12.34, 1234],
    ['USD', 12.34, 1234],
    ['JPY', 1234, 1234],
    ['IRR', 1234, 1234],
    ['XYZ', 12.34, 1234],
  ] as const)(
    'currency context %s encodes and decodes',
    (code, amount, integer) => {
      expect(amountToInteger(amount, code)).toBe(integer);
      expect(integerToAmount(integer, code)).toBe(amount);
    },
  );

  test('explicit precision formats without global currency lookup', () => {
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
    expect(integerToCurrency(1234, formatter, 3)).toBe('1.234');
    expect(
      integerToCurrency(
        1234,
        new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }),
        0,
      ),
    ).toBe('1,234');
  });

  test('missing or invalid conversion context fails visibly', () => {
    // @ts-expect-error Missing precision must fail at runtime too.
    expect(() => amountToInteger(1.23)).toThrow();
    // @ts-expect-error Missing precision must fail at runtime too.
    expect(() => integerToAmount(123)).toThrow();
    // @ts-expect-error Missing precision must fail at runtime too.
    expect(() => integerToCurrency(123, getNumberFormat().formatter)).toThrow();
    // @ts-expect-error Missing separator must fail at runtime too.
    expect(() => currencyToAmount('1.23')).toThrow();
    // @ts-expect-error Missing precision must fail at runtime too.
    expect(() => looselyParseAmount('1.23')).toThrow();
    expect(() => amountToInteger(1.23, 16)).toThrow();
  });

  describe('amountToInteger', () => {
    it.each<[number, number, number]>([
      [0.5, 0, 0],
      [1.5, 0, 2],
      [2.5, 0, 2],
      [-1.5, 0, -2],
      [-2.5, 0, -2],
      [0.125, 2, 12],
      [0.375, 2, 38],
      [-0.001, 2, 0],
      [-12.349, 2, -1235],
      // Decimal ties whose binary scaling lands just off .5
      [1.225, 2, 122],
      [-1.225, 2, -122],
      [1.005, 2, 100],
      [0.005, 2, 0],
      [1.0005, 3, 1000],
      // Near-ties round normally
      [1.2251, 2, 123],
      [1.2249, 2, 122],
      [0.0005, 2, 0],
    ])('rounds %s at %sdp to %s with ties to even', (amount, dp, expected) => {
      expect(amountToInteger(amount, dp)).toBe(expected);
    });

    it('formats a negative subunit rounded to zero without a negative sign', () => {
      setNumberFormat({ format: 'comma-dot', hideFraction: false });
      expect(
        integerToCurrency(
          amountToInteger(-0.001, 2),
          getNumberFormat({ decimalPlaces: 2 }).formatter,
          2,
        ),
      ).toBe('0.00');
    });
  });
});
