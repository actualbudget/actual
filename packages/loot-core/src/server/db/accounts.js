import { batchMessages } from '../sync';
import { accountModel } from '../models';
import { shoveSortOrders } from './sort';
import { all, delete_, first, insertWithUUID, update } from './index';

export function getAccounts() {
  return all(
    `SELECT a.*, b.name as bankName, b.id as bankId FROM accounts a
         LEFT JOIN banks b ON a.bank = b.id
         WHERE a.tombstone = 0
         ORDER BY sort_order, name`
  );
}

function _addFragmentForAccount(accountId, addWhere, options = {}) {
  let { showClosed = false, showOffbudget = true } = options;

  let fragment = addWhere ? ' WHERE (' : ' AND ';
  let params = [];

  if (accountId) {
    if (accountId === 'offbudget') {
      fragment += 'a.closed = 0 AND a.offbudget = 1 ';
    } else if (accountId === 'budgeted') {
      fragment += 'a.closed = 0 AND a.offbudget = 0 ';
    } else if (accountId === 'uncategorized') {
      fragment += `
            t.category IS NULL AND a.offbudget = 0 AND isParent = 0 AND (
              ta.offbudget IS NULL OR ta.offbudget = 1
            )
          `;
    } else {
      fragment += 'a.id = ? ';
      params.push(accountId);
    }
  } else {
    fragment += showClosed ? '1' : 'a.closed = 0';

    if (!showOffbudget) {
      fragment += ' AND a.offbudget = 0';
    }
  }

  return { fragment, params };
}

export async function insertAccount(account) {
  // Default to checking. Makes it a lot easier for tests and is
  // generally harmless.
  if (account.type === undefined) {
    account = { ...account, type: 'checking' };
  }

  const accounts = await all(
    'SELECT * FROM accounts WHERE offbudget = ? ORDER BY sort_order, name',
    [account.offbudget != null ? account.offbudget : 0]
  );

  // Don't pass a target in, it will default to appending at the end
  let { sort_order } = shoveSortOrders(accounts);

  account = accountModel.validate({ ...account, sort_order });
  return insertWithUUID('accounts', account);
}

export function updateAccount(account) {
  account = accountModel.validate(account, { update: true });
  return update('accounts', account);
}

export function deleteAccount(account) {
  return delete_('accounts', account.id);
}

export async function moveAccount(id, targetId) {
  let account = await first('SELECT * FROM accounts WHERE id = ?', [id]);
  let accounts;
  if (account.closed) {
    accounts = await all(
      `SELECT id, sort_order FROM accounts WHERE closed = 1 ORDER BY sort_order, name`
    );
  } else {
    accounts = await all(
      `SELECT id, sort_order FROM accounts WHERE tombstone = 0 AND offbudget = ? ORDER BY sort_order, name`,
      [account.offbudget]
    );
  }

  const { updates, sort_order } = shoveSortOrders(accounts, targetId);
  await batchMessages(() => {
    for (let info of updates) {
      update('accounts', info);
    }
    update('accounts', { id, sort_order });
  });
}
