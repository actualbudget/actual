import {
  laneAdmits,
  laneInfo,
  routeFromCategory,
} from '#server/budget/pockets';
import * as db from '#server/db';
import { getBatchedValue } from '#server/sync';
import { pairEncoding } from '#server/sync/coupled-cells';

import { liveMappedCategory } from './foreign-guard';

type LaneWrite = {
  id?: string;
  account?: string;
  category?: string | null;
};

/** Why a write could not keep or route a row's lane. */
export type LaneReason = 'owner-unresolved';

type StoredLane = {
  acct: string;
  category: string | null;
  pocket: string | null;
  amount_pair: string | null;
  candidate: string | null;
  /** The category the row shows, null when deleted. */
  effective: string | null;
};

function accountStamp(account: string | undefined): string {
  if (!account) return '';
  const row = db.firstSync<{ stamp: string }>(
    `SELECT CASE WHEN currency IS NULL THEN ''
       ELSE currency || '.' || currency_precision END AS stamp
       FROM accounts WHERE id = ?`,
    [account],
  );
  return row?.stamp ?? '';
}

async function storedLane(id: string): Promise<StoredLane | null> {
  const stored = await db.first<StoredLane>(
    `SELECT t.acct, t.category, t.pocket, t.amount_pair, l.candidate,
       c.id AS effective
       FROM transactions t
       JOIN v_transaction_lanes l ON l.id = t.id
       LEFT JOIN categories c ON c.id = l.category AND c.tombstone = 0
       WHERE t.id = ?`,
    [id],
  );
  if (!stored) return null;
  // A category or pointer written earlier in the current batch is the
  // row's state too.
  const category = getBatchedValue('transactions', id, 'category');
  const pocket = getBatchedValue('transactions', id, 'pocket');
  if (category) {
    const raw = typeof category.value === 'string' ? category.value : null;
    stored.category = raw;
    stored.effective = await liveMappedCategory(raw);
  }
  if (pocket) {
    stored.pocket = typeof pocket.value === 'string' ? pocket.value : null;
  }
  return stored;
}

/**
 * Write intent for a row's lane (MC-10). Raw category and lane pointer are
 * internal provenance and every reader shows the effective category, so a
 * write that names the effective category again, and every other field
 * edit, keeps both. A new category routes from that category. An account
 * move into another encoding keeps the lane when it admits the new stamp,
 * else routes from the effective category, writing it as the raw category
 * with the new pointer so the pointer's owner check holds.
 *
 * Returns the row to write, the pointer to store with it if it changes, and
 * the reason when the lane could not be kept or routed.
 */
export async function laneIntent<T extends LaneWrite>(
  row: T,
  pair: string | undefined,
): Promise<{ row: T; pocket?: string | null; reason?: LaneReason }> {
  const stored = row.id ? await storedLane(row.id) : null;
  const account = row.account ?? stored?.acct;
  // Without a new pair, a row in its own account keeps its recorded stamp,
  // whether the account is omitted or resent.
  const sameAccount =
    stored !== null &&
    (row.account === undefined || row.account === stored.acct);
  const stamp =
    (pair !== undefined ? pairEncoding(pair) : undefined) ??
    (pair === undefined && sameAccount
      ? pairEncoding(stored.amount_pair)
      : undefined) ??
    accountStamp(account);

  if (!stored) {
    const pocket = routeFromCategory(row.category ?? null, stamp);
    return pocket ? { row, pocket } : { row };
  }
  const changed = (pocket: string | null) =>
    pocket === (stored.pocket ?? null) ? { row } : { row, pocket };

  if (
    row.category !== undefined &&
    (row.category ?? null) !== (stored.effective ?? null)
  ) {
    return changed(routeFromCategory(row.category ?? null, stamp));
  }
  const kept = { ...row };
  delete kept.category;
  const keep = { row: kept };
  if (row.account === undefined || row.account === stored.acct) return keep;

  const previousStamp =
    pairEncoding(stored.amount_pair) ?? accountStamp(stored.acct);
  if (stamp === previousStamp) return keep;
  const lane = laneInfo(stored.candidate);
  if (!lane || laneAdmits(lane, stamp)) return keep;
  if (!stored.effective) {
    // The raw category stays and rules 2 and 3 apply.
    return { row: kept, pocket: null, reason: 'owner-unresolved' };
  }
  const pocket = routeFromCategory(stored.effective, stamp);
  return {
    row: { ...kept, category: stored.effective },
    ...(pocket !== (stored.pocket ?? null) && { pocket }),
  };
}
