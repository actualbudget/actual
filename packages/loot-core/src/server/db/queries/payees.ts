import { all, first, toDateRepr } from "../db";
import { DbAccount, DbPayee, DbViewTransactionInternalAlive } from "../types";
import * as monthUtils from '../../../shared/months';
export async function getPayee(id: DbPayee['id']) {
  return first<DbPayee>(`SELECT * FROM payees WHERE id = ?`, [id]);
}

export function getPayees() {
  return all<DbPayee & { name: DbAccount['name'] | DbPayee['name'] }>(`
    SELECT p.*, COALESCE(a.name, p.name) AS name FROM payees p
    LEFT JOIN accounts a ON (p.transfer_acct = a.id AND a.tombstone = 0)
    WHERE p.tombstone = 0 AND (p.transfer_acct IS NULL OR a.id IS NOT NULL)
    ORDER BY p.transfer_acct IS NULL DESC, p.name COLLATE NOCASE, a.offbudget, a.sort_order
  `);
}

export function getCommonPayees() {
  const twelveWeeksAgo = toDateRepr(
    monthUtils.subWeeks(monthUtils.currentDate(), 12),
  );
  const limit = 10;
  return all<
    DbPayee & {
      common: true;
      transfer_acct: null;
      c: number;
      latest: DbViewTransactionInternalAlive['date'];
    }
  >(`
    SELECT     p.id as id, p.name as name, p.favorite as favorite,
      p.category as category, TRUE as common, NULL as transfer_acct,
    count(*) as c,
    max(t.date) as latest
    FROM payees p
    LEFT JOIN v_transactions_internal_alive t on t.payee == p.id
    WHERE LENGTH(p.name) > 0
    AND p.tombstone = 0
    AND t.date > ${twelveWeeksAgo}
    GROUP BY p.id
    ORDER BY c DESC ,p.transfer_acct IS NULL DESC, p.name
    COLLATE NOCASE
    LIMIT ${limit}
  `);
}

/* eslint-disable rulesdir/typography */
const orphanedPayeesQuery = `
  SELECT p.id
  FROM payees p
    LEFT JOIN payee_mapping pm ON pm.id = p.id
    LEFT JOIN v_transactions_internal_alive t ON t.payee = pm.targetId
  WHERE p.tombstone = 0
    AND p.transfer_acct IS NULL
    AND t.id IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM rules r,
      json_each(r.conditions) as cond
      WHERE r.tombstone = 0
        AND json_extract(cond.value, '$.field') = 'description'
        AND json_extract(cond.value, '$.value') = pm.targetId
    );
`;
/* eslint-enable rulesdir/typography */

export function syncGetOrphanedPayees() {
  return all<Pick<DbPayee, 'id'>>(orphanedPayeesQuery);
}

export async function getOrphanedPayees() {
  const rows = await all<Pick<DbPayee, 'id'>>(orphanedPayeesQuery);
  return rows.map(row => row.id);
}

export async function getPayeeByName(name: DbPayee['name']) {
  return first<DbPayee>(
    `SELECT * FROM payees WHERE UNICODE_LOWER(name) = ? AND tombstone = 0`,
    [name.toLowerCase()],
  );
}
