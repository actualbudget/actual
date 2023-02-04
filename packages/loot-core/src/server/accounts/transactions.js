import * as db from '../db';
import { incrFetch, whereIn } from '../db/util';
import { batchMessages } from '../sync';

import * as rules from './transaction-rules';
import * as transfer from './transfer';

const connection = require('../../platform/server/connection');

async function idsWithChildren(ids) {
  let whereIds = whereIn(ids, 'parent_id');
  let rows = await db.all(
    `SELECT id FROM v_transactions_internal WHERE ${whereIds}`
  );
  let set = new Set(ids);
  for (let row of rows) {
    set.add(row.id);
  }
  return [...set];
}

async function getTransactionsByIds(ids) {
  // TODO: convert to whereIn
  //
  // or better yet, use ActualQL
  return incrFetch(
    (query, params) => db.selectWithSchema('transactions', query, params),
    ids,
    id => `id = '${id}'`,
    where => `SELECT * FROM v_transactions_internal WHERE ${where}`
  );
}

export async function batchUpdateTransactions({
  added,
  deleted,
  updated,
  learnCategories = false,
  detectOrphanPayees = true
}) {
  // Track the ids of each type of transaction change (see below for why)
  let addedIds = [];
  let updatedIds = updated ? updated.map(u => u.id) : [];
  let deletedIds = deleted ? await idsWithChildren(deleted.map(d => d.id)) : [];

  let oldPayees = new Set();
  let accounts = await db.all('SELECT * FROM accounts WHERE tombstone = 0');

  // We need to get all the payees of updated transactions _before_
  // making changes
  if (updated) {
    let descUpdatedIds = updated
      .filter(update => update.payee)
      .map(update => update.id);

    let transactions = await getTransactionsByIds(descUpdatedIds);

    for (let i = 0; i < transactions.length; i++) {
      oldPayees.add(transactions[i].payee);
    }
  }

  // Apply all the updates. We can batch this now! This is important
  // and makes bulk updates much faster
  await batchMessages(async () => {
    if (added) {
      addedIds = await Promise.all(
        added.map(async t => db.insertTransaction(t))
      );
    }

    if (deleted) {
      await Promise.all(
        // It's important to use `deletedIds` and not `deleted` here
        // because we've expanded it to include children above. The
        // inconsistency of the delete APIs is annoying and should
        // be fixed (it should only take an id)
        deletedIds.map(async id => {
          await db.deleteTransaction({ id });
        })
      );
    }

    if (updated) {
      await Promise.all(
        updated.map(async t => {
          if (t.account) {
            // Moving transactions off budget should always clear the
            // category
            let account = accounts.find(acct => acct.id === t.account);
            if (account.offbudget === 1) {
              t.category = null;
            }
          }

          await db.updateTransaction(t);
        })
      );
    }
  });

  // Get all of the full transactions that were changed. This is
  // needed to run any cascading logic that depends on the full
  // transaction. Things like transfers, analyzing rule updates, and
  // more
  let allAdded = await getTransactionsByIds(addedIds);
  let allUpdated = await getTransactionsByIds(updatedIds);
  let allDeleted = await getTransactionsByIds(deletedIds);

  // Post-processing phase: first do any updates to transfers.
  // Transfers update the transactions and we need to return updates
  // to the client so that can apply them. Note that added
  // transactions just return the full transaction.
  let resultAdded = allAdded;
  let resultUpdated;

  await batchMessages(async () => {
    await Promise.all(allAdded.map(t => transfer.onInsert(t)));

    // Return any updates from here
    resultUpdated = (
      await Promise.all(allUpdated.map(t => transfer.onUpdate(t)))
    ).filter(Boolean);

    await Promise.all(allDeleted.map(t => transfer.onDelete(t)));
  });

  if (learnCategories) {
    // Analyze any updated categories and update rules to learn from
    // the user's activity
    let ids = new Set([
      ...(added ? added.filter(add => add.category).map(add => add.id) : []),
      ...(updated
        ? updated.filter(update => update.category).map(update => update.id)
        : [])
    ]);
    await rules.updateCategoryRules(
      allAdded.concat(allUpdated).filter(trans => ids.has(trans.id))
    );
  }

  if (detectOrphanPayees) {
    // Look for any orphaned payees and notify the user about merging
    // them

    if (updated) {
      let newPayeeIds = updated.map(u => u.payee).filter(Boolean);
      if (newPayeeIds.length > 0) {
        let allOrphaned = new Set(await db.getOrphanedPayees());

        let orphanedIds = [...oldPayees].filter(id => allOrphaned.has(id));

        if (orphanedIds.length > 0) {
          connection.send('orphaned-payees', {
            orphanedIds,
            updatedPayeeIds: newPayeeIds
          });
        }
      }
    }
  }

  return {
    added: resultAdded,
    updated: resultUpdated
  };
}
