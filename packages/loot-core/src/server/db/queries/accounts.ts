import { first, all } from '../db';
import { DbAccount, DbBank } from '../types';

export async function getAccount(id: DbAccount['id']) {
  return first<DbAccount>(`SELECT * FROM accounts WHERE id = ?`, [id]);
}

export function getAccounts() {
  return all<
    DbAccount & {
      bankName: DbBank['name'];
      bankId: DbBank['id'];
    }
  >(
    `SELECT a.*, b.name as bankName, b.id as bankId FROM accounts a
       LEFT JOIN banks b ON a.bank = b.id
       WHERE a.tombstone = 0
       ORDER BY sort_order, name`,
  );
}
