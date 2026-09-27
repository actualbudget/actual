import {
  rescaleAmount,
  rescaleAmountGroup,
  rescaleDecimalAmount,
} from './amount-rescale';

describe('encoding amount rescale', () => {
  it.each([
    [150, 2, 0, 2],
    [250, 2, 0, 2],
    [-150, 2, 0, -2],
    [-250, 2, 0, -2],
    [50, 2, 0, 0],
    [-50, 2, 0, 0],
    [149, 2, 0, 1],
    [-151, 2, 0, -2],
    [123, 2, 3, 1230],
    [1235, 3, 2, 124],
    [-1245, 3, 2, -124],
    [12, 0, 2, 1200],
    [123, 2, 2, 123],
    [Number.MAX_SAFE_INTEGER, 2, 2, Number.MAX_SAFE_INTEGER],
  ])('rescales %s from %sdp to %sdp as %s', (amount, from, to, expected) => {
    expect(rescaleAmount(amount, from, to)).toBe(expected);
  });

  it('preserves NULL and uses explicit legacy 2dp without a currency lookup', () => {
    expect(rescaleAmount(null, 2, 0)).toBeNull();
    expect(rescaleAmount(123, 2, 2)).toBe(123);
  });

  it('rejects invalid units and unsafe input or output', () => {
    for (const precision of [-1, 1.5, 16, NaN, Infinity]) {
      expect(() => rescaleAmount(1, precision, 2)).toThrow();
      expect(() => rescaleAmount(null, 2, precision)).toThrow();
    }
    for (const amount of [0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => rescaleAmount(amount, 2, 0)).toThrow();
    }
    expect(() => rescaleAmount(Number.MAX_SAFE_INTEGER, 2, 3)).toThrow();
  });

  it('allocates split remainders by fraction then stable ID, preserving input order', () => {
    const rows = [
      { id: 'c', amount: 149 },
      { id: 'b', amount: 150 },
      { id: 'a', amount: 150 },
    ];
    expect(rescaleAmountGroup(rows, 2, 0)).toEqual([
      { id: 'c', amount: 1 },
      { id: 'b', amount: 1 },
      { id: 'a', amount: 2 },
    ]);
    expect(rescaleAmountGroup([...rows].reverse(), 2, 0)).toEqual(
      rescaleAmountGroup(rows, 2, 0).reverse(),
    );
    expect(rows.map(row => row.amount)).toEqual([149, 150, 150]);
  });

  it('conserves positive, negative and mixed split totals at 0dp, 2dp and 3dp', () => {
    for (const amounts of [
      [150, 150],
      [-150, -150],
      [150, -250, 49],
    ]) {
      for (const from of [0, 2, 3]) {
        for (const to of [0, 2, 3]) {
          const rows = amounts.map((amount, index) => ({
            id: String(index),
            amount,
          }));
          expect(
            rescaleAmountGroup(rows, from, to).reduce(
              (sum, row) => sum + row.amount,
              0,
            ),
          ).toBe(
            rescaleAmount(
              amounts.reduce((a, b) => a + b, 0),
              from,
              to,
            ),
          );
        }
      }
    }
  });

  it('keeps independently rescaled opposite transfer legs equal and opposite', () => {
    for (const amount of [50, 150, 250, 151, Number.MAX_SAFE_INTEGER]) {
      expect(rescaleAmount(amount, 2, 0)).toBe(
        -(rescaleAmount(-amount, 2, 0) ?? 0) || 0,
      );
    }
  });

  it('handles empty groups and rejects duplicate IDs or overflowing totals', () => {
    expect(rescaleAmountGroup([], 2, 0)).toEqual([]);
    expect(() =>
      rescaleAmountGroup(
        [
          { id: 'a', amount: 1 },
          { id: 'a', amount: 2 },
        ],
        2,
        0,
      ),
    ).toThrow();
    expect(() =>
      rescaleAmountGroup(
        [
          { id: 'a', amount: Number.MAX_SAFE_INTEGER },
          { id: 'b', amount: Number.MAX_SAFE_INTEGER },
        ],
        2,
        2,
      ),
    ).toThrow();
  });
});

describe('decimal amount rescale', () => {
  it.each([
    ['123', 0, 123],
    ['123.45', 2, 12345],
    ['-123.456', 3, -123456],
  ])('rescales %s to %sdp as %s', (amount, precision, expected) => {
    expect(rescaleDecimalAmount(amount, precision)).toBe(expected);
  });

  it('rejects amounts beyond the safe integer range', () => {
    expect(() => rescaleDecimalAmount('9007199254740992', 0)).toThrow();
  });
});
