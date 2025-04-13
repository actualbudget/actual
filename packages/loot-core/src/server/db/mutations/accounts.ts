// @ts-strict-ignore
import { accountModel } from '../../models';
import { batchMessages } from '../../sync';
import { all, insertWithUUID, update, delete_, first } from '../db';
import { shoveSortOrders } from '../sort';
import { DbAccount } from '../types';

export async function insertAccount(account: Partial<DbAccount>) {
  const accounts = await all<DbAccount>(
    'SELECT * FROM accounts WHERE offbudget = ? ORDER BY sort_order, name',
    [account.offbudget ? 1 : 0],
  );

  // Don't pass a target in, it will default to appending at the end
  const { sort_order } = shoveSortOrders(accounts);

  account = accountModel.validate({ ...account, sort_order });
  return insertWithUUID('accounts', account);
}

export function updateAccount(account) {
  account = accountModel.validate(account, { update: true });
  return update('accounts', account);
}

export function deleteAccount(account: { id: string }) {
  return delete_('accounts', account.id);
}

export async function moveAccount(
  id: DbAccount['id'],
  targetId: DbAccount['id'] | null,
) {
  const account = await first<DbAccount>(
    'SELECT * FROM accounts WHERE id = ?',
    [id],
  );
  let accounts;
  if (account?.closed) {
    accounts = await all<Pick<DbAccount, 'id' | 'sort_order'>>(
      `SELECT id, sort_order FROM accounts WHERE closed = 1 ORDER BY sort_order, name`,
    );
  } else {
    accounts = await all<Pick<DbAccount, 'id' | 'sort_order'>>(
      `SELECT id, sort_order FROM accounts WHERE tombstone = 0 AND offbudget = ? ORDER BY sort_order, name`,
      [account?.offbudget ? 1 : 0],
    );
  }

  const { updates, sort_order } = shoveSortOrders(accounts, targetId);
  await batchMessages(async () => {
    for (const info of updates) {
      update('accounts', info);
    }
    update('accounts', { id, sort_order });
  });
}
