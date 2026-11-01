import { editEffects } from '#server/budget/edit-effects';
import * as db from '#server/db';
import { resolveRate } from '#server/exchange-rates/app';
import { batchMessages } from '#server/sync';
import {
  balanceSpec,
  effectiveEncoding,
  pairEncoding,
} from '#server/sync/coupled-cells';
import {
  liveMappedCategory,
  preflightTransactionWrites,
} from '#server/transactions/foreign-guard';
import type { ForeignEdit } from '#server/transactions/foreign-guard';
import {
  updateRule,
  validateScheduleRule,
} from '#server/transactions/transaction-rules';
import { clearUndo } from '#server/undo';
import {
  accountCurrencyFields,
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
import { exchangeLegs, feeBase } from '#shared/exchange-transfer';
import { foreignSplitBases } from '#shared/foreign-split';
import { getScheduledAmount } from '#shared/schedules';

import {
  correctionPreflight,
  incompatibleLinks,
  loadTransferLegs,
} from './currency-correction-dependents';
import type {
  ExternalRow,
  ScheduleOfAccount,
} from './currency-correction-dependents';

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
  transferred_id: string | null;
  schedule: string | null;
  amount_pair: string | null;
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
  /** A same-encoding leg given its counterpart's shared amount. */
  matchedToCounterpart?: true;
  /** The transfer counterpart of a leg, as it is and as it will be. */
  counterpart?: {
    account: string;
    id: string;
    before: Amounts;
    /** After every transfer and fee adjustment; null while unresolved. */
    after: Amounts | null;
  };
  /** A link to a schedule in another encoding, cleared by the correction. */
  scheduleUnlinked?: true;
  /** A row in another account the correction edits (counterpart or link). */
  external?: true;
  account?: string;
};

export type ScheduleCorrection = {
  id: string;
  rule: string;
  date: string;
  before: { conditions: unknown[]; actions: unknown[] };
  /** Null while the schedule needs a rate or explicit amount it lacks. */
  after: { conditions: unknown[]; actions: unknown[] } | null;
  roundingLoss: boolean;
};

type Rate = Awaited<ReturnType<typeof resolveRate>>;

type ScheduleAmount = number | { num1: number; num2: number };

type CorrectionInput = {
  account: string;
  currency: string | null;
  mode: CorrectionMode;
  amounts?: Record<string, number>;
  scheduleAmounts?: Record<string, ScheduleAmount>;
  /**
   * Repair the account's stale rows (MC-7.3): each converts from its own
   * stamp to the account's current encoding, `currency` being ignored.
   */
  repair?: boolean;
};

/** A pair stamp as an encoding, budget precision for the budget currency. */
function stampEncoding(stamp: string, bp: number): Encoding {
  if (stamp === '') return { currency: null, precision: bp };
  const [currency, precision] = stamp.split('.');
  return { currency, precision: Number(precision) };
}

/** `validateScheduleRule` refusals a correction reports as a dependency. */
const SCHEDULE_RULE_ERRORS = new Set([
  'schedule-account-encoding-change',
  'schedule-currency-mismatch',
  'schedule-amount-invalid',
  'multicurrency-transfer-unavailable',
  'foreign-split-unavailable',
  'rule-account-incompatible',
]);

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
  scheduleAmounts = {},
  repair = false,
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
    encoding: string | null;
  }>(
    'SELECT id, currency, currency_precision, encoding FROM accounts WHERE id = ? AND tombstone = 0',
    [accountId],
  );
  if (!account) throw new Error('account-not-found');

  const requested = repair ? account.currency : currency;
  const targetCurrency =
    requested === null || requested === budgetCurrency ? null : requested;
  if (targetCurrency !== null && !isReviewedCurrency(targetCurrency)) {
    throw new Error('account-currency-invalid');
  }
  const current: Encoding = account.currency
    ? { currency: account.currency, precision: account.currency_precision! }
    : { currency: null, precision: bp };
  // A repair converts each stale row from its own stamp.
  let source = current;
  const target: Encoding = targetCurrency
    ? {
        currency: targetCurrency,
        precision: reviewedAmountEncoding(targetCurrency).precision,
      }
    : { currency: null, precision: bp };
  if (!repair && source.currency === target.currency) {
    throw new Error('account-currency-unchanged');
  }
  if (
    (source.currency !== null || target.currency !== null) &&
    !(await isMulticurrencyAvailable())
  ) {
    throw new Error('multicurrency-unavailable');
  }
  const stored = await db.all<StoredRow>(
    `SELECT id, date, amount, transaction_amount, isParent, isChild,
       parent_id, tombstone, reconciled, category, transferred_id, schedule,
       amount_pair
       FROM transactions WHERE acct = ? ORDER BY id`,
    [accountId],
  );
  // Rows written under an encoding the account no longer has (MC-7.3).
  const currentStamp = effectiveEncoding(
    account.encoding,
    account.currency,
    account.currency_precision,
  );
  const stampOf = (row: StoredRow) => pairEncoding(row.amount_pair);
  const isStale = (row: StoredRow) => {
    const stamp = stampOf(row);
    return stamp !== undefined && stamp !== currentStamp;
  };
  if (!repair && stored.some(isStale)) {
    throw new Error('correction-stale-rows-pending');
  }
  const { schedules: schedulesOfAccount, checkedRules } = repair
    ? { schedules: [], checkedRules: [] }
    : await correctionPreflight(accountId);
  const legs = repair ? [] : await loadTransferLegs(accountId, target, stored);

  // Rows only ever need the target currency's rate; schedules in Convert
  // also value their source amount.
  const rates = new Map<string, Rate>();
  const rateFor = async (quote: string | null, date: string) => {
    if (quote === null) return null;
    const key = `${quote}|${date}`;
    if (!rates.has(key)) {
      rates.set(
        key,
        await resolveRate({
          baseCurrency: budgetCurrency,
          quoteCurrency: quote,
          date,
        }),
      );
    }
    const rate = rates.get(key)!;
    return rate.status === 'resolved' ? rate.rate : null;
  };
  const rateAt = (date: string) => rateFor(target.currency, date);

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
  // Which quote each missing date lacks, for the dialog's rate forms.
  const missingQuotes = new Set<string>();
  const missingRow = (date: string) => {
    missing.add(date);
    if (target.currency !== null) {
      missingQuotes.add(`${date}|${target.currency}`);
    }
  };
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

  // Convert gives a leg that becomes same-encoding its counterpart's
  // amount, so its native needs no rate.
  const matchedNative = new Map(
    mode === 'convert'
      ? legs
          .filter(leg => leg.relationship === 'same')
          .map(leg => [leg.id, -(leg.counterpart.transaction_amount ?? 0)])
      : [],
  );

  /** A row valued on its own, at its date or its family's (`valuedOn`). */
  async function single(row: StoredRow, valuedOn?: string) {
    const result = base(row);
    const valuationDate = valuedOn ?? result.date;
    const rate = await rateAt(valuationDate);
    result.rate = rate;
    const matched = matchedNative.get(row.id);
    if (matched !== undefined && target.currency !== null) {
      result.after = { amount: row.amount, transaction_amount: matched };
      result.matchedToCounterpart = true;
      // With a rate, the loss is the difference from the converted native;
      // one too large to store is lost entirely.
      if (rate) {
        try {
          const exact = baseToNativeFraction(
            row.amount,
            bp,
            target.precision,
            rate,
          );
          result.roundingLoss =
            !isExact(exact) ||
            toInteger(roundEven(exact.numerator, exact.denominator)) !==
              matched;
        } catch (error) {
          if (!(error instanceof Error) || !RANGE_ERRORS.has(error.message)) {
            throw error;
          }
          result.roundingLoss = true;
        }
      }
    } else if (mode === 'convert') {
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
    if (!result.after) missingRow(valuationDate);
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
        missingRow(parentResult.date);
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

  // A repair converts stale rows only; transfer legs and families holding a
  // transfer are listed for the user to delete instead.
  const unsupported = new Set<string>();
  const mixedParents: StoredRow[] = [];
  const unchanged = (row: StoredRow) =>
    results.set(row.id, {
      ...base(row),
      after: { amount: row.amount, transaction_amount: row.transaction_amount },
    });
  for (const row of stored) {
    try {
      if (repair) {
        const members = liveParents.has(row.id)
          ? [row, ...(childrenOf.get(row.id) ?? [])]
          : [row];
        if (inLiveFamily(row) && !liveParents.has(row.id)) {
          // Children are handled with their parent.
          continue;
        }
        const staleMembers = members.filter(isStale);
        if (staleMembers.length === 0) {
          members.forEach(unchanged);
          continue;
        }
        if (members.some(m => m.transferred_id)) {
          for (const member of members) {
            if (isStale(member)) unsupported.add(member.id);
            unchanged(member);
          }
          continue;
        }
        const stamps = new Set(staleMembers.map(m => stampOf(m)));
        if (
          liveParents.has(row.id) &&
          !(staleMembers.length === members.length && stamps.size === 1)
        ) {
          // A mixed family: stale children convert alone, valued at the
          // family's (the parent's) date; the parent becomes the sum of its
          // children below.
          for (const child of childrenOf.get(row.id) ?? []) {
            if (isStale(child)) {
              source = stampEncoding(stampOf(child)!, bp);
              await single(child, db.fromDateRepr(row.date));
            } else {
              unchanged(child);
            }
          }
          unchanged(row);
          mixedParents.push(row);
          continue;
        }
        source = stampEncoding(stampOf(row)!, bp);
        if (liveParents.has(row.id)) {
          await family(row, childrenOf.get(row.id) ?? []);
        } else {
          await single(row);
        }
        continue;
      }
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

  // A mixed family's parent is the sum of its children in the target
  // encoding; a budget-currency parent holds no native.
  for (const parent of mixedParents) {
    const children = (childrenOf.get(parent.id) ?? []).map(c =>
      results.get(c.id)!,
    );
    const result = results.get(parent.id)!;
    if (children.some(c => !c.after || c.error)) {
      result.after = null;
      continue;
    }
    result.after = {
      amount: sumBig(children.map(c => c.after!.amount)),
      transaction_amount:
        target.currency === null
          ? null
          : sumBig(children.map(c => c.after!.transaction_amount ?? 0)),
    };
  }
  // Every repaired row, and every row of a corrected account (deleted ones
  // too), is rewritten so it takes the current stamp even when its integers
  // do not change; otherwise it would be left stale.
  const restamp = repair
    ? stored
        .filter(row => isStale(row) && !unsupported.has(row.id))
        .map(row => row.id)
        .concat(mixedParents.map(p => p.id))
    : stored.map(row => row.id).filter(id => results.has(id));

  // Transfer legs: Convert keeps bases (a same-encoding leg takes its
  // counterpart's amount); Keep edits each counterpart to stay equal and
  // opposite.
  const external = new Map<
    string,
    { row: ExternalRow; result: CorrectionRow }
  >();
  const externalResult = (row: ExternalRow): CorrectionRow => {
    const existing = external.get(row.id);
    if (existing) return existing.result;
    const result: CorrectionRow = {
      id: row.id,
      date: db.fromDateRepr(row.date),
      isParent: !!row.isParent,
      tombstone: !!row.tombstone,
      before: {
        amount: row.amount,
        transaction_amount: row.transaction_amount,
      },
      after: { amount: row.amount, transaction_amount: row.transaction_amount },
      rate: null,
      roundingLoss: false,
      external: true,
      account: row.acct,
    };
    external.set(row.id, { row, result });
    return result;
  };
  const resum = (parent: CorrectionRow, children: CorrectionRow[]) => {
    if (!parent.after || children.some(c => !c.after)) return;
    parent.after = {
      amount: sumBig(children.map(c => c.after!.amount)),
      transaction_amount:
        parent.after.transaction_amount === null
          ? null
          : sumBig(children.map(c => c.after!.transaction_amount ?? 0)),
    };
  };
  for (const leg of legs) {
    const result = results.get(leg.id)!;
    if (!result.after || result.error) continue;
    const cp = leg.counterpart;
    if (mode === 'convert') {
      if (leg.relationship === 'same') {
        const matched = -(cp.transaction_amount ?? 0);
        result.roundingLoss ||= result.after.transaction_amount !== matched;
        result.after = { ...result.after, transaction_amount: matched };
        result.matchedToCounterpart = true;
      }
    } else {
      const cpResult = externalResult(cp);
      cpResult.after = {
        amount: -result.after.amount,
        transaction_amount:
          leg.relationship === 'exchange'
            ? cp.transaction_amount
            : leg.relationship === 'same'
              ? -(result.after.transaction_amount ?? 0)
              : null,
      };
      if (leg.counterpartFamily) {
        const { parent, children } = leg.counterpartFamily;
        resum(
          externalResult(parent),
          children.map(child => externalResult(child)),
        );
      }
    }
    // A leg inside a family in A: its parent holds the children's sums.
    const own = stored.find(r => r.id === leg.id)!;
    if (own.isChild && own.parent_id && liveParents.has(own.parent_id)) {
      resum(
        results.get(own.parent_id)!,
        (childrenOf.get(own.parent_id) ?? []).map(c => results.get(c.id)!),
      );
    }
  }

  // A transfer that is an exchange after correction must be a complete MC-4
  // exchange, its fee bases valued by MC-4.1's rule at the transfer's value.
  type SideRow = { after: Amounts | null };
  type Side = {
    leg: SideRow;
    parent: SideRow | null;
    fee: SideRow | null;
    precision: number;
    /** Whether its rows may be revalued (Convert keeps counterparts). */
    editable: boolean;
  };
  const nativeOf = (a: Amounts) => a.transaction_amount ?? a.amount;
  const counterpartRow = (row: ExternalRow): SideRow =>
    mode === 'keep'
      ? externalResult(row)
      : {
          after: external.get(row.id)?.result.after ?? {
            amount: row.amount,
            transaction_amount: row.transaction_amount,
          },
        };
  for (const leg of legs) {
    if (leg.relationship !== 'exchange') continue;
    const legResult = results.get(leg.id)!;
    // Rows still waiting for a rate or value are validated once supplied.
    if (!legResult.after || legResult.error) continue;
    const own = stored.find(r => r.id === leg.id)!;
    const ownParent =
      own.isChild && own.parent_id && liveParents.has(own.parent_id)
        ? own.parent_id
        : null;
    const ownFee = ownParent
      ? (childrenOf.get(ownParent) ?? []).find(c => c.id !== own.id)
      : undefined;
    const cpFamily = leg.counterpartFamily;
    const cpFee = cpFamily?.children.find(c => c.id !== leg.counterpart.id);
    const sides: Side[] = [
      {
        leg: legResult,
        parent: ownParent ? results.get(ownParent)! : null,
        fee: ownFee ? results.get(ownFee.id)! : null,
        precision: target.precision,
        editable: true,
      },
      {
        leg: counterpartRow(leg.counterpart),
        parent: cpFamily ? counterpartRow(cpFamily.parent) : null,
        fee: cpFee ? counterpartRow(cpFee) : null,
        precision: leg.counterpartEncoding.precision ?? bp,
        editable: mode === 'keep',
      },
    ];
    if (sides.some(s => [s.leg, s.parent, s.fee].some(r => r && !r.after))) {
      continue;
    }
    for (const side of sides) {
      if (!side.fee || !side.parent || !side.editable) continue;
      const legAfter = side.leg.after!;
      const feeAfter = side.fee.after!;
      const value = Math.abs(legAfter.amount);
      const legNative = Math.abs(nativeOf(legAfter));
      const feeNative = nativeOf(feeAfter);
      if (legNative === 0) continue;
      // A fee keeps its direction even when a converted native rounds to
      // zero: Convert reads it from the kept base, Keep from the native.
      const sign =
        (mode === 'convert'
          ? feeAfter.amount || feeNative
          : feeNative || feeAfter.amount) < 0
          ? -1
          : 1;
      if (mode === 'keep') {
        // The fee's base follows the transfer's (MC-4.1).
        const feeAmount = sign * feeBase(Math.abs(feeNative), value, legNative);
        side.fee.after = { ...feeAfter, amount: feeAmount };
        side.parent.after = {
          ...side.parent.after!,
          amount: legAfter.amount + feeAmount,
        };
      } else if (feeAfter.transaction_amount !== null) {
        // Convert keeps bases: take the fee native nearest the converted one
        // whose valuation reproduces the stored fee base.
        const storedFee = Math.abs(feeAfter.amount);
        const start = Math.abs(feeNative);
        // A destination fee must leave a positive net credit.
        const candidate = nearestFeeNative(
          storedFee,
          value,
          legNative,
          start,
          nativeOf(legAfter) > 0 ? legNative - 1 : undefined,
        );
        if (candidate === undefined) {
          throw new Error('correction-exchange-invalid');
        }
        if (candidate !== start) {
          (side.fee as CorrectionRow).roundingLoss = true;
          side.fee.after = {
            ...feeAfter,
            transaction_amount: sign * candidate,
          };
          side.parent.after = {
            ...side.parent.after!,
            transaction_amount:
              (legAfter.transaction_amount ?? 0) + sign * candidate,
          };
        }
      }
    }
    // A transfer that posts nothing (zero natives and bases, no fees).
    if (
      sides.every(
        s =>
          nativeOf(s.leg.after!) === 0 && s.leg.after!.amount === 0 && !s.fee,
      )
    ) {
      continue;
    }
    const [src, dst] =
      nativeOf(sides[0].leg.after!) < 0 ? sides : [sides[1], sides[0]];
    const top = (s: Side) => (s.parent ?? s.leg).after!;
    const feeOf = (s: Side) => (s.fee ? -nativeOf(s.fee.after!) : 0);
    let valid = false;
    try {
      const exchange = exchangeLegs({
        sourceAmount: -nativeOf(top(src)),
        destinationAmount: nativeOf(top(dst)),
        sourceFee: feeOf(src),
        destinationFee: feeOf(dst),
        sourcePrecision: src.precision,
        destinationPrecision: dst.precision,
      });
      valid =
        exchange.principal === -nativeOf(src.leg.after!) &&
        exchange.gross === nativeOf(dst.leg.after!) &&
        // One nonnegative value V: the source leg -V, the destination +V.
        src.leg.after!.amount <= 0 &&
        src.leg.after!.amount === -dst.leg.after!.amount &&
        sides.every(
          s =>
            !s.fee ||
            Math.abs(s.fee.after!.amount) ===
              feeBase(
                Math.abs(nativeOf(s.fee.after!)),
                Math.abs(s.leg.after!.amount),
                Math.abs(nativeOf(s.leg.after!)),
              ),
        );
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith('exchange-')) {
        throw error;
      }
    }
    if (!valid) throw new Error('correction-exchange-invalid');
  }

  // Each leg names its counterpart's amounts as finally proposed.
  for (const leg of legs) {
    const cp = leg.counterpart;
    const before = {
      amount: cp.amount,
      transaction_amount: cp.transaction_amount,
    };
    const result = results.get(leg.id)!;
    result.counterpart = {
      account: cp.acct,
      id: cp.id,
      before,
      after:
        !result.after || result.error
          ? null
          : (external.get(cp.id)?.result.after ?? before),
    };
  }

  // Schedule links that the target encoding makes incompatible.
  const scheduleIds = new Set(schedulesOfAccount.map(s => s.id));
  const unlinked = repair
    ? []
    : await incompatibleLinks(accountId, target, scheduleIds);
  for (const row of unlinked) {
    const result =
      row.acct === accountId ? results.get(row.id)! : externalResult(row);
    result.scheduleUnlinked = true;
  }

  // Schedules of A carry their amount in A's encoding.
  const schedules: ScheduleCorrection[] = [];
  for (const schedule of schedulesOfAccount) {
    try {
      schedules.push(await correctSchedule(schedule));
    } catch (error) {
      if (error instanceof Error && RANGE_ERRORS.has(error.message)) {
        throw new Error('amount-out-of-range');
      }
      throw error;
    }
  }

  // Every schedule rule posting from or to A must still be valid with A in
  // the target encoding: a transfer becoming an exchange keeps only the
  // shapes exchange schedules support (MC-4.3).
  const ruleCheck = {
    currencyCorrection: {
      unlinked: new Set(unlinked.map(r => r.id)),
      account: accountId,
      encoding: target,
    },
  };
  for (const rule of [
    ...schedules.map(s => ({
      id: s.rule,
      conditions: (s.after ?? s.before).conditions,
      actions: (s.after ?? s.before).actions,
    })),
    ...checkedRules,
  ]) {
    try {
      await validateScheduleRule(
        rule as Parameters<typeof validateScheduleRule>[0],
        ruleCheck,
      );
    } catch (error) {
      if (error instanceof Error && SCHEDULE_RULE_ERRORS.has(error.message)) {
        throw new Error('account-currency-has-schedules');
      }
      throw error;
    }
  }

  async function correctSchedule(
    schedule: ScheduleOfAccount,
  ): Promise<ScheduleCorrection> {
    const before = {
      conditions: schedule.conditions,
      actions: schedule.actions,
    };
    for (const action of schedule.actions) {
      if (
        action.op === 'set-split-amount' &&
        action.options?.method === 'fixed-amount'
      ) {
        throw new Error('correction-schedule-action-unsupported');
      }
    }
    const index = schedule.conditions.findIndex(
      c =>
        c.field === 'amount' &&
        (c.op === 'is' || c.op === 'isapprox' || c.op === 'isbetween'),
    );
    // Only that one amount condition is re-encoded; any other amount
    // predicate would keep comparing in the old encoding.
    if (
      schedule.conditions.some((c, i) => c.field === 'amount' && i !== index)
    ) {
      throw new Error('account-currency-has-schedules');
    }
    const result: ScheduleCorrection = {
      id: schedule.id,
      rule: schedule.rule,
      date: schedule.date,
      before,
      after: before,
      roundingLoss: false,
    };
    if (index < 0) return result;
    const condition = schedule.conditions[index];
    const value = condition.value as ScheduleAmount;
    const convert = async (amount: number): Promise<number | null> => {
      if (mode === 'keep') {
        const exact = rescaleExact(amount);
        result.roundingLoss ||= !isExact(exact);
        return toInteger(roundEven(exact.numerator, exact.denominator));
      }
      let baseValue = { numerator: BigInt(amount), denominator: 1n };
      if (source.currency !== null) {
        const sourceRate = await rateFor(source.currency, schedule.date);
        if (!sourceRate) return null;
        baseValue = nativeToBaseFraction(
          amount,
          source.precision,
          bp,
          sourceRate,
        );
      }
      if (target.currency === null) {
        result.roundingLoss ||= !isExact(baseValue);
        return toInteger(roundEven(baseValue.numerator, baseValue.denominator));
      }
      const targetRate = await rateAt(schedule.date);
      if (!targetRate) return null;
      // Target native = base × rate, from the exact base value.
      const unit = baseToNativeFraction(1, bp, target.precision, targetRate);
      const numerator = baseValue.numerator * unit.numerator;
      const denominator = baseValue.denominator * unit.denominator;
      result.roundingLoss ||= numerator % denominator !== 0n;
      return toInteger(roundEven(numerator, denominator));
    };
    let next: ScheduleAmount | null;
    if (typeof value === 'object' && value !== null) {
      const num1 = await convert(value.num1);
      const num2 = await convert(value.num2);
      next = num1 === null || num2 === null ? null : { num1, num2 };
    } else {
      next = await convert(value as number);
    }
    if (next === null) {
      const given = scheduleAmounts[schedule.id];
      if (given === undefined) {
        result.after = null;
        missing.add(schedule.date);
        // Both quotes are checked, so every failing one is listed.
        if (
          mode === 'convert' &&
          source.currency !== null &&
          !(await rateFor(source.currency, schedule.date))
        ) {
          missingQuotes.add(`${schedule.date}|${source.currency}`);
        }
        if (target.currency !== null && !(await rateAt(schedule.date))) {
          missingQuotes.add(`${schedule.date}|${target.currency}`);
        }
        return result;
      }
      next = given;
    }
    const conditions = schedule.conditions.map((c, i) =>
      i === index ? { ...c, value: next } : c,
    );
    const scheduled = getScheduledAmount(next);
    const actions = schedule.actions.map(action =>
      action.op === 'set' &&
      action.field === 'amount' &&
      !action.options?.template &&
      !action.options?.formula
        ? { ...action, value: scheduled }
        : action,
    );
    result.after = { conditions, actions };
    return result;
  }

  const rows = [
    ...stored.map(row => results.get(row.id)!),
    ...[...external.values()].map(e => e.result),
  ];
  // Only unresolved rows, families and schedules without errors were added.
  const missingRates = [...missing].sort();
  const missingRateQuotes = [...missingQuotes].sort().map(key => {
    const [date, currency] = key.split('|');
    return { date, currency };
  });

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
                transferAccount: result.counterpart?.account ?? null,
              });
              return {
                before: side(result.before.amount),
                after: side(result.after!.amount),
              };
            })
            .concat(
              [...external.values()]
                .filter(
                  ({ result }) => result.after!.amount !== result.before.amount,
                )
                .map(({ row, result }) => {
                  const side = (amount: number) => ({
                    account: row.acct,
                    category: row.category,
                    date: result.date,
                    amount,
                    isParent: !!row.isParent,
                    transferAccount: row.transferred_id ? accountId : null,
                  });
                  return {
                    before: side(result.before.amount),
                    after: side(result.after!.amount),
                  };
                }),
            ),
        })
      : [];

  const changes = (r: CorrectionRow) =>
    !!r.after &&
    (r.after.amount !== r.before.amount ||
      r.after.transaction_amount !== r.before.transaction_amount);
  const reconciled =
    stored.filter(row => row.reconciled && changes(results.get(row.id)!))
      .length +
    [...external.values()].filter(
      ({ row, result }) => row.reconciled && changes(result),
    ).length;

  const mapped = await Promise.all(
    stored.map(row => liveMappedCategory(row.category)),
  );
  const fingerprint = digest(
    JSON.stringify({
      account: accountId,
      mode,
      target,
      source: current,
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
        row.schedule,
        row.transferred_id,
        row.amount_pair,
        mapped[i],
      ]),
      repair,
      unsupported: [...unsupported].sort(),
      rates: [...rates.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, rate]) =>
          rate.status === 'resolved'
            ? [date, rate.rate, rate.kind, rate.source, rate.timestamp]
            : [date, null],
        ),
      amounts: Object.entries(amounts).sort(([a], [b]) => a.localeCompare(b)),
      scheduleAmounts: Object.entries(scheduleAmounts).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
      legs: legs.map(leg => [
        leg.id,
        leg.relationship,
        leg.counterpartEncoding,
        snapshot(leg.counterpart),
        leg.counterpartFamily
          ? [
              snapshot(leg.counterpartFamily.parent),
              leg.counterpartFamily.children.map(snapshot),
            ]
          : null,
      ]),
      links: unlinked.map(snapshot),
      schedules: schedules.map(s => [s.id, s.rule, s.date, s.before, s.after]),
      checkedRules,
      externalCategories: await Promise.all(
        [...external.values()].map(e => liveMappedCategory(e.row.category)),
      ),
      effects,
    }),
  );

  return {
    rows,
    schedules,
    missingRates,
    missingRateQuotes,
    effects,
    reconciled,
    fingerprint,
    target,
    changed: rows.filter(changes).length,
    /** Stale rows a repair leaves for the user to delete (transfers). */
    unsupported: [...unsupported].sort(),
    /** Rows a repair rewrites with the current stamp. */
    restamp,
  };
}

/**
 * The fee native nearest `start` whose MC-4.1 valuation
 * (`feeBase(n, value, legNative)`) is `storedFee`, if any: the admissible
 * natives form the interval around `storedFee × legNative / value`, capped
 * at `max` when given.
 */
export function nearestFeeNative(
  storedFee: number,
  value: number,
  legNative: number,
  start: number,
  max?: number,
): number | undefined {
  const v = BigInt(value);
  const l = BigInt(legNative);
  const f = BigInt(storedFee);
  // n × value / legNative within half a unit of storedFee; the boundaries
  // are settled by feeBase's half-even rounding below.
  const low = ((2n * f - 1n) * l) / (2n * v);
  const ceiling = ((2n * f + 1n) * l + 2n * v - 1n) / (2n * v);
  const high =
    max !== undefined && BigInt(max) < ceiling ? BigInt(max) : ceiling;
  const clamp = (n: bigint) => (n < low ? low : n > high ? high : n);
  const near = clamp(BigInt(start));
  return [near, near - 1n, near + 1n, low, low + 1n, high - 1n, high]
    .filter(n => n >= 0n && n >= low && n <= high)
    .map(Number)
    .filter(n => feeBase(n, value, legNative) === storedFee)
    .sort((a, b) => Math.abs(a - start) - Math.abs(b - start) || a - b)[0];
}

/** Bank balances nulled under a new encoding (MC-7.3's balance authority). */
function clearedBalances(encoding: string) {
  const balances = {
    balance_current: null,
    balance_available: null,
    balance_limit: null,
  };
  return { ...balances, balance_spec: balanceSpec(balances, encoding) };
}

/** Every stored field a correction reads from a row in another account. */
function snapshot(row: ExternalRow) {
  return [
    row.id,
    row.acct,
    row.date,
    row.amount,
    row.transaction_amount,
    row.isParent,
    row.isChild,
    row.parent_id,
    row.transferred_id,
    row.schedule,
    row.tombstone,
    row.reconciled,
    row.category,
  ];
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
    // The caller holds a fingerprint, so this input previewed without a
    // refusal: one now (the account already has the target encoding, rows
    // from another device arrived in a previous encoding, or a schedule,
    // rule or transfer changed) means the preview is out of date. A fresh
    // preview reports the refusal itself.
    if (error instanceof Error) return { status: 'stale' as const };
    throw error;
  }
  if (proposal.fingerprint !== fingerprint) return { status: 'stale' as const };
  const failed = proposal.rows.find(r => r.error);
  if (failed) throw new Error(failed.error);
  if (proposal.missingRates.length > 0) {
    return { status: 'rates-missing' as const, dates: proposal.missingRates };
  }
  const amountChanged = (r: CorrectionRow) =>
    r.after!.amount !== r.before.amount ||
    r.after!.transaction_amount !== r.before.transaction_amount;
  // A repair rewrites every repaired row so it takes the current stamp.
  const restamp = new Set(proposal.restamp);
  const rewrites = (r: CorrectionRow) => amountChanged(r) || restamp.has(r.id);
  const changed = proposal.rows.filter(r => rewrites(r) || r.scheduleUnlinked);
  const foreignEdits = new Map<string, ForeignEdit>(
    changed.filter(rewrites).map(r => {
      const account = r.account ?? input.account;
      return [
        r.id,
        {
          action: 'update',
          expected: {
            account,
            amount: r.before.amount,
            transaction_amount: r.before.transaction_amount,
            date: r.date,
          },
          final: {
            account,
            amount: r.after!.amount,
            transaction_amount: r.after!.transaction_amount,
          },
        },
      ];
    }),
  );
  const updates = changed.map(r => ({
    id: r.id,
    ...(rewrites(r) && {
      amount: r.after!.amount,
      transaction_amount: r.after!.transaction_amount,
    }),
    ...(r.scheduleUnlinked && { schedule: null }),
  }));
  const unlinked = new Set<string>(
    proposal.rows.filter(r => r.scheduleUnlinked).map(r => r.id),
  );
  // Transfer legs and counterparts were validated as a whole above.
  const writeOptions = {
    foreignEdits,
    validatedTransfer: true,
    staleRewrite: true,
  };

  await batchMessages(async () => {
    // The account's new encoding is queued first, so the guard validates
    // every row write against it; a repair keeps the account as it is.
    if (!input.repair) {
      const fields = await accountCurrencyFields(proposal.target.currency);
      await db.update('accounts', {
        id: input.account,
        ...fields,
        ...clearedBalances(fields.encoding),
      });
    }
    await preflightTransactionWrites({ updated: updates }, writeOptions);
    for (const update of updates) {
      await db.updateTransaction(update, writeOptions);
    }
    // Schedules follow their account into the target encoding.
    for (const schedule of proposal.schedules) {
      if (schedule.after === schedule.before) continue;
      await updateRule(
        {
          id: schedule.rule,
          conditions: schedule.after!.conditions,
          actions: schedule.after!.actions,
        },
        {
          currencyCorrection: {
            unlinked,
            account: input.account,
            encoding: proposal.target,
          },
        },
      );
    }
  });
  // A repair that wrote nothing leaves undo history alone.
  if (!input.repair || updates.length > 0) clearUndo();
  return { status: 'ok' as const, changed: changed.length };
}

/**
 * Per account, the stale rows (MC-7.3) grouped by the encoding they were
 * written in: rows from another device under a previous currency.
 */
export async function staleEncodingRows(): Promise<
  Array<{ account: string; stamp: string; count: number }>
> {
  const rows = await db.all<{
    acct: string;
    amount_pair: string | null;
    encoding: string | null;
    currency: string | null;
    currency_precision: number | null;
  }>(
    `SELECT t.acct, t.amount_pair, a.encoding, a.currency, a.currency_precision
       FROM transactions t JOIN accounts a ON a.id = t.acct
       WHERE t.amount_pair LIKE '%~%' AND a.tombstone = 0`,
  );
  const counts = new Map<
    string,
    { account: string; stamp: string; count: number }
  >();
  for (const row of rows) {
    const stamp = pairEncoding(row.amount_pair);
    const current = effectiveEncoding(
      row.encoding,
      row.currency,
      row.currency_precision,
    );
    if (stamp === undefined || stamp === current) continue;
    const key = `${row.acct}|${stamp}`;
    const entry = counts.get(key) ?? { account: row.acct, stamp, count: 0 };
    entry.count++;
    counts.set(key, entry);
  }
  return [...counts.values()];
}

/** A repair's mode defaults to Convert, which keeps the stale rows' bases. */
type RepairInput = Omit<
  CorrectionInput,
  'currency' | 'repair' | 'scheduleAmounts' | 'mode'
> & { mode?: CorrectionInput['mode'] };

/** Previews converting an account's stale rows to its current encoding. */
export function previewStaleEncodingRepair(input: RepairInput) {
  return previewCurrencyCorrection({
    ...input,
    mode: input.mode ?? 'convert',
    currency: null,
    repair: true,
  });
}

/** Applies a previewed repair, or returns `stale` if anything changed. */
export function repairStaleEncoding(
  input: RepairInput & { fingerprint: string },
) {
  return correctAccountCurrency({
    ...input,
    mode: input.mode ?? 'convert',
    currency: null,
    repair: true,
  });
}
