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

function roundEven(numerator: bigint, denominator: bigint): bigint {
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

/** Allocate a rounded parent total across its children without changing order. */
export function rescaleAmountGroup(
  rows: ReadonlyArray<{ id: string; amount: number }>,
  sourcePrecision: number,
  targetPrecision: number,
  parentAmount?: number,
): Array<{ id: string; amount: number }> {
  const sourceScale = scaleForPrecision(sourcePrecision);
  const targetScale = scaleForPrecision(targetPrecision);
  if (new Set(rows.map(row => row.id)).size !== rows.length) {
    throw new Error('Amount group must have unique row IDs');
  }
  const scaled = rows.map(row => {
    const numerator = integerAmount(row.amount) * targetScale;
    // Floor division gives nonnegative discarded fractions for signed rows.
    const remainder = ((numerator % sourceScale) + sourceScale) % sourceScale;
    return {
      id: row.id,
      numerator,
      remainder,
      amount: (numerator - remainder) / sourceScale,
    };
  });
  const total = roundEven(
    parentAmount === undefined
      ? scaled.reduce((sum, row) => sum + row.numerator, 0n)
      : integerAmount(parentAmount) * targetScale,
    sourceScale,
  );
  safeAmount(total);
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
  return scaled.map(row => ({ id: row.id, amount: safeAmount(row.amount) }));
}
