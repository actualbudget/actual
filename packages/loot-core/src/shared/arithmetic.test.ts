import { evalArithmetic } from './arithmetic';
import { setNumberFormat } from './util';

describe('arithmetic', () => {
  test('handles negative numbers', () => {
    expect(evalArithmetic('-4')).toBe(-4);
    expect(evalArithmetic('10 + -4')).toBe(6);
  });

  test('handles simple addition', () => {
    expect(evalArithmetic('10 + 10')).toEqual(20);
    expect(evalArithmetic('1.5 + 1.5')).toEqual(3);
    expect(evalArithmetic('(12 + 3) + (10)')).toEqual(25);
    expect(evalArithmetic('10 + 20 + 30 + 40')).toEqual(100);
  });

  test('handles simple subtraction', () => {
    expect(evalArithmetic('10 - 10')).toEqual(0);
    expect(evalArithmetic('4.5 - 1.5')).toEqual(3);
    expect(evalArithmetic('(12 - 3) - (10)')).toEqual(-1);
    expect(evalArithmetic('10 - 20 - 30 - 40')).toEqual(-80);
  });

  test('handles multiplication', () => {
    expect(evalArithmetic('10 * 10')).toEqual(100);
    expect(evalArithmetic('1.5 * 1.5')).toEqual(2.25);
    expect(evalArithmetic('10 * 20 * 30 * 40')).toEqual(240000);
  });

  test('handles division', () => {
    expect(evalArithmetic('10 / 10')).toEqual(1);
    expect(evalArithmetic('1.5 / .5')).toEqual(3);
    expect(evalArithmetic('2400 / 2 / 5')).toEqual(240);
  });

  test('handles order of operations', () => {
    expect(evalArithmetic('(5 + 3) * 10')).toEqual(80);
    expect(evalArithmetic('5 + 3 * 10')).toEqual(35);
    expect(evalArithmetic('20^3 - 5 * (10 / 2)')).toEqual(7975);
  });

  test('respects current number format', () => {
    expect(evalArithmetic('1,222.45')).toEqual(1222.45);

    setNumberFormat({ format: 'space-comma', hideFraction: false });
    expect(evalArithmetic('1\u202F222,45')).toEqual(1222.45);

    setNumberFormat({ format: 'apostrophe-dot', hideFraction: false });
    expect(evalArithmetic(`1\u2019222.45`)).toEqual(1222.45);
  });

  test('handles apostrophe-dot format with keyboard apostrophe (U+0027)', () => {
    setNumberFormat({ format: 'apostrophe-dot', hideFraction: false });

    // Test with keyboard apostrophe (U+0027) - what users type
    const keyboardApostrophe = '12\u0027345.67';
    expect(keyboardApostrophe.charCodeAt(2)).toBe(0x0027); // Verify it's U+0027
    expect(evalArithmetic(keyboardApostrophe)).toBe(12345.67);

    // More test cases with keyboard apostrophe
    expect(evalArithmetic('1\u0027234.56')).toBe(1234.56);
    expect(evalArithmetic('1\u0027000.33')).toBe(1000.33);
    expect(evalArithmetic('100\u0027000.99')).toBe(100000.99);
    expect(evalArithmetic('1\u0027000\u0027000.50')).toBe(1000000.5);
  });

  test('handles apostrophe-dot format with typographic apostrophe (U+2019)', () => {
    setNumberFormat({ format: 'apostrophe-dot', hideFraction: false });

    // Test with right single quotation mark (U+2019) - what Intl.NumberFormat outputs
    const intlApostrophe = '12\u2019345.67';
    expect(intlApostrophe.charCodeAt(2)).toBe(0x2019); // Verify it's U+2019
    expect(evalArithmetic(intlApostrophe)).toBe(12345.67);

    // More test cases with typographic apostrophe
    expect(evalArithmetic('1\u2019234.56')).toBe(1234.56);
    expect(evalArithmetic('1\u2019000.33')).toBe(1000.33);
  });

  test('handles apostrophe-dot format in arithmetic expressions', () => {
    setNumberFormat({ format: 'apostrophe-dot', hideFraction: false });

    // Test arithmetic operations with keyboard apostrophe
    expect(evalArithmetic('1\u0027000 + 2\u0027000')).toBe(3000);
    expect(evalArithmetic('10\u0027000 - 2\u0027500')).toBe(7500);
    expect(evalArithmetic('1\u0027000 * 2')).toBe(2000);
    expect(evalArithmetic('4\u0027000 / 2')).toBe(2000);

    // Test arithmetic operations with typographic apostrophe
    expect(evalArithmetic('1\u2019000 + 2\u2019000')).toBe(3000);
    expect(evalArithmetic('10\u2019000 - 2\u2019500')).toBe(7500);
  });
});
