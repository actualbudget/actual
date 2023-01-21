import asyncStorage from '../../platform/server/asyncStorage';
import { fromPlaidAccountType } from '../../shared/accounts';
import { amountToInteger } from '../../shared/util';
import * as db from '../db';
import { runMutator } from '../mutators';
import { post } from '../post';
import { getServer } from '../server-config';

import * as bankSync from './sync';

const uuid = require('../../platform/uuid');

export async function handoffPublicToken(institution, publicToken) {
  let [[, userId], [, key]] = await asyncStorage.multiGet([
    'user-id',
    'user-key'
  ]);

  if (institution == null || !institution.institution_id || !institution.name) {
    throw new Error('Invalid institution object');
  }

  let id = uuid.v4Sync();

  // Make sure to generate an access token first before inserting it
  // into our local database in case it fails
  await post(getServer().PLAID_SERVER + '/handoff_public_token', {
    userId,
    key,
    item_id: id,
    public_token: publicToken
  });

  await runMutator(() =>
    db.insertWithUUID('banks', {
      id,
      bank_id: institution.institution_id,
      name: institution.name
    })
  );

  return id;
}

export async function addAccounts(bankId, accountIds, offbudgetIds = []) {
  let [[, userId], [, userKey]] = await asyncStorage.multiGet([
    'user-id',
    'user-key'
  ]);

  // Get all the available accounts
  let accounts = await bankSync.getAccounts(userId, userKey, bankId);

  // Only add the selected accounts
  accounts = accounts.filter(acct => accountIds.includes(acct.account_id));

  return Promise.all(
    accounts.map(async acct => {
      let id = await runMutator(async () => {
        let id = await db.insertAccount({
          account_id: acct.account_id,
          name: acct.name,
          official_name: acct.official_name,
          type: fromPlaidAccountType(acct.type),
          balance_current: amountToInteger(acct.balances.current),
          mask: acct.mask,
          bank: bankId,
          offbudget: offbudgetIds.includes(acct.account_id) ? 1 : 0
        });

        // Create a transfer payee
        await db.insertPayee({
          name: '',
          transfer_acct: id
        });

        return id;
      });

      // Do an initial sync
      await bankSync.syncAccount(userId, userKey, id, acct.account_id, bankId);

      return id;
    })
  );
}
