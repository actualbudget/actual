import * as db from '#server/db';
import * as monthUtils from '#shared/months';

// How far back existing transactions are compared against a file.
const HISTORY_DAYS = 365;
// A suggestion needs this much weighted payee evidence, and the best
// account must beat the runner-up by this factor. Better to say nothing
// than to point at the wrong account.
const MIN_PAYEE_SCORE = 2;
const MIN_MARGIN = 2;
const ID_CHUNK_SIZE = 500;

export type AccountEvidence = {
  // Transactions in the file whose imported id already exists in the account.
  importedIdMatches: number;
  // Merchant keys seen in the account's recent transactions.
  merchants: Set<string>;
};

// Bank descriptors vary in digits, dates and punctuation between
// transactions from the same merchant ("STARBUCKS STORE 07604 01/21").
export function merchantKey(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const key = value
    .toLowerCase()
    .replace(/[^\p{L}]+/gu, ' ')
    .trim();
  return key.length >= 3 ? key : null;
}

function bestAccount(
  scores: Map<string, number>,
  minScore: number,
  minMargin: number,
): string | null {
  const ranked = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0 || ranked[0][1] < minScore) {
    return null;
  }
  if (ranked.length > 1 && ranked[0][1] < ranked[1][1] * minMargin) {
    return null;
  }
  return ranked[0][0];
}

// Pure scoring: which account does a file most likely belong to?
export function suggestAccount(
  fileMerchants: Set<string>,
  evidence: Map<string, AccountEvidence>,
): string | null {
  // Ids the account has already seen are near-certain evidence.
  const idScores = new Map(
    [...evidence].map(([accountId, e]) => [accountId, e.importedIdMatches]),
  );
  const byId = bestAccount(idScores, 1, MIN_MARGIN);
  if (byId) {
    return byId;
  }

  // A merchant seen in every account says little; one seen in a single
  // account says a lot, so each merchant is split across the accounts that
  // contain it.
  const payeeScores = new Map<string, number>();
  for (const merchant of fileMerchants) {
    const holders = [...evidence].filter(([, e]) => e.merchants.has(merchant));
    for (const [accountId] of holders) {
      payeeScores.set(
        accountId,
        (payeeScores.get(accountId) ?? 0) + 1 / holders.length,
      );
    }
  }
  return bestAccount(payeeScores, MIN_PAYEE_SCORE, MIN_MARGIN);
}

type ImportedTransaction = {
  imported_id?: string;
  payee_name?: string | null;
  imported_payee?: string | null;
};

export async function findSuggestedAccount(
  transactions: ImportedTransaction[],
): Promise<string | null> {
  const fileMerchants = new Set<string>();
  const importedIds = new Set<string>();
  for (const trans of transactions) {
    for (const name of [trans.payee_name, trans.imported_payee]) {
      const key = merchantKey(name);
      if (key) {
        fileMerchants.add(key);
      }
    }
    if (trans.imported_id) {
      importedIds.add(trans.imported_id);
    }
  }
  if (fileMerchants.size === 0 && importedIds.size === 0) {
    return null;
  }

  const evidence = new Map<string, AccountEvidence>();
  const getEvidence = (accountId: string) => {
    let entry = evidence.get(accountId);
    if (!entry) {
      entry = { importedIdMatches: 0, merchants: new Set() };
      evidence.set(accountId, entry);
    }
    return entry;
  };

  const since = db.toDateRepr(
    monthUtils.subDays(monthUtils.currentDay(), HISTORY_DAYS),
  );
  const history = await db.all<{
    acct: string;
    imported: string | null;
    payee: string | null;
  }>(
    `SELECT DISTINCT t.acct, t.imported_description AS imported, p.name AS payee
       FROM transactions t
       JOIN accounts a ON a.id = t.acct AND a.tombstone = 0 AND a.closed = 0
       LEFT JOIN payees p ON p.id = t.description
      WHERE t.tombstone = 0 AND t.isChild = 0 AND t.date >= ?`,
    [since],
  );
  for (const row of history) {
    const entry = getEvidence(row.acct);
    for (const name of [row.imported, row.payee]) {
      const key = merchantKey(name);
      if (key) {
        entry.merchants.add(key);
      }
    }
  }

  const ids = [...importedIds];
  for (let i = 0; i < ids.length; i += ID_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + ID_CHUNK_SIZE);
    const rows = await db.all<{ acct: string; n: number }>(
      `SELECT t.acct, COUNT(*) AS n
         FROM transactions t
         JOIN accounts a ON a.id = t.acct AND a.tombstone = 0 AND a.closed = 0
        WHERE t.tombstone = 0 AND t.financial_id IN (${chunk.map(() => '?').join(',')})
        GROUP BY t.acct`,
      chunk,
    );
    for (const row of rows) {
      getEvidence(row.acct).importedIdMatches += row.n;
    }
  }

  return suggestAccount(fileMerchants, evidence);
}
