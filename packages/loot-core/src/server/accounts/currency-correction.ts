import { editEffects } from '#server/budget/edit-effects';
import * as db from '#server/db';
import { resolveRate } from '#server/exchange-rates/app';
import { batchMessages } from '#server/sync';
import {
  liveMappedCategory,
  preflightTransactionWrites,
} from '#server/transactions/foreign-guard';
import type { ForeignEdit } from '#server/transactions/foreign-guard';
import { clearUndo } from '#server/undo';
import {
  accountCurrencyFields,
  assertNoCurrencyDependents,
  getDefaultCurrencyCode,
  getRecordedAmountPrecision,
  isMulticurrencyAvailable,
} from '#server/util/currency';
import {
  isReviewedCurrency,
  reviewedAmountEncoding,
} from '#shared/amount-encoding';
import {
  allocateFractions,
  rescaleAmountGroup,
  roundEven,
} from '#shared/amount-rescale';
import {
  baseToNativeFraction,
  nativeToBaseFraction,
} from '#shared/exchange-rate';
import { foreignSplitBases } from '#shared/foreign-split';

export type CorrectionMode = 'convert' | 'keep';

type Encoding = { currency: string | null; precision: number };

type StoredRow = {
  id: string;
  date: number;
  amount: number;
  transaction_amount: number | null;
  isParent: number;
  isChild: number;
  parent_id: string | null;
  tombstone: number;
  reconciled: number;
  category: string | null;
};

type Amounts = { amount: number; transaction_amount: number | null };

export type CorrectionRow = {
  id: string;
  date: string;
  isParent: boolean;
  tombstone: boolean;
  before: Amounts;
  /** Null while the row needs a rate or explicit amount it lacks. */
  after: Amounts | null;
  rate: string | null;
  roundingLoss: boolean;
  /** A split child valued at its parent's date, which differs from its own. */
  dateDiffers?: true;
  error?: 'amount-out-of-range' | 'split-family-inconsistent';
};

type Rate = Awaited<ReturnType<typeof resolveRate>>;

type CorrectionInput = {
  account: string;
  currency: string | null;
  mode: CorrectionMode;
  amounts?: Record<string, number>;
};

const RANGE_ERRORS = new Set([
  'amount-out-of-range',
  'amount-invalid',
  'Rescaled amount exceeds the safe integer range',
  'Amount must be a safe integer',
]);

const sumBig = (values: number[]) =>
  toInteger(values.reduce((sum, value) => sum + BigInt(value), 0n));

const isExact = ({
  numerator,
  denominator,
}: {
  numerator: bigint;
  denominator: bigint;
}) => numerator % denominator === 0n;

function toInteger(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new Error('amount-out-of-range');
  return result;
}

/** Two 53-bit string hashes (cyrb53), enough to tell proposals apart. */
function digest(text: string): string {
  const hash = (seed: number) => {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0))
      .toString(16)
      .padStart(14, '0');
  };
  return hash(1) + hash(2);
}

/**
 * Computes an account's whole-history currency correction without writing:
 * every row's target amounts, missing rates, rounding losses, budget
 * effects and a fingerprint binding all of it.
 */
export async function previewCurrencyCorrection({
  account: accountId,
  currency,
  mode,
  amounts = {},
}: CorrectionInput) {
  if (mode !== 'convert' && mode !== 'keep') {
    throw new Error('correction-mode-invalid');
  }
  const budgetCurrency = await getDefaultCurrencyCode();
  const bp = getRecordedAmountPrecision();
  const account = await db.first<{
    id: string;
    currency: string | null;
    currency_precision: number | null;
  }>(
    'SELECT id, currency, currency_precision FROM accounts WHERE id = ? AND tombstone = 0',
    [accountId],
  );
  if (!account) throw new Error('account-not-found');

  const targetCurrency =
    currency === null || currency === budgetCurrency ? null : currency;
  if (targetCurrency !== null && !isReviewedCurrency(targetCurrency)) {
    throw new Error('account-currency-invalid');
  }
  const source: Encoding = account.currency
    ? { currency: account.currency, precision: account.currency_precision! }
    : { currency: null, precision: bp };
  const target: Encoding = targetCurrency
    ? {
        currency: targetCurrency,
        precision: reviewedAmountEncoding(targetCurrency).precision,
      }
    : { currency: null, precision: bp };
  if (source.currency === target.currency) {
    throw new Error('account-currency-unchanged');
  }
  if (
    (source.currency !== null || target.currency !== null) &&
    !(await isMulticurrencyAvailable())
  ) {
    throw new Error('multicurrency-unavailable');
  }
  await assertNoCurrencyDependents(accountId);

  const stored = await db.all<StoredRow>(
    `SELECT id, date, amount, transaction_amount, isParent, isChild,
       parent_id, tombstone, reconciled, category
       FROM transactions WHERE acct = ? ORDER BY id`,
    [accountId],
  );

  // Rates are only ever needed in the target currency.
  const rates = new Map<string, Rate>();
  const rateAt = async (date: string) => {
    if (target.currency === null) return null;
    if (!rates.has(date)) {
      rates.set(
        date,
        await resolveRate({
          baseCurrency: budgetCurrency,
          quoteCurrency: target.currency,
          date,
        }),
      );
    }
    const rate = rates.get(date)!;
    return rate.status === 'resolved' ? rate.rate : null;
  };

  const sourceNative = (row: StoredRow) =>
    source.currency === null ? row.amount : (row.transaction_amount ?? 0);
  const rescaleExact = (value: number) => ({
    numerator: BigInt(value) * 10n ** BigInt(target.precision),
    denominator: 10n ** BigInt(source.precision),
  });
  const results = new Map<string, CorrectionRow>();
  // Valuation dates without a rate or explicit value: a row's own date, or
  // its family's (the parent's) date.
  const missing = new Set<string>();
  const explicit = (id: string) => {
    const value = amounts[id];
    if (value === undefined) return undefined;
    if (!Number.isSafeInteger(value)) throw new Error('amount-out-of-range');
    return value;
  };
  const base = (row: StoredRow): CorrectionRow => ({
    id: row.id,
    date: db.fromDateRepr(row.date),
    isParent: !!row.isParent,
    tombstone: !!row.tombstone,
    before: { amount: row.amount, transaction_amount: row.transaction_amount },
    after: null,
    rate: null,
    roundingLoss: false,
  });

  async function single(row: StoredRow) {
    const result = base(row);
    const rate = await rateAt(result.date);
    result.rate = rate;
    if (mode === 'convert') {
      if (target.currency === null) {
        result.after = { amount: row.amount, transaction_amount: null };
      } else if (rate) {
        const exact = baseToNativeFraction(
          row.amount,
          bp,
          target.precision,
          rate,
        );
        result.after = {
          amount: row.amount,
          transaction_amount: toInteger(
            roundEven(exact.numerator, exact.denominator),
          ),
        };
        result.roundingLoss = !isExact(exact);
      } else if (amounts[row.id] !== undefined) {
        result.after = {
          amount: row.amount,
          transaction_amount: explicit(row.id)!,
        };
      }
    } else {
      const exact = rescaleExact(sourceNative(row));
      const magnitude = toInteger(
        roundEven(exact.numerator, exact.denominator),
      );
      result.roundingLoss = !isExact(exact);
      if (target.currency === null) {
        result.after = { amount: magnitude, transaction_amount: null };
      } else if (rate) {
        const baseExact = nativeToBaseFraction(
          magnitude,
          target.precision,
          bp,
          rate,
        );
        result.after = {
          amount: toInteger(
            roundEven(baseExact.numerator, baseExact.denominator),
          ),
          transaction_amount: magnitude,
        };
        result.roundingLoss ||= !isExact(baseExact);
      } else if (amounts[row.id] !== undefined) {
        result.after = {
          amount: explicit(row.id)!,
          transaction_amount: magnitude,
        };
      }
    }
    results.set(row.id, result);
    if (!result.after) missing.add(result.date);
  }

  async function family(parent: StoredRow, children: StoredRow[]) {
    // A parent without live children is a plain row.
    if (children.length === 0) return single(parent);
    const parentResult = base(parent);
    const childResults = children.map(child => {
      const result = base(child);
      if (result.date !== parentResult.date) result.dateDiffers = true;
      return result;
    });
    const members = [parentResult, ...childResults];
    const setAll = (fields: Partial<CorrectionRow>) => {
      for (const result of members) Object.assign(result, fields);
    };
    const record = () => {
      for (const result of members) results.set(result.id, result);
      if (!parentResult.after && !parentResult.error) {
        missing.add(parentResult.date);
      }
    };
    // Allocation needs a family whose children add up to its parent.
    const consistent =
      sumBig(children.map(c => c.amount)) === parent.amount &&
      (source.currency === null ||
        sumBig(children.map(c => c.transaction_amount ?? 0)) ===
          (parent.transaction_amount ?? 0));
    if (!consistent) {
      setAll({ error: 'split-family-inconsistent' });
      return record();
    }
    // One valuation for the whole family, at the parent's date.
    const rate = await rateAt(parentResult.date);
    setAll({ rate });
    const set = (
      parentAfter: Amounts,
      childAfter: (child: StoredRow, index: number) => Amounts,
    ) => {
      parentResult.after = parentAfter;
      childResults.forEach((result, i) => {
        result.after = childAfter(children[i], i);
      });
    };
    // A zero-total family is completed by a value for every child, adding
    // up to the parent's target (zero), never by the parent alone.
    const childValues = (parentTarget: number) => {
      if (!children.every(c => amounts[c.id] !== undefined)) return null;
      const values = children.map(c => explicit(c.id)!);
      if (
        sumBig(values) !== parentTarget ||
        (amounts[parent.id] !== undefined &&
          explicit(parent.id) !== parentTarget)
      ) {
        throw new Error('correction-amounts-mismatch');
      }
      return values;
    };

    if (mode === 'convert') {
      if (target.currency === null) {
        set({ amount: parent.amount, transaction_amount: null }, c => ({
          amount: c.amount,
          transaction_amount: null,
        }));
      } else if (rate) {
        // The parent converts on its own; children share its total.
        const parentExact = baseToNativeFraction(
          parent.amount,
          bp,
          target.precision,
          rate,
        );
        const exact = children.map(c =>
          baseToNativeFraction(c.amount, bp, target.precision, rate),
        );
        const natives = allocateFractions(
          children.map((c, i) => ({ id: c.id, numerator: exact[i].numerator })),
          parentExact.denominator,
          parentExact.numerator,
        );
        set(
          {
            amount: parent.amount,
            transaction_amount: toInteger(
              roundEven(parentExact.numerator, parentExact.denominator),
            ),
          },
          (c, i) => ({
            amount: c.amount,
            transaction_amount: natives[i].amount,
          }),
        );
        parentResult.roundingLoss = !isExact(parentExact);
        childResults.forEach((result, i) => {
          result.roundingLoss = !isExact(exact[i]);
        });
      } else if (parent.amount !== 0 && amounts[parent.id] !== undefined) {
        // An explicit parent native, shared in proportion to the bases.
        const parentNative = explicit(parent.id)!;
        const sign = parent.amount < 0 ? -1n : 1n;
        const denominator = BigInt(Math.abs(parent.amount));
        const numerators = children.map(
          c => BigInt(parentNative) * BigInt(c.amount) * sign,
        );
        const natives = allocateFractions(
          children.map((c, i) => ({ id: c.id, numerator: numerators[i] })),
          denominator,
          BigInt(parentNative) * denominator,
        );
        set(
          { amount: parent.amount, transaction_amount: parentNative },
          (c, i) => ({
            amount: c.amount,
            transaction_amount: natives[i].amount,
          }),
        );
        childResults.forEach((result, i) => {
          result.roundingLoss = numerators[i] % denominator !== 0n;
        });
      } else if (parent.amount === 0) {
        const values = childValues(0);
        if (values) {
          set({ amount: 0, transaction_amount: 0 }, (c, i) => ({
            amount: c.amount,
            transaction_amount: values[i],
          }));
        }
      }
    } else {
      const parentExact = rescaleExact(sourceNative(parent));
      const parentMagnitude = toInteger(
        roundEven(parentExact.numerator, parentExact.denominator),
      );
      const magnitudes = rescaleAmountGroup(
        children.map(c => ({ id: c.id, amount: sourceNative(c) })),
        source.precision,
        target.precision,
        sourceNative(parent),
      ).map(m => m.amount);
      parentResult.roundingLoss = !isExact(parentExact);
      childResults.forEach((result, i) => {
        result.roundingLoss = !isExact(rescaleExact(sourceNative(children[i])));
      });
      const natives = children.map((c, i) => ({
        id: c.id,
        native: magnitudes[i],
      }));
      const withBases = (parentBase: number, bases: number[]) =>
        set(
          {
            amount: parentBase,
            transaction_amount:
              target.currency === null ? null : parentMagnitude,
          },
          (c, i) => ({
            amount: bases[i],
            transaction_amount: target.currency === null ? null : magnitudes[i],
          }),
        );
      // Each child's share of a nonzero parent base, exactly.
      const markShares = (parentBase: number) =>
        childResults.forEach((result, i) => {
          result.roundingLoss ||=
            (BigInt(parentBase) * BigInt(magnitudes[i])) %
              BigInt(parentMagnitude) !==
            0n;
        });
      if (target.currency === null) {
        withBases(parentMagnitude, magnitudes);
      } else if (rate && parentMagnitude !== 0) {
        const parentBaseExact = nativeToBaseFraction(
          parentMagnitude,
          target.precision,
          bp,
          rate,
        );
        const parentBase = toInteger(
          roundEven(parentBaseExact.numerator, parentBaseExact.denominator),
        );
        parentResult.roundingLoss ||= !isExact(parentBaseExact);
        withBases(
          parentBase,
          foreignSplitBases(parentBase, natives).map(b => b.amount),
        );
        markShares(parentBase);
      } else if (rate) {
        withBases(
          0,
          foreignSplitBases(0, natives, {
            rate,
            nativePrecision: target.precision,
            basePrecision: bp,
          }).map(b => b.amount),
        );
        childResults.forEach((result, i) => {
          result.roundingLoss ||= !isExact(
            nativeToBaseFraction(magnitudes[i], target.precision, bp, rate),
          );
        });
      } else if (parentMagnitude !== 0 && amounts[parent.id] !== undefined) {
        const parentBase = explicit(parent.id)!;
        withBases(
          parentBase,
          foreignSplitBases(parentBase, natives).map(b => b.amount),
        );
        markShares(parentBase);
      } else if (parentMagnitude === 0) {
        const values = childValues(0);
        if (values) withBases(0, values);
      }
    }
    record();
  }

  const liveParents = new Set(
    stored.filter(r => r.isParent && !r.tombstone).map(r => r.id),
  );
  const childrenOf = new Map<string, StoredRow[]>();
  for (const row of stored) {
    if (
      row.isChild &&
      !row.tombstone &&
      row.parent_id &&
      liveParents.has(row.parent_id)
    ) {
      const list = childrenOf.get(row.parent_id) ?? [];
      list.push(row);
      childrenOf.set(row.parent_id, list);
    }
  }
  const inLiveFamily = (row: StoredRow) =>
    liveParents.has(row.id) ||
    (!!row.isChild &&
      !row.tombstone &&
      !!row.parent_id &&
      liveParents.has(row.parent_id));

  for (const row of stored) {
    try {
      if (liveParents.has(row.id)) {
        await family(row, childrenOf.get(row.id) ?? []);
      } else if (!inLiveFamily(row)) {
        await single(row);
      }
    } catch (error) {
      // The shared allocators report range failures in their own words.
      if (!(error instanceof Error) || !RANGE_ERRORS.has(error.message)) {
        throw error;
      }
      const members = liveParents.has(row.id)
        ? [row, ...(childrenOf.get(row.id) ?? [])]
        : [row];
      for (const member of members) {
        results.set(member.id, {
          ...base(member),
          error: 'amount-out-of-range',
        });
      }
    }
  }

  const rows = stored.map(row => results.get(row.id)!);
  // Only unresolved rows and families without errors were added.
  const missingRates = [...missing].sort();

  // Bases change only in Keep mode; deleted rows and orphans post nothing.
  const effects =
    mode === 'keep'
      ? await editEffects({
          rows: stored
            .filter(
              row => !row.tombstone && (!row.isChild || inLiveFamily(row)),
            )
            .map(row => ({ row, result: results.get(row.id)! }))
            .filter(
              ({ result }) =>
                result.after && result.after.amount !== result.before.amount,
            )
            .map(({ row, result }) => {
              const side = (amount: number) => ({
                account: accountId,
                category: row.category,
                date: result.date,
                amount,
                isParent: !!row.isParent,
                transferAccount: null,
              });
              return {
                before: side(result.before.amount),
                after: side(result.after!.amount),
              };
            }),
        })
      : [];

  const changes = (r: CorrectionRow) =>
    !!r.after &&
    (r.after.amount !== r.before.amount ||
      r.after.transaction_amount !== r.before.transaction_amount);
  const reconciled = stored.filter(
    row => row.reconciled && changes(results.get(row.id)!),
  ).length;

  const mapped = await Promise.all(
    stored.map(row => liveMappedCategory(row.category)),
  );
  const fingerprint = digest(
    JSON.stringify({
      account: accountId,
      mode,
      target,
      source,
      budget: { currency: budgetCurrency, precision: bp },
      rows: stored.map((row, i) => [
        row.id,
        row.amount,
        row.transaction_amount,
        row.date,
        row.tombstone,
        row.isParent,
        row.isChild,
        row.parent_id,
        row.reconciled,
        mapped[i],
      ]),
      rates: [...rates.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, rate]) =>
          rate.status === 'resolved'
            ? [date, rate.rate, rate.kind, rate.source, rate.timestamp]
            : [date, null],
        ),
      amounts: Object.entries(amounts).sort(([a], [b]) => a.localeCompare(b)),
      effects,
    }),
  );

  return {
    rows,
    missingRates,
    effects,
    reconciled,
    fingerprint,
    target,
    changed: rows.filter(changes).length,
  };
}

/**
 * Applies a previewed correction atomically: the account's encoding and
 * every row's amounts in one batch, or nothing when the preview is stale,
 * incomplete or out of range. Clears undo history, whose entries hold
 * integers in the old encoding.
 */
export async function correctAccountCurrency({
  fingerprint,
  ...input
}: CorrectionInput & { fingerprint: string }) {
  let proposal;
  try {
    proposal = await previewCurrencyCorrection(input);
  } catch (error) {
    // The account already has the target encoding: the preview predates
    // another correction (or this one, applied twice).
    if (
      error instanceof Error &&
      error.message === 'account-currency-unchanged'
    ) {
      return { status: 'stale' as const };
    }
    throw error;
  }
  if (proposal.fingerprint !== fingerprint) return { status: 'stale' as const };
  const failed = proposal.rows.find(r => r.error);
  if (failed) throw new Error(failed.error);
  if (proposal.missingRates.length > 0) {
    return { status: 'rates-missing' as const, dates: proposal.missingRates };
  }
  const changed = proposal.rows.filter(
    r =>
      r.after!.amount !== r.before.amount ||
      r.after!.transaction_amount !== r.before.transaction_amount,
  );
  const foreignEdits = new Map<string, ForeignEdit>(
    changed.map(r => [
      r.id,
      {
        action: 'update',
        expected: {
          account: input.account,
          amount: r.before.amount,
          transaction_amount: r.before.transaction_amount,
          date: r.date,
        },
        final: {
          account: input.account,
          amount: r.after!.amount,
          transaction_amount: r.after!.transaction_amount,
        },
      },
    ]),
  );
  const updates = changed.map(r => ({
    id: r.id,
    amount: r.after!.amount,
    transaction_amount: r.after!.transaction_amount,
  }));

  await batchMessages(async () => {
    // The account's new encoding is queued first, so the guard validates
    // every row write against it.
    await db.update('accounts', {
      id: input.account,
      ...(await accountCurrencyFields(proposal.target.currency)),
      balance_current: null,
      balance_available: null,
      balance_limit: null,
    });
    await preflightTransactionWrites({ updated: updates }, { foreignEdits });
    for (const update of updates) {
      await db.updateTransaction(update, { foreignEdits });
    }
  });
  clearUndo();
  return { status: 'ok' as const, changed: changed.length };
}
