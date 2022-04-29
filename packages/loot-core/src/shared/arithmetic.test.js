import evalArithmetic from './arithmetic';

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
  });
});
