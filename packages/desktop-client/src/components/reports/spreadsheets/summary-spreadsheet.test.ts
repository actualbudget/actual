import { combineTerms } from './summary-spreadsheet';

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
});
