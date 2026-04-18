import { beforeEach, describe, expect, test } from 'vitest';

import { getCurrency } from './currencies';
import {
  amountToFormatted,
  amountToFormattedNoDecimal,
  currencyToFormatted,
  formattedToAmount,
  getNumberFormat,
  integerToFormatted,
  looselyParseAmount,
  setNumberFormat,
  stringToInteger,
  titleFirst,
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

  test('formattedToAmount works with basic numbers', () => {
    expect(formattedToAmount('3')).toBe(3);
    expect(formattedToAmount('3.4')).toBe(3.4);
    expect(formattedToAmount('3.45')).toBe(3.45);
    expect(formattedToAmount('3.45060')).toBe(3.4506);
  });

  test('formattedToAmount works with varied formats', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(formattedToAmount('3,45')).toBe(3.45);
    expect(formattedToAmount('3,456')).toBe(3456);
    expect(formattedToAmount('3,45000')).toBe(345000);
    expect(formattedToAmount("3'456.78")).toBe(3456.78);
    expect(formattedToAmount("3'456.78000")).toBe(3456.78);
    expect(formattedToAmount('1,00,000.99')).toBe(100000.99);
    expect(formattedToAmount('1,00,000.99000')).toBe(100000.99);
  });

  test('formattedToAmount works with leading decimal characters', () => {
    expect(formattedToAmount('.45')).toBe(0.45);
    expect(formattedToAmount(',45')).toBe(0.45);
  });

  test('formattedToAmount works with negative numbers', () => {
    expect(formattedToAmount('-3')).toBe(-3);
    expect(formattedToAmount('-3.45')).toBe(-3.45);
    expect(formattedToAmount('-3,45')).toBe(-3.45);
    // Unicode minus
    expect(formattedToAmount('−3')).toBe(-3);
    expect(formattedToAmount('−3.45')).toBe(-3.45);
    expect(formattedToAmount('−3,45')).toBe(-3.45);
  });

  test('formattedToAmount works with non-fractional numbers', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    expect(formattedToAmount('3.')).toBe(3);
    expect(formattedToAmount('3,')).toBe(3);
    expect(formattedToAmount('3,000')).toBe(3000);
    expect(formattedToAmount('3,000.')).toBe(3000);
  });

  test('formattedToAmount works with hidden fractions', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(formattedToAmount('3.45')).toBe(3.45);
    expect(formattedToAmount('3.456')).toBe(3.456);
    expect(formattedToAmount('3.4500')).toBe(3.45);
    expect(formattedToAmount('3.')).toBe(3);
    expect(formattedToAmount('3,')).toBe(3);
    expect(formattedToAmount('3,000')).toBe(3000);
    expect(formattedToAmount('3,000.')).toBe(3000);
  });

  test('formattedToAmount works with apostrophe-dot format', () => {
    setNumberFormat({ format: 'apostrophe-dot', hideFraction: false });

    // Test with regular apostrophe (U+0027) - what users type on keyboard
    const keyboardApostrophe = '12\u0027345.67';
    expect(keyboardApostrophe.charCodeAt(2)).toBe(0x0027); // Verify it's U+0027
    expect(formattedToAmount(keyboardApostrophe)).toBe(12345.67);
    expect(formattedToAmount('1\u0027234.56')).toBe(1234.56);
    expect(formattedToAmount('1\u0027000.33')).toBe(1000.33);
    expect(formattedToAmount('100\u0027000.99')).toBe(100000.99);
    expect(formattedToAmount('1\u0027000\u0027000.50')).toBe(1000000.5);

    // Test with right single quotation mark (U+2019) - what Intl.NumberFormat outputs
    const intlApostrophe = '12\u2019345.67';
    expect(intlApostrophe.charCodeAt(2)).toBe(0x2019); // Verify it's U+2019
    expect(formattedToAmount(intlApostrophe)).toBe(12345.67);
    expect(formattedToAmount('1\u2019234.56')).toBe(1234.56);
    expect(formattedToAmount('1\u2019000.33')).toBe(1000.33);
  });

  test('formattedToAmount works with dot-comma', () => {
    setNumberFormat({ format: 'dot-comma', hideFraction: false });
    expect(formattedToAmount('3,45')).toBe(3.45);
    expect(formattedToAmount('3,456')).toBe(3.456);
    expect(formattedToAmount('3,4500')).toBe(3.45);
    expect(formattedToAmount('3,')).toBe(3);
    expect(formattedToAmount('3.')).toBe(3);
    expect(formattedToAmount('3.000')).toBe(3000);
    expect(formattedToAmount('3.000,')).toBe(3000);
  });

  test('formattedToAmount works with sat-comma format (round-trip precision)', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    // Test round-trip: format -> parse -> should equal original value
    // The formatted string contains U+202F narrow no-break spaces in the fraction
    // which must be stripped for proper parsing
    const formatted1 = '1.23\u202F456\u202F789';
    expect(formattedToAmount(formatted1)).toBe(1.23456789);

    const formatted2 = '0.00\u202F000\u202F001';
    expect(formattedToAmount(formatted2)).toBe(0.00000001);

    const formatted3 = '123.45\u202F600\u202F000';
    expect(formattedToAmount(formatted3)).toBe(123.456);

    // Test with grouping separators in integer part
    const formatted4 = '1,234,567.89\u202F012\u202F345';
    expect(formattedToAmount(formatted4)).toBe(1234567.89012345);
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

  test('integerToFormatted works with sat-comma format', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    // 12345 satoshis = 0.00012345 BTC with 8 decimal places
    expect(integerToFormatted(12345)).toBe('0.00\u202F012\u202F345');
    // 123456789 satoshis = 1.23456789 BTC
    expect(integerToFormatted(123456789)).toBe('1.23\u202F456\u202F789');
    // 100000000 satoshis = 1 BTC
    expect(integerToFormatted(100000000)).toBe('1.00\u202F000\u202F000');

    setNumberFormat({ format: 'sat-comma', hideFraction: true });
    // With hideFraction, still displays as satoshis (the amount is converted to BTC then back to sats)
    // 12345 sats -> 0.00012345 BTC -> 12,345 sats displayed
    expect(integerToFormatted(12345)).toBe('12,345');
    // 123456789 sats -> 1.23456789 BTC -> 123,456,789 sats displayed
    expect(integerToFormatted(123456789)).toBe('123,456,789');
    // 100000000 sats -> 1 BTC -> 100,000,000 sats displayed
    expect(integerToFormatted(100000000)).toBe('100,000,000');
  });

  test('amountToFormatted works with sat-comma format', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    // 8 decimal places with special grouping
    expect(amountToFormatted(1.23456789)).toBe('1.23\u202F456\u202F789');
    expect(amountToFormatted(0.00000001)).toBe('0.00\u202F000\u202F001');
    expect(amountToFormatted(123.456)).toBe('123.45\u202F600\u202F000');
    expect(amountToFormatted(1234567.89012345)).toBe(
      '1,234,567.89\u202F012\u202F345',
    );

    setNumberFormat({ format: 'sat-comma', hideFraction: true });
    // Convert to satoshis (multiply by 100 million)
    expect(amountToFormatted(1.23456789)).toBe('123,456,789');
    expect(amountToFormatted(0.00000001)).toBe('1');
    expect(amountToFormatted(21)).toBe('2,100,000,000');
  });
  test('amountToFormattedNoDecimal works with sat-comma format', () => {
    // This function always uses hideFraction: true
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    // Should still convert to satoshis even though base format has hideFraction: false
    expect(amountToFormattedNoDecimal(1.23456789)).toBe('123,456,789');
    expect(amountToFormattedNoDecimal(0.00000001)).toBe('1');
    expect(amountToFormattedNoDecimal(21)).toBe('2,100,000,000');

    setNumberFormat({ format: 'sat-comma', hideFraction: true });
    expect(amountToFormattedNoDecimal(1.23456789)).toBe('123,456,789');
  });

  test('amountToFormatted preserves negative sign for values between -1 and 0', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    // Regression test for negative values between -1 and 0
    // -0.00000001 BTC (the smallest unit: -1 satoshi)
    expect(amountToFormatted(-0.00000001)).toBe('-0.00\u202F000\u202F001');
    // -0.5 BTC
    expect(amountToFormatted(-0.5)).toBe('-0.50\u202F000\u202F000');
    // -0.00012345 BTC
    expect(amountToFormatted(-0.00012345)).toBe('-0.00\u202F012\u202F345');

    setNumberFormat({ format: 'sat-comma', hideFraction: true });
    // With hideFraction, show as negative satoshis
    expect(amountToFormatted(-0.00000001)).toBe('-1');
    expect(amountToFormatted(-0.5)).toBe('-50,000,000');
    expect(amountToFormatted(-0.00012345)).toBe('-12,345');
  });

  test('integerToFormatted preserves negative sign for negative satoshi values', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    // Negative satoshis converted to BTC
    expect(integerToFormatted(-1)).toBe('-0.00\u202F000\u202F001');
    expect(integerToFormatted(-12345)).toBe('-0.00\u202F012\u202F345');
    expect(integerToFormatted(-100000000)).toBe('-1.00\u202F000\u202F000');

    setNumberFormat({ format: 'sat-comma', hideFraction: true });
    // Display as negative satoshis
    expect(integerToFormatted(-1)).toBe('-1');
    expect(integerToFormatted(-12345)).toBe('-12,345');
    expect(integerToFormatted(-100000000)).toBe('-100,000,000');
  });

  test('amountToFormatted handles non-finite numbers (NaN, Infinity)', () => {
    setNumberFormat({ format: 'sat-comma', hideFraction: false });
    // NaN should be formatted as "NaN" by native Intl.NumberFormat
    expect(amountToFormatted(NaN)).toBe('NaN');
    // Infinity should be formatted as "∞" by native Intl.NumberFormat
    expect(amountToFormatted(Infinity)).toBe('∞');
    expect(amountToFormatted(-Infinity)).toBe('-∞');

    setNumberFormat({ format: 'sat-comma', hideFraction: true });
    // Non-finite numbers should still work with hideFraction
    expect(amountToFormatted(NaN)).toBe('NaN');
    expect(amountToFormatted(Infinity)).toBe('∞');
    expect(amountToFormatted(-Infinity)).toBe('-∞');
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

  describe('amountToFormatted with decimal places', () => {
    beforeEach(() => {
      // Set a consistent number format for these tests
      setNumberFormat({ format: 'comma-dot', hideFraction: false });
    });

    test('formats amounts with 8 decimal places (Bitcoin)', () => {
      expect(amountToFormatted(0.00114978, undefined, 8)).toBe('0.00114978');
      expect(amountToFormatted(1.23456789, undefined, 8)).toBe('1.23456789');
      expect(amountToFormatted(0, undefined, 8)).toBe('0.00000000');
    });

    test('formats amounts with 0 decimal places (Japanese Yen)', () => {
      expect(amountToFormatted(1500, undefined, 0)).toBe('1,500');
      expect(amountToFormatted(1234567, undefined, 0)).toBe('1,234,567');
      expect(amountToFormatted(0, undefined, 0)).toBe('0');
    });

    test('formats amounts with 3 decimal places', () => {
      expect(amountToFormatted(12.345, undefined, 3)).toBe('12.345');
      expect(amountToFormatted(1234.567, undefined, 3)).toBe('1,234.567');
      expect(amountToFormatted(0, undefined, 3)).toBe('0.000');
    });

    test('formats amounts with default 2 decimal places', () => {
      expect(amountToFormatted(123.45)).toBe('123.45');
      expect(amountToFormatted(123.45, undefined, 2)).toBe('123.45');
    });

    test('formats negative amounts correctly with various decimal places', () => {
      expect(amountToFormatted(-0.00114978, undefined, 8)).toBe('-0.00114978');
      expect(amountToFormatted(-1500, undefined, 0)).toBe('-1,500');
      expect(amountToFormatted(-12.345, undefined, 3)).toBe('-12.345');
    });
  });

  describe('currencyToFormatted', () => {
    test('formats USD amounts correctly', () => {
      const usd = getCurrency('USD');
      expect(currencyToFormatted({ currency: usd, amount: 12345 })).toBe(
        '\u202A$\u202C123.45',
      );
      expect(currencyToFormatted({ currency: usd, amount: -12345 })).toBe(
        '-\u202A$\u202C123.45',
      );
      expect(currencyToFormatted({ currency: usd, amount: 0 })).toBe(
        '\u202A$\u202C0.00',
      );
      expect(currencyToFormatted({ currency: usd, amount: 100 })).toBe(
        '\u202A$\u202C1.00',
      );
    });

    test('formats EUR amounts correctly', () => {
      const eur = getCurrency('EUR');
      expect(currencyToFormatted({ currency: eur, amount: 12345 })).toBe(
        '123,45€',
      );
      expect(currencyToFormatted({ currency: eur, amount: -12345 })).toBe(
        '-123,45€',
      );
      expect(currencyToFormatted({ currency: eur, amount: 0 })).toBe('0,00€');
    });

    test('formats GBP amounts correctly', () => {
      const gbp = getCurrency('GBP');
      expect(currencyToFormatted({ currency: gbp, amount: 12345 })).toBe(
        '\u202A£\u202C123.45',
      );
      expect(currencyToFormatted({ currency: gbp, amount: -12345 })).toBe(
        '-\u202A£\u202C123.45',
      );
    });

    test('formats amounts with space-comma format (SEK)', () => {
      const sek = getCurrency('SEK');
      expect(currencyToFormatted({ currency: sek, amount: 12345 })).toBe(
        '123,45kr',
      );
      expect(currencyToFormatted({ currency: sek, amount: 123456789 })).toBe(
        '1\u202F234\u202F567,89kr',
      );
    });

    test('formats amounts with apostrophe-dot format (CHF)', () => {
      const chf = getCurrency('CHF');
      expect(currencyToFormatted({ currency: chf, amount: 12345 })).toBe(
        '\u202ACHF\u202C123.45',
      );
      expect(currencyToFormatted({ currency: chf, amount: 123456789 })).toBe(
        '\u202ACHF\u202C1\u2019234\u2019567.89',
      );
    });

    test('formats amounts with comma-dot-in format (INR)', () => {
      const inr = getCurrency('INR');
      expect(currencyToFormatted({ currency: inr, amount: 123456789 })).toBe(
        '\u202A₹\u202C12,34,567.89',
      );
    });

    test('formats empty currency (no symbol)', () => {
      const noCurrency = getCurrency('');
      expect(currencyToFormatted({ currency: noCurrency, amount: 12345 })).toBe(
        '123.45',
      );
      expect(
        currencyToFormatted({ currency: noCurrency, amount: -12345 }),
      ).toBe('-123.45');
    });

    test('respects hideFraction option', () => {
      const usd = getCurrency('USD');
      expect(
        currencyToFormatted(
          { currency: usd, amount: 12345 },
          { hideFraction: true },
        ),
      ).toBe('\u202A$\u202C123');

      const eur = getCurrency('EUR');
      expect(
        currencyToFormatted(
          { currency: eur, amount: 12345 },
          { hideFraction: true },
        ),
      ).toBe('123€');
    });

    test('respects symbolPosition option', () => {
      const usd = getCurrency('USD');
      expect(
        currencyToFormatted(
          { currency: usd, amount: 12345 },
          { symbolPosition: 'after' },
        ),
      ).toBe('123.45$');

      const eur = getCurrency('EUR');
      expect(
        currencyToFormatted(
          { currency: eur, amount: 12345 },
          { symbolPosition: 'before' },
        ),
      ).toBe('\u202A€\u202C123,45');
    });

    test('respects spaceEnabled option', () => {
      const usd = getCurrency('USD');
      expect(
        currencyToFormatted(
          { currency: usd, amount: 12345 },
          { spaceEnabled: true },
        ),
      ).toBe('\u202A$\u202C\u202F123.45');

      expect(
        currencyToFormatted(
          { currency: usd, amount: 12345 },
          { symbolPosition: 'after', spaceEnabled: true },
        ),
      ).toBe('123.45\u202F$');
    });

    test('handles large amounts correctly', () => {
      const usd = getCurrency('USD');
      expect(currencyToFormatted({ currency: usd, amount: 1234567890 })).toBe(
        '\u202A$\u202C12,345,678.90',
      );

      const eur = getCurrency('EUR');
      expect(currencyToFormatted({ currency: eur, amount: 1234567890 })).toBe(
        '12.345.678,90€',
      );
    });

    test('handles zero and small amounts', () => {
      const usd = getCurrency('USD');
      expect(currencyToFormatted({ currency: usd, amount: 0 })).toBe(
        '\u202A$\u202C0.00',
      );
      expect(currencyToFormatted({ currency: usd, amount: 1 })).toBe(
        '\u202A$\u202C0.01',
      );
      expect(currencyToFormatted({ currency: usd, amount: 10 })).toBe(
        '\u202A$\u202C0.10',
      );
      expect(currencyToFormatted({ currency: usd, amount: 99 })).toBe(
        '\u202A$\u202C0.99',
      );
    });
  });
});
