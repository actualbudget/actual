function scaleForPrecision(precision: number): bigint {
  if (!Number.isInteger(precision) || precision < 0 || precision > 15) {
    throw new Error('Amount precision must be an integer between 0 and 15');
  }
  return 10n ** BigInt(precision);
}

function integerAmount(amount: number): bigint {
  if (!Number.isSafeInteger(amount)) {
    throw new Error('Amount must be a safe integer');
  }
  return BigInt(amount);
}

function safeAmount(amount: bigint): number {
  const result = Number(amount);
  if (!Number.isSafeInteger(result)) {
    throw new Error('Rescaled amount exceeds the safe integer range');
  }
  return result;
}

/** Rounds a rational value half to even. */
export function roundEven(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const distance = (remainder < 0n ? -remainder : remainder) * 2n;
  if (
    distance > denominator ||
    (distance === denominator && quotient % 2n !== 0n)
  ) {
    return quotient + (numerator < 0n ? -1n : 1n);
  }
  return quotient;
}

/** Precision comes from the stored and target encoding snapshots. */
export function rescaleAmount(
  amount: number | null,
  sourcePrecision: number,
  targetPrecision: number,
): number | null {
  const sourceScale = scaleForPrecision(sourcePrecision);
  const targetScale = scaleForPrecision(targetPrecision);
  return amount === null
    ? null
    : safeAmount(roundEven(integerAmount(amount) * targetScale, sourceScale));
}

/** Parse decimal major units and round only after scaling to destination units. */
export function rescaleDecimalAmount(
  amount: string,
  targetPrecision: number,
): number {
  if (!/^-?\d+(?:\.\d+)?$/.test(amount)) {
    throw new Error('Invalid decimal amount');
  }
  const [whole, fraction = ''] = amount.replace('-', '').split('.');
  const sign = amount.startsWith('-') ? -1n : 1n;
  const sourceScale = scaleForPrecision(fraction.length);
  const targetScale = scaleForPrecision(targetPrecision);
  const unscaled = sign * BigInt(whole + fraction);
  return safeAmount(roundEven(unscaled * targetScale, sourceScale));
}

/** Allocate a rounded parent total across its children without changing order. */
export function rescaleAmountGroup(
  rows: ReadonlyArray<{ id: string; amount: number }>,
  sourcePrecision: number,
  targetPrecision: number,
  parentAmount?: number,
): Array<{ id: string; amount: number }> {
  const sourceScale = scaleForPrecision(sourcePrecision);
  const targetScale = scaleForPrecision(targetPrecision);
  return allocateFractions(
    rows.map(row => ({
      id: row.id,
      numerator: integerAmount(row.amount) * targetScale,
    })),
    sourceScale,
    parentAmount === undefined
      ? undefined
      : integerAmount(parentAmount) * targetScale,
  );
}

/**
 * Rounds exact values `numerator / denominator` to integers that sum to the
 * rounded total (by default the rounded sum of the values), giving the
 * remaining units to the largest discarded fractions with stable id ties
 * (plan/01-reference.md).
 */
export function allocateFractions(
  rows: ReadonlyArray<{ id: string; numerator: bigint }>,
  denominator: bigint,
  totalNumerator?: bigint,
): Array<{ id: string; amount: number }> {
  const allocated = allocateFractionsExact(rows, denominator, totalNumerator);
  safeAmount(
    roundEven(
      totalNumerator ?? rows.reduce((sum, row) => sum + row.numerator, 0n),
      denominator,
    ),
  );
  return allocated.map(row => ({ id: row.id, amount: safeAmount(row.amount) }));
}

/**
 * {@link allocateFractions} without the safe-integer bound: the total and
 * every allocated amount stay exact.
 */
export function allocateFractionsExact(
  rows: ReadonlyArray<{ id: string; numerator: bigint }>,
  denominator: bigint,
  totalNumerator?: bigint,
): Array<{ id: string; amount: bigint }> {
  if (new Set(rows.map(row => row.id)).size !== rows.length) {
    throw new Error('Amount group must have unique row IDs');
  }
  const scaled = rows.map(row => {
    // Floor division gives nonnegative discarded fractions for signed rows.
    const remainder =
      ((row.numerator % denominator) + denominator) % denominator;
    return {
      id: row.id,
      remainder,
      amount: (row.numerator - remainder) / denominator,
    };
  });
  const total = roundEven(
    totalNumerator ?? rows.reduce((sum, row) => sum + row.numerator, 0n),
    denominator,
  );
  const remaining = total - scaled.reduce((sum, row) => sum + row.amount, 0n);
  const ranked = [...scaled].sort((a, b) => {
    if (a.remainder !== b.remainder) {
      return (a.remainder > b.remainder ? -1 : 1) * (remaining < 0n ? -1 : 1);
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  if (ranked.length) {
    const count = BigInt(ranked.length);
    const each = remaining / count;
    const extra = remaining % count;
    const sign = extra < 0n ? -1n : 1n;
    for (const [index, row] of ranked.entries()) {
      row.amount += each + (BigInt(index) < extra * sign ? sign : 0n);
    }
  }
  return scaled.map(row => ({ id: row.id, amount: row.amount }));
}
