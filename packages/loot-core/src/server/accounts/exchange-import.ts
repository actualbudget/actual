import * as db from '#server/db';
import {
  accountEncoding,
  replaceExchangeTotal,
} from '#server/transactions/foreign-guard';
import * as monthUtils from '#shared/months';
import { getApproxNumberThreshold } from '#shared/rules';
import { extractScheduleConds } from '#shared/schedules';

type Candidate = {
  id: string;
  amount: number;
  transaction_amount: number | null;
  schedule: string | null;
  other_id: string;
  other_account: string;
  other_schedule: string | null;
};

/**
 * Whether an imported amount confirms a leg's estimate: the schedule's own
 * amount condition decides on the schedule account's leg, and the shared
 * approximate threshold of the stored amount on the other leg.
 */
async function amountFits(
  native: number,
  stored: number,
  schedule: string | null,
) {
  if (!schedule) {
    return Math.abs(native - stored) <= getApproxNumberThreshold(stored);
  }
  const rule = await db.first<{ conditions: string | null }>(
    `SELECT r.conditions FROM schedules s JOIN rules r ON r.id = s.rule
       WHERE s.id = ?`,
    [schedule],
  );
  const amount = rule?.conditions
    ? extractScheduleConds(JSON.parse(rule.conditions)).amount
    : null;
  if (!amount) return false;
  if (amount.op === 'isbetween') {
    const { num1, num2 } = amount.value;
    return native >= Math.min(num1, num2) && native <= Math.max(num1, num2);
  }
  if (amount.op === 'isapprox') {
    return (
      Math.abs(native - amount.value) <= getApproxNumberThreshold(amount.value)
    );
  }
  return native === amount.value;
}

/**
 * The single fee-free scheduled exchange leg an unmatched import row
 * confirms: in the row's account, within the matching window, not yet
 * imported, in no family matched in this batch, with the same sign, an
 * amount that fits, and the row's schedule link and transfer payee (if any)
 * naming the exchange. None when zero or several qualify.
 */
export async function findScheduledExchange({
  account,
  date,
  native,
  schedule,
  payee,
  reserved,
}: {
  account: string;
  date: string;
  native: number;
  schedule: string | null | undefined;
  payee: string | null | undefined;
  reserved: Set<unknown>;
}): Promise<{ legId: string; otherId: string } | null> {
  if (!Number.isSafeInteger(native) || native === 0) return null;
  const candidates = await db.all<Candidate>(
    `SELECT t.id, t.amount, t.transaction_amount, t.schedule,
       c.id AS other_id, c.acct AS other_account, c.schedule AS other_schedule
       FROM transactions t JOIN transactions c ON c.id = t.transferred_id
       WHERE t.acct = ? AND t.tombstone = 0 AND t.isParent = 0
         AND t.isChild = 0 AND t.financial_id IS NULL
         AND t.date >= ? AND t.date <= ?
         AND c.tombstone = 0 AND c.isParent = 0 AND c.isChild = 0
         AND c.transferred_id = t.id
         AND (t.schedule IS NOT NULL OR c.schedule IS NOT NULL)`,
    [
      account,
      db.toDateRepr(monthUtils.subDays(date, 7)),
      db.toDateRepr(monthUtils.addDays(date, 7)),
    ],
  );
  if (candidates.length === 0) return null;
  const foreign = (await accountEncoding(account)).currency !== null;
  const payeeTarget = payee
    ? ((
        await db.first<{ transfer_acct: string | null }>(
          'SELECT transfer_acct FROM payees WHERE id = ?',
          [payee],
        )
      )?.transfer_acct ?? null)
    : null;

  const fits: Candidate[] = [];
  for (const candidate of candidates) {
    if (reserved.has(candidate.id) || reserved.has(candidate.other_id)) {
      continue;
    }
    if (
      schedule &&
      schedule !== (candidate.schedule ?? candidate.other_schedule)
    ) {
      continue;
    }
    if (payeeTarget && payeeTarget !== candidate.other_account) continue;
    const stored = foreign ? candidate.transaction_amount : candidate.amount;
    if (stored === null || Math.sign(stored) !== Math.sign(native)) continue;
    if (!(await amountFits(native, stored, candidate.schedule))) continue;
    // Also confirms the exchange is fee-free, in two encodings, and valid.
    if (!(await replaceExchangeTotal(candidate.id, native))) continue;
    fits.push(candidate);
  }
  return fits.length === 1
    ? { legId: fits[0].id, otherId: fits[0].other_id }
    : null;
}
