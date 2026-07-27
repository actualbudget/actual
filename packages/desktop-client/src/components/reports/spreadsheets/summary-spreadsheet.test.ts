import { describe, expect, it } from 'vitest';

import { combineTerms, computePercentage } from './summary-spreadsheet';

describe('combineTerms', () => {
  it('returns the base when there are no terms', () => {
    expect(combineTerms(1000, [])).toBe(1000);
  });

  it('adds an added term', () => {
    expect(combineTerms(1000, [{ op: 'add', value: 250 }])).toBe(1250);
  });

  it('subtracts a subtracted term', () => {
    expect(combineTerms(3000, [{ op: 'subtract', value: 500 }])).toBe(2500);
  });

  it('applies multiple terms left to right', () => {
    expect(
      combineTerms(3000, [
        { op: 'subtract', value: 500 },
        { op: 'add', value: 100 },
      ]),
    ).toBe(2600);
  });

  it('models savings over income minus taxes denominator', () => {
    const denominator = combineTerms(3000, [{ op: 'subtract', value: 500 }]);
    expect(Math.round((1000 / denominator) * 10000) / 100).toBe(40);
  });

  it('treats each amount as a magnitude regardless of stored sign', () => {
    // expenses are stored negative; subtracting one must reduce the total
    expect(combineTerms(-3000, [{ op: 'subtract', value: -500 }])).toBe(2500);
    expect(combineTerms(-3000, [{ op: 'add', value: -500 }])).toBe(3500);
  });

  it('uses the magnitude of every term across mixed signs', () => {
    // base and each term contribute their absolute value, regardless of sign
    expect(
      combineTerms(-1000, [
        { op: 'add', value: 400 },
        { op: 'subtract', value: -250 },
        { op: 'add', value: -100 },
      ]),
    ).toBe(1000 + 400 - 250 + 100);
    expect(
      combineTerms(2000, [
        { op: 'subtract', value: -1500 },
        { op: 'subtract', value: 300 },
      ]),
    ).toBe(2000 - 1500 - 300);
  });
});

describe('computePercentage', () => {
  it('computes a basic ratio as a percentage', () => {
    expect(computePercentage(1000, 2500)).toBe(40);
    expect(computePercentage(5237.74, 5237.74)).toBe(100);
  });

  it('stays positive regardless of the sign of dividend or divisor', () => {
    const cases: Array<[number, number]> = [
      [1000, 2500],
      [-1000, 2500],
      [1000, -2500],
      [-1000, -2500],
      [-333.75, 12968.07],
      [-9999.99, 1000],
      [5237.74, -5237.74],
    ];
    for (const [dividend, divisor] of cases) {
      expect(computePercentage(dividend, divisor)).toBeGreaterThanOrEqual(0);
    }
    // magnitude ratio: sign of the operands never changes the result
    expect(computePercentage(-1000, 2500)).toBe(40);
    expect(computePercentage(1000, -2500)).toBe(40);
    expect(computePercentage(-1000, -2500)).toBe(40);
  });

  it('returns 0 when the divisor is 0 instead of Infinity/NaN', () => {
    expect(computePercentage(1000, 0)).toBe(0);
    expect(computePercentage(0, 0)).toBe(0);
    expect(Number.isFinite(computePercentage(1000, 0))).toBe(true);
  });

  it('keeps the percentage positive end-to-end with magnitude terms', () => {
    // savings 1000 over (income 5000 - taxes 1200), with expenses stored negative
    const dividend = combineTerms(1000, []);
    const divisor = combineTerms(5000, [{ op: 'subtract', value: -1200 }]);
    expect(divisor).toBe(3800);
    expect(computePercentage(dividend, divisor)).toBeCloseTo(26.32, 2);

    // even when subtracted terms exceed the base, the % is still reported positive
    const negativeDividend = combineTerms(200, [
      { op: 'subtract', value: -500 },
    ]);
    expect(negativeDividend).toBe(-300);
    expect(computePercentage(negativeDividend, 1000)).toBe(30);
  });
});
