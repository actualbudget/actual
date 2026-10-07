import { v4 as uuidv4 } from 'uuid';

import * as db from '#server/db';
import { computeEntryPair } from '#server/exchange-rates/app';
import { batchMessages } from '#server/sync';
import { withUndo } from '#server/undo';
import { getAccountCurrency } from '#server/util/currency';
import { isValidDate } from '#shared/exchange-rate';
import { exchangeLegs, feeBase } from '#shared/exchange-transfer';

import {
  accountEncoding,
  preflightTransactionWrites,
  sameEncoding,
} from './foreign-guard';
import { runRules } from './transaction-rules';

export type ExchangeTransferInput = {
  date: string;
  sourceAccount: string;
  destinationAccount: string;
  /** Total source debit S, positive, in the source account's encoding. */
  sourceAmount: number;
  /** Net destination credit N; give this or `rate`. */
  destinationAmount?: number;
  /** Destination major units per source major unit; give this or N. */
  rate?: string;
  sourceFee?: number;
  destinationFee?: number;
  /** The principal's base value, used only between two foreign accounts. */
  baseAmount?: number;
  /** The on-budget leg's category for an on/off-budget transfer. */
  category?: string | null;
  feeCategory?: string | null;
  notes?: string | null;
  cleared?: boolean;
  /**
   * The account the user entered the transfer in (source by default). Its
   * leg keeps the entered notes and cleared status; rules run on the other.
   */
  initiatingAccount?: string;
  /**
   * The schedule whose occurrence this posts, linked from the initiating
   * account's top-level row (its fee parent when it has a fee).
   */
  schedule?: string;
};

type Row = {
  id: string;
  account: string;
  date: string;
  amount: number;
  transaction_amount?: number;
  payee: string | null;
  category: string | null;
  notes: string | null;
  cleared: boolean;
  transfer_id?: string;
  is_parent?: boolean;
  is_child?: boolean;
  parent_id?: string;
  schedule?: string;
};

function checked(value: number, sign: 1 | -1) {
  if (!Number.isSafeInteger(value) || value * sign < 0) {
    throw new Error('exchange-amount-invalid');
  }
  // A zero leg is stored as 0, never -0.
  return value === 0 ? 0 : value;
}

async function transferPayee(accountId: string) {
  const payee = await db.first<Pick<db.DbPayee, 'id'>>(
    'SELECT id FROM payees WHERE transfer_acct = ?',
    [accountId],
  );
  if (!payee) {
    throw new Error('account-not-found');
  }
  return payee.id;
}

/** The principal's base value V: one valuation for both transfer legs. */
async function valuation(
  input: Pick<ExchangeTransferInput, 'date' | 'baseAmount'>,
  source: { foreign: boolean; currencyCode: string; precision: number },
  destination: { foreign: boolean; currencyCode: string; precision: number },
  principal: number,
  gross: number,
): Promise<number | null> {
  if (!source.foreign || !destination.foreign) {
    if (input.baseAmount !== undefined) {
      throw new Error('exchange-amount-invalid');
    }
    return source.foreign ? gross : principal;
  }
  if (input.baseAmount !== undefined) {
    return input.baseAmount;
  }
  for (const [side, amount] of [
    [source, principal],
    [destination, gross],
  ] as const) {
    const pair = await computeEntryPair({
      quoteCurrency: side.currencyCode,
      nativePrecision: side.precision,
      date: input.date,
      nativeAmount: amount,
    }).catch(err => {
      if (err instanceof Error && err.message === 'amount-out-of-range') {
        throw new Error('exchange-amount-invalid');
      }
      throw err;
    });
    if (pair.status === 'ok') {
      return pair.baseAmount;
    }
  }
  return null;
}

type ExchangeSide = {
  foreign: boolean;
  currencyCode: string;
  precision: number;
};

/**
 * An exchange's stored integers: the legs from S and N or a rate, one
 * valuation V, and each fee's base at the transfer's implied rate. Posting
 * and editing share it, so both store the same arithmetic.
 */
export async function exchangeValues(
  input: Pick<
    ExchangeTransferInput,
    | 'date'
    | 'sourceAmount'
    | 'destinationAmount'
    | 'rate'
    | 'sourceFee'
    | 'destinationFee'
    | 'baseAmount'
  >,
  source: ExchangeSide,
  destination: ExchangeSide,
): Promise<
  | {
      status: 'ok';
      legs: ReturnType<typeof exchangeLegs>;
      value: number;
      sourceFeeBase: number;
      destinationFeeBase: number;
    }
  | { status: 'rate-unavailable'; currencies: string[]; date: string }
> {
  const common = {
    sourceAmount: input.sourceAmount,
    sourcePrecision: source.precision,
    destinationPrecision: destination.precision,
    sourceFee: input.sourceFee,
    destinationFee: input.destinationFee,
  };
  let legs;
  if (input.rate !== undefined && input.destinationAmount === undefined) {
    legs = exchangeLegs({ ...common, rate: input.rate });
  } else if (
    input.destinationAmount !== undefined &&
    input.rate === undefined
  ) {
    legs = exchangeLegs({
      ...common,
      destinationAmount: input.destinationAmount,
    });
  } else {
    throw new Error('exchange-amount-invalid');
  }

  const value = await valuation(
    input,
    source,
    destination,
    legs.principal,
    legs.gross,
  );
  if (value === null) {
    return {
      status: 'rate-unavailable',
      currencies: [source.currencyCode, destination.currencyCode],
      date: input.date,
    };
  }
  checked(value, 1);
  const sourceFeeBase = source.foreign
    ? feeBase(legs.sourceFee, value, legs.principal)
    : legs.sourceFee;
  const destinationFeeBase = destination.foreign
    ? feeBase(legs.destinationFee, value, legs.gross)
    : legs.destinationFee;

  return { status: 'ok', legs, value, sourceFeeBase, destinationFeeBase };
}

/**
 * Writes one exchange transfer atomically: equal and opposite base legs from
 * one valuation, native legs in each account's encoding, and an optional fee
 * split on the endpoint whose currency it is in.
 */
export async function postExchangeTransfer(
  input: ExchangeTransferInput,
): Promise<
  | { status: 'ok'; sourceId: string; destinationId: string }
  | { status: 'rate-unavailable'; currencies: string[]; date: string }
> {
  if (!isValidDate(input.date)) {
    throw new Error('date-invalid');
  }
  if (input.sourceAccount === input.destinationAccount) {
    throw new Error('exchange-same-account');
  }
  const accounts = await Promise.all(
    [input.sourceAccount, input.destinationAccount].map(id =>
      db.first<Pick<db.DbAccount, 'id' | 'offbudget' | 'closed'>>(
        'SELECT id, offbudget, closed FROM accounts WHERE id = ? AND tombstone = 0',
        [id],
      ),
    ),
  );
  const [sourceAccount, destinationAccount] = accounts;
  if (!sourceAccount || !destinationAccount) {
    throw new Error('account-not-found');
  }
  if (sourceAccount.closed || destinationAccount.closed) {
    throw new Error('account-closed');
  }
  const sourceEncoding = await accountEncoding(sourceAccount.id);
  const destinationEncoding = await accountEncoding(destinationAccount.id);
  if (sameEncoding(sourceEncoding, destinationEncoding)) {
    throw new Error('exchange-not-required');
  }
  const source = {
    ...(await getAccountCurrency(sourceAccount.id)),
    foreign: sourceEncoding.currency !== null,
  };
  const destination = {
    ...(await getAccountCurrency(destinationAccount.id)),
    foreign: destinationEncoding.currency !== null,
  };

  const values = await exchangeValues(input, source, destination);
  if (values.status !== 'ok') return values;
  const { legs, value, sourceFeeBase, destinationFeeBase } = values;

  const pairOn =
    (foreign: boolean) => (amount: number, native: number, sign: 1 | -1) => ({
      amount: checked(amount, sign),
      ...(foreign && { transaction_amount: checked(native, sign) }),
    });
  const sourcePair = pairOn(source.foreign);
  const destinationPair = pairOn(destination.foreign);

  // Envelopes see an on/off-budget transfer on its on-budget leg only.
  const crossesBudget =
    sourceAccount.offbudget !== destinationAccount.offbudget;
  const legCategory = (account: Pick<db.DbAccount, 'offbudget'>) =>
    crossesBudget && !account.offbudget ? (input.category ?? null) : null;
  const feeCategory = (account: Pick<db.DbAccount, 'offbudget'>) =>
    account.offbudget ? null : (input.feeCategory ?? null);

  const sourceLegId = uuidv4();
  const destinationLegId = uuidv4();
  const shared = { date: input.date };

  if (
    input.initiatingAccount !== undefined &&
    input.initiatingAccount !== sourceAccount.id &&
    input.initiatingAccount !== destinationAccount.id
  ) {
    throw new Error('account-not-found');
  }
  const fromDestination = input.initiatingAccount === destinationAccount.id;

  const sourceDraft = {
    ...shared,
    id: sourceLegId,
    account: sourceAccount.id,
    payee: await transferPayee(destinationAccount.id),
    transfer_id: destinationLegId,
    category: legCategory(sourceAccount),
    ...sourcePair(-value, -legs.principal, -1),
  };
  const destinationDraft = {
    ...shared,
    id: destinationLegId,
    account: destinationAccount.id,
    payee: await transferPayee(sourceAccount.id),
    transfer_id: sourceLegId,
    category: legCategory(destinationAccount),
    ...destinationPair(value, legs.gross, 1),
  };

  // The entered leg keeps what the user typed. Like addTransfer, the other
  // leg keeps only rule notes and cleared; payees its rules name are never
  // created.
  const entered = {
    notes: input.notes ?? null,
    cleared: input.cleared ?? false,
  };
  const otherDraft = {
    ...(fromDestination ? sourceDraft : destinationDraft),
    notes: input.notes ?? null,
    cleared: false,
  };
  const ruled = await runRules(otherDraft, undefined, undefined, async () =>
    uuidv4(),
  );
  const other = { notes: ruled.notes ?? null, cleared: !!ruled.cleared };
  const sourceLeg: Row = {
    ...sourceDraft,
    ...(fromDestination ? other : entered),
  };
  const destinationLeg: Row = {
    ...destinationDraft,
    ...(fromDestination ? entered : other),
  };

  const fromSource = !fromDestination;
  const link = (initiating: boolean) =>
    initiating && input.schedule ? { schedule: input.schedule } : {};
  const rows: Row[] = [];
  if (legs.sourceFee > 0) {
    const parentId = uuidv4();
    rows.push(
      {
        ...shared,
        id: parentId,
        account: sourceAccount.id,
        payee: null,
        category: null,
        notes: sourceLeg.notes,
        cleared: sourceLeg.cleared,
        is_parent: true,
        ...link(fromSource),
        ...sourcePair(
          -(value + sourceFeeBase),
          -(legs.principal + legs.sourceFee),
          -1,
        ),
      },
      { ...sourceLeg, is_child: true, parent_id: parentId },
      {
        ...shared,
        id: uuidv4(),
        account: sourceAccount.id,
        payee: null,
        category: feeCategory(sourceAccount),
        notes: null,
        cleared: sourceLeg.cleared,
        is_child: true,
        parent_id: parentId,
        ...sourcePair(-sourceFeeBase, -legs.sourceFee, -1),
      },
    );
  } else {
    rows.push({ ...sourceLeg, ...link(fromSource) });
  }
  if (legs.destinationFee > 0) {
    const parentId = uuidv4();
    rows.push(
      {
        ...shared,
        id: parentId,
        account: destinationAccount.id,
        payee: null,
        category: null,
        notes: destinationLeg.notes,
        cleared: destinationLeg.cleared,
        is_parent: true,
        ...link(fromDestination),
        ...destinationPair(value - destinationFeeBase, legs.net, 1),
      },
      { ...destinationLeg, is_child: true, parent_id: parentId },
      {
        ...shared,
        id: uuidv4(),
        account: destinationAccount.id,
        payee: null,
        category: feeCategory(destinationAccount),
        notes: null,
        cleared: destinationLeg.cleared,
        is_child: true,
        parent_id: parentId,
        ...destinationPair(-destinationFeeBase, -legs.destinationFee, -1),
      },
    );
  } else {
    rows.push({ ...destinationLeg, ...link(fromDestination) });
  }

  // Everything is validated before undo is recorded; only inserts follow.
  await preflightTransactionWrites(
    { added: rows },
    { validatedTransfer: true },
  );
  await withUndo(() =>
    batchMessages(async () => {
      for (const row of rows) {
        await db.insertTransaction(row, { validatedTransfer: true });
      }
    }),
  );
  return {
    status: 'ok',
    sourceId: rows[0].id,
    destinationId: rows[legs.sourceFee > 0 ? 3 : 1].id,
  };
}
