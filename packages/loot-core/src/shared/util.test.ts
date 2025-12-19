import {
  looselyParseAmount,
  getNumberFormat,
  setNumberFormat,
  currencyToAmount,
  stringToInteger,
  titleFirst,
  integerToCurrency,
  amountToCurrency,
  amountToCurrencyNoDecimal,
} from './util';

describe('utility functions', () => {
  test('looseParseAmount works with basic numbers', () => {
    // Parsing is currently limited to 1,2 decimal places or 5-9.
    // Ignoring 3 places removes the possibility of improper parse
    //  of amounts without decimal amounts included.
    expect(looselyParseAmount('3')).toBe(3);
    expect(looselyParseAmount('3.4')).toBe(3.4);
    expect(looselyParseAmount('3.45')).toBe(3.45);
    // cant tell if this next case should be decimal or different format
    // so we set as full numbers
    expect(looselyParseAmount('3.456')).toBe(3456); // the expected failing case
    expect(looselyParseAmount('3.4500')).toBe(3.45);
    expect(looselyParseAmount('3.45000')).toBe(3.45);
    expect(looselyParseAmount('3.450000')).toBe(3.45);
    expect(looselyParseAmount('3.4500000')).toBe(3.45);
    expect(looselyParseAmount('3.45000000')).toBe(3.45);
    expect(looselyParseAmount('3.450000000')).toBe(3.45);
  });

  test('looseParseAmount works with alternate formats', () => {
    expect(looselyParseAmount('3,45')).toBe(3.45);
    expect(looselyParseAmount('3,456')).toBe(3456); //expected failing case
    expect(looselyParseAmount('3,4500')).toBe(3.45);
    expect(looselyParseAmount('3,45000')).toBe(3.45);
    expect(looselyParseAmount('3,450000')).toBe(3.45);
    expect(looselyParseAmount('3,4500000')).toBe(3.45);
    expect(looselyParseAmount('3,45000000')).toBe(3.45);
    expect(looselyParseAmount('3,450000000')).toBe(3.45);
    expect(looselyParseAmount("3'456.78")).toBe(3456.78);
    expect(looselyParseAmount("3'456.78000")).toBe(3456.78);
    expect(looselyParseAmount('1,00,000.99')).toBe(100000.99);
    expect(looselyParseAmount('1,00,000.99000')).toBe(100000.99);
  });

  test('looseParseAmount works with leading decimal characters', () => {
    expect(looselyParseAmount('.45')).toBe(0.45);
    expect(looselyParseAmount(',45')).toBe(0.45);
  });

  test('looseParseAmount works with negative numbers', () => {
    expect(looselyParseAmount('-3')).toBe(-3);
    expect(looselyParseAmount('-3.45')).toBe(-3.45);
    expect(looselyParseAmount('-3,45')).toBe(-3.45);
    // Unicode minus
    expect(looselyParseAmount('−3')).toBe(-3);
    expect(looselyParseAmount('−3.45')).toBe(-3.45);
    expect(looselyParseAmount('−3,45')).toBe(-3.45);
  });

  test('looseParseAmount works with parentheses (negative)', () => {
    expect(looselyParseAmount('(3.45)')).toBe(-3.45);
    expect(looselyParseAmount('(3)')).toBe(-3);
    // Parentheses with Unicode minus
    expect(looselyParseAmount('(−3.45)')).toBe(-3.45);
    expect(looselyParseAmount('(−3)')).toBe(-3);
  });

  test('looseParseAmount ignores non-numeric characters', () => {
    // This is strange behavior because it does not work for just
    // `3_45_23` (it needs a decimal amount). This function should be
    // thought through more.
    expect(looselyParseAmount('3_45_23.10')).toBe(34523.1);
    expect(looselyParseAmount('(1 500.99)')).toBe(-1500.99);
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

  test('number formatting works with sat-comma format', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    let formatter = getNumberFormat().formatter;
    // grouping separator space char is a narrow non-breaking space (U+202F)
    expect(formatter.format(Number('1.23456789'))).toBe(
      '1.23\u202F456\u202F789',
    );

    setNumberFormat({ format: 'sat-comma', hideFraction: true });
    formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1.23456789'))).toBe('123,456,789');
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
    expect(formatter.format(Number('1234.56'))).toBe('1’234.56');

    setNumberFormat({ format: 'apostrophe-dot', hideFraction: true });
    formatter = getNumberFormat().formatter;
    expect(formatter.format(Number('1234.56'))).toBe('1’235');
  });

  test('currencyToAmount works with basic numbers', () => {
    expect(currencyToAmount('3')).toBe(3);
    expect(currencyToAmount('3.4')).toBe(3.4);
    expect(currencyToAmount('3.45')).toBe(3.45);
    expect(currencyToAmount('3.45060')).toBe(3.4506);
  });

  test('currencyToAmount works with varied formats', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(currencyToAmount('3,45')).toBe(3.45);
    expect(currencyToAmount('3,456')).toBe(3456);
    expect(currencyToAmount('3,45000')).toBe(345000);
    expect(currencyToAmount("3'456.78")).toBe(3456.78);
    expect(currencyToAmount("3'456.78000")).toBe(3456.78);
    expect(currencyToAmount('1,00,000.99')).toBe(100000.99);
    expect(currencyToAmount('1,00,000.99000')).toBe(100000.99);
  });

  test('currencyToAmount works with leading decimal characters', () => {
    expect(currencyToAmount('.45')).toBe(0.45);
    expect(currencyToAmount(',45')).toBe(0.45);
  });

  test('currencyToAmount works with negative numbers', () => {
    expect(currencyToAmount('-3')).toBe(-3);
    expect(currencyToAmount('-3.45')).toBe(-3.45);
    expect(currencyToAmount('-3,45')).toBe(-3.45);
    // Unicode minus
    expect(currencyToAmount('−3')).toBe(-3);
    expect(currencyToAmount('−3.45')).toBe(-3.45);
    expect(currencyToAmount('−3,45')).toBe(-3.45);
  });

  test('currencyToAmount works with non-fractional numbers', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    expect(currencyToAmount('3.')).toBe(3);
    expect(currencyToAmount('3,')).toBe(3);
    expect(currencyToAmount('3,000')).toBe(3000);
    expect(currencyToAmount('3,000.')).toBe(3000);
  });

  test('currencyToAmount works with hidden fractions', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(currencyToAmount('3.45')).toBe(3.45);
    expect(currencyToAmount('3.456')).toBe(3.456);
    expect(currencyToAmount('3.4500')).toBe(3.45);
    expect(currencyToAmount('3.')).toBe(3);
    expect(currencyToAmount('3,')).toBe(3);
    expect(currencyToAmount('3,000')).toBe(3000);
    expect(currencyToAmount('3,000.')).toBe(3000);
  });

  test('currencyToAmount works with dot-comma', () => {
    setNumberFormat({ format: 'dot-comma', hideFraction: false });
    expect(currencyToAmount('3,45')).toBe(3.45);
    expect(currencyToAmount('3,456')).toBe(3.456);
    expect(currencyToAmount('3,4500')).toBe(3.45);
    expect(currencyToAmount('3,')).toBe(3);
    expect(currencyToAmount('3.')).toBe(3);
    expect(currencyToAmount('3.000')).toBe(3000);
    expect(currencyToAmount('3.000,')).toBe(3000);
  });

  test('currencyToAmount works with sat-comma format (round-trip precision)', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    // Test round-trip: format -> parse -> should equal original value
    // The formatted string contains U+202F narrow no-break spaces in the fraction
    // which must be stripped for proper parsing
    const formatted1 = '1.23\u202F456\u202F789';
    expect(currencyToAmount(formatted1)).toBe(1.23456789);

    const formatted2 = '0.00\u202F000\u202F001';
    expect(currencyToAmount(formatted2)).toBe(0.00000001);

    const formatted3 = '123.45\u202F600\u202F000';
    expect(currencyToAmount(formatted3)).toBe(123.456);

    // Test with grouping separators in integer part
    const formatted4 = '1,234,567.89\u202F012\u202F345';
    expect(currencyToAmount(formatted4)).toBe(1234567.89012345);
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

  test('integerToCurrency works with sat-comma format', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    // 12345 satoshis = 0.00012345 BTC with 8 decimal places
    expect(integerToCurrency(12345)).toBe('0.00\u202F012\u202F345');
    // 123456789 satoshis = 1.23456789 BTC
    expect(integerToCurrency(123456789)).toBe('1.23\u202F456\u202F789');
    // 100000000 satoshis = 1 BTC
    expect(integerToCurrency(100000000)).toBe('1.00\u202F000\u202F000');

    setNumberFormat({ format: 'sat-comma', hideFraction: true });
    // With hideFraction, still displays as satoshis (the amount is converted to BTC then back to sats)
    // 12345 sats -> 0.00012345 BTC -> 12,345 sats displayed
    expect(integerToCurrency(12345)).toBe('12,345');
    // 123456789 sats -> 1.23456789 BTC -> 123,456,789 sats displayed
    expect(integerToCurrency(123456789)).toBe('123,456,789');
    // 100000000 sats -> 1 BTC -> 100,000,000 sats displayed
    expect(integerToCurrency(100000000)).toBe('100,000,000');
  });

  test('amountToCurrency works with sat-comma format', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    // 8 decimal places with special grouping
    expect(amountToCurrency(1.23456789)).toBe('1.23\u202F456\u202F789');
    expect(amountToCurrency(0.00000001)).toBe('0.00\u202F000\u202F001');
    expect(amountToCurrency(123.456)).toBe('123.45\u202F600\u202F000');
    expect(amountToCurrency(1234567.89012345)).toBe(
      '1,234,567.89\u202F012\u202F345',
    );

    setNumberFormat({ format: 'sat-comma', hideFraction: true });
    // Convert to satoshis (multiply by 100 million)
    expect(amountToCurrency(1.23456789)).toBe('123,456,789');
    expect(amountToCurrency(0.00000001)).toBe('1');
    expect(amountToCurrency(21)).toBe('2,100,000,000');
  });
  test('amountToCurrencyNoDecimal works with sat-comma format', () => {
    // This function always uses hideFraction: true
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    // Should still convert to satoshis even though base format has hideFraction: false
    expect(amountToCurrencyNoDecimal(1.23456789)).toBe('123,456,789');
    expect(amountToCurrencyNoDecimal(0.00000001)).toBe('1');
    expect(amountToCurrencyNoDecimal(21)).toBe('2,100,000,000');

    setNumberFormat({ format: 'sat-comma', hideFraction: true });
    expect(amountToCurrencyNoDecimal(1.23456789)).toBe('123,456,789');
  });

  test('amountToCurrency preserves negative sign for values between -1 and 0', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    // Regression test for negative values between -1 and 0
    // -0.00000001 BTC (the smallest unit: -1 satoshi)
    expect(amountToCurrency(-0.00000001)).toBe('-0.00\u202F000\u202F001');
    // -0.5 BTC
    expect(amountToCurrency(-0.5)).toBe('-0.50\u202F000\u202F000');
    // -0.00012345 BTC
    expect(amountToCurrency(-0.00012345)).toBe('-0.00\u202F012\u202F345');

    setNumberFormat({ format: 'sat-comma', hideFraction: true });
    // With hideFraction, show as negative satoshis
    expect(amountToCurrency(-0.00000001)).toBe('-1');
    expect(amountToCurrency(-0.5)).toBe('-50,000,000');
    expect(amountToCurrency(-0.00012345)).toBe('-12,345');
  });

  test('integerToCurrency preserves negative sign for negative satoshi values', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    // Negative satoshis converted to BTC
    expect(integerToCurrency(-1)).toBe('-0.00\u202F000\u202F001');
    expect(integerToCurrency(-12345)).toBe('-0.00\u202F012\u202F345');
    expect(integerToCurrency(-100000000)).toBe('-1.00\u202F000\u202F000');

    setNumberFormat({ format: 'sat-comma', hideFraction: true });
    // Display as negative satoshis
    expect(integerToCurrency(-1)).toBe('-1');
    expect(integerToCurrency(-12345)).toBe('-12,345');
    expect(integerToCurrency(-100000000)).toBe('-100,000,000');
  });

  test('amountToCurrency handles non-finite numbers (NaN, Infinity)', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    // NaN should be formatted as "NaN" by native Intl.NumberFormat
    expect(amountToCurrency(NaN)).toBe('NaN');
    // Infinity should be formatted as "∞" by native Intl.NumberFormat
    expect(amountToCurrency(Infinity)).toBe('∞');
    expect(amountToCurrency(-Infinity)).toBe('-∞');

    setNumberFormat({ format: 'sat-comma', hideFraction: true });
    // Non-finite numbers should still work with hideFraction
    expect(amountToCurrency(NaN)).toBe('NaN');
    expect(amountToCurrency(Infinity)).toBe('∞');
    expect(amountToCurrency(-Infinity)).toBe('-∞');
  });

  test('number formatting supports formatRangeToParts with locale-aware approximation', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    const formatter = getNumberFormat().formatter;

    // When start and end are different, should have separate parts with range separator
    const diffParts = formatter.formatRangeToParts(1.0, 2.0);
    expect(diffParts.some(p => p.source === 'startRange')).toBe(true);
    expect(diffParts.some(p => p.source === 'endRange')).toBe(true);
    expect(diffParts.some(p => p.value === '–')).toBe(true);

    // When start and end format to the same string, all parts should be 'shared'
    const sameParts = formatter.formatRangeToParts(1.23456789, 1.23456789);
    expect(sameParts.every(p => p.source === 'shared')).toBe(true);

    // The approximatelySign should be locale-aware, not hard-coded
    // In en-US locale, the native formatter may or may not include it
    // TypeScript types may not include 'approximatelySign', so check dynamically
    const hasApproxSign = sameParts.some(
      p => (p as { type: string }).type === 'approximatelySign',
    );
    if (hasApproxSign) {
      // If present, it should be the first part
      expect((sameParts[0] as { type: string }).type).toBe('approximatelySign');
      expect(sameParts[0].source).toBe('shared');
    }
  });

  test('formatRange produces correct string output', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    const formatter = getNumberFormat().formatter;

    // Different values should produce a range with separator
    const range1 = formatter.formatRange(1.0, 2.0);
    expect(range1).toContain('–');
    expect(range1).toMatch(/1\.00.*–.*2\.00/);

    // Same values should produce single value (possibly with approximation sign)
    const range2 = formatter.formatRange(1.23456789, 1.23456789);
    expect(range2).toMatch(/1\.23\u202F456\u202F789/);
    // Should not have range separator
    expect(range2).not.toContain('–');
  });

  test('formatRangeToParts uses locale-specific approximatelySign when available', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    const formatter = getNumberFormat().formatter;

    // Test with a locale that typically includes approximatelySign (e.g., ja-JP)
    // First check if native formatter for the test locale supports approximatelySign
    const testLocale = 'ja-JP';
    const nativeFormatter = new Intl.NumberFormat(testLocale);

    if (typeof nativeFormatter.formatRangeToParts === 'function') {
      // Check if this locale uses approximatelySign
      const nativeParts = nativeFormatter.formatRangeToParts(1, 1);
      // TypeScript types may not include 'approximatelySign', so check dynamically
      const nativeHasApprox = nativeParts.some(
        p => (p as { type: string }).type === 'approximatelySign',
      );

      if (nativeHasApprox) {
        // If the native formatter includes approximatelySign, our custom formatter should too
        // Note: SatNumberFormat uses the locale passed to its constructor
        const sameParts = formatter.formatRangeToParts(1.0, 1.0);

        // The approximatelySign behavior depends on the locale used by the formatter
        // Since formatter uses 'en-US' for sat-comma, check en-US behavior
        const enUsFormatter = new Intl.NumberFormat('en-US');
        if (typeof enUsFormatter.formatRangeToParts === 'function') {
          const enUsParts = enUsFormatter.formatRangeToParts(1, 1);
          const enUsHasApprox = enUsParts.some(
            p => (p as { type: string }).type === 'approximatelySign',
          );

          if (enUsHasApprox) {
            // en-US includes approximatelySign, so our formatter should too
            const approxPart = sameParts.find(
              p => (p as { type: string }).type === 'approximatelySign',
            );
            expect(approxPart).toBeDefined();
            expect(approxPart?.source).toBe('shared');
            expect((sameParts[0] as { type: string }).type).toBe(
              'approximatelySign',
            );
          }
        }
      }
    }

    // Verify that when approximatelySign is present, it comes first
    const parts = formatter.formatRangeToParts(1.0, 1.0);
    const approxIndex = parts.findIndex(
      p => (p as { type: string }).type === 'approximatelySign',
    );
    if (approxIndex !== -1) {
      // If approximatelySign exists, it should be the first part
      expect(approxIndex).toBe(0);
    }
  });
});
