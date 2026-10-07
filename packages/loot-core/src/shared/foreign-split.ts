import { nativeToBaseFraction } from './exchange-rate';

/**
 * Integer shares of a total from exact fractions `numerator / denominator`
 * that sum to it: each share is floored, and the remainder goes one unit at
 * a time to the largest discarded fractions, stable row id breaking ties
 * (the shared rounding contract for splits).
 */
export function allocateByFraction(
  total: number,
  parts: ReadonlyArray<{ id: string; numerator: bigint }>,
  denominator: bigint,
): Array<{ id: string; amount: number }> {
  if (denominator === 0n) throw new Error('allocation-denominator-zero');
  const sign = denominator < 0n ? -1n : 1n;
  const d = denominator * sign;
  const floored = parts.map(part => {
    const n = part.numerator * sign;
    let quotient = n / d;
    if (n % d !== 0n && n < 0n) quotient -= 1n;
    return { id: part.id, amount: quotient, remainder: n - quotient * d };
  });
  let remaining =
    BigInt(total) - floored.reduce((sum, part) => sum + part.amount, 0n);
  if (remaining < 0n || remaining > BigInt(parts.length)) {
    throw new Error('allocation-inexact');
  }
  const ranked = [...floored].sort((a, b) =>
    a.remainder !== b.remainder
      ? a.remainder > b.remainder
        ? -1
        : 1
      : a.id < b.id
        ? -1
        : a.id > b.id
          ? 1
          : 0,
  );
  for (const part of ranked) {
    if (remaining === 0n) break;
    part.amount += 1n;
    remaining -= 1n;
  }
  return floored.map(part => {
    const amount = Number(part.amount);
    if (!Number.isSafeInteger(amount)) throw new Error('amount-out-of-range');
    return { id: part.id, amount };
  });
}

/** A total shared in proportion to nonzero-summing integer weights. */
export function allocateProportionally(
  total: number,
  weights: ReadonlyArray<{ id: string; weight: number }>,
): Array<{ id: string; amount: number }> {
  const sum = weights.reduce((acc, part) => acc + BigInt(part.weight), 0n);
  return allocateByFraction(
    total,
    weights.map(part => ({
      id: part.id,
      numerator: BigInt(total) * BigInt(part.weight),
    })),
    sum,
  );
}

/**
 * The base amounts of a foreign split's children: shares of the parent's
 * base in proportion to their native amounts, or, for a zero native total,
 * each child's value at `zeroTotal.rate` with any confirmed parent base
 * shared by size (equally when every child is zero). Remainders follow the
 * shared rounding contract, so the save and its preview agree exactly.
 */
export function foreignSplitBases(
  parentBase: number,
  children: ReadonlyArray<{ id: string; native: number }>,
  zeroTotal?: { rate: string; nativePrecision: number; basePrecision: number },
): Array<{ id: string; amount: number }> {
  const total = children.reduce((sum, child) => sum + BigInt(child.native), 0n);
  if (total !== 0n) {
    return allocateProportionally(
      parentBase,
      children.map(child => ({ id: child.id, weight: child.native })),
    );
  }
  if (!zeroTotal) throw new Error('rate-unavailable');
  const fractions = children.map(child => ({
    id: child.id,
    ...nativeToBaseFraction(
      child.native,
      zeroTotal.nativePrecision,
      zeroTotal.basePrecision,
      zeroTotal.rate,
    ),
  }));
  const atRate = allocateByFraction(
    0,
    fractions.map(part => ({ id: part.id, numerator: part.numerator })),
    fractions[0].denominator,
  );
  const sizes = children.map(child => Math.abs(child.native));
  const allZero = sizes.every(size => size === 0);
  const residual = allocateProportionally(
    parentBase,
    children.map((child, index) => ({
      id: child.id,
      weight: allZero ? 1 : sizes[index],
    })),
  );
  return atRate.map((part, index) => {
    const amount = part.amount + residual[index].amount;
    if (!Number.isSafeInteger(amount)) throw new Error('amount-out-of-range');
    return { id: part.id, amount };
  });
}
