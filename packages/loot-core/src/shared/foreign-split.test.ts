import { allocateByFraction, allocateProportionally } from './foreign-split';

describe('allocateProportionally', () => {
  it.each([
    // [total, weights, expected]
    [1000, [1, 1, 1], [334, 333, 333]],
    [-1000, [1, 1, 1], [-333, -333, -334]],
    [100, [3, 1], [75, 25]],
    [10, [7, -3], [18, -8]],
    [0, [5, 5], [0, 0]],
  ])('shares %i by %j', (total, weights, expected) => {
    const result = allocateProportionally(
      total,
      weights.map((weight, index) => ({ id: `c${index}`, weight })),
    );
    expect(result.map(part => part.amount)).toEqual(expected);
    expect(result.reduce((sum, part) => sum + part.amount, 0)).toBe(total);
  });

  it('breaks equal remainders by row id', () => {
    expect(
      allocateProportionally(1, [
        { id: 'b', weight: 1 },
        { id: 'a', weight: 1 },
      ]),
    ).toEqual([
      { id: 'b', amount: 0 },
      { id: 'a', amount: 1 },
    ]);
  });
});

describe('allocateByFraction', () => {
  it('keeps zero-summing exact values summing to zero', () => {
    // 150, -100 and -50 yen at 3 yen per cent: 50, -33.33 and -16.67 cents.
    const result = allocateByFraction(
      0,
      [
        { id: 'a', numerator: 150n },
        { id: 'b', numerator: -100n },
        { id: 'c', numerator: -50n },
      ],
      3n,
    );
    expect(result).toEqual([
      { id: 'a', amount: 50 },
      { id: 'b', amount: -33 },
      { id: 'c', amount: -17 },
    ]);
  });
});
