// @ts-strict-ignore

import * as connection from '../../platform/server/connection';
import { assignBatchSeq } from '../../shared/sort-order';
import { type Diff } from '../../shared/util';
import { type PayeeEntity, type TransactionEntity } from '../../types/models';
import * as db from '../db';
import { incrFetch, whereIn } from '../db/util';
import { batchMessages } from '../sync';

import * as rules from './transaction-rules';
import * as transfer from './transfer';

async function idsWithChildren(ids: string[]) {
  const whereIds = whereIn(ids, 'parent_id');
  const rows = await db.all<Pick<db.DbViewTransactionInternal, 'id'>>(
    `SELECT id FROM v_transactions_internal WHERE ${whereIds}`,
  );
  const set = new Set(ids);
  for (const row of rows) {
    set.add(row.id);
  }
  return [...set];
}

async function getTransactionsByIds(
  ids: string[],
): Promise<TransactionEntity[]> {
  // TODO: convert to whereIn
  //
  // or better yet, use ActualQL
  return incrFetch(
    (query, params) => db.selectWithSchema('transactions', query, params),
    ids,

    id => `id = '${id}'`,
    where => `SELECT * FROM v_transactions_internal WHERE ${where}`,
  );
}

export async function batchUpdateTransactions({
  added,
  deleted,
  updated,
  learnCategories = false,
  detectOrphanPayees = true,
  runTransfers = true,
}: Partial<Diff<TransactionEntity>> & {
  learnCategories?: boolean;
  detectOrphanPayees?: boolean;
  runTransfers?: boolean;
}) {
  // Track the ids of each type of transaction change (see below for why)
  let addedIds = [];
  const updatedIds = updated ? updated.map(u => u.id) : [];
  const deletedIds = deleted
    ? await idsWithChildren(deleted.map(d => d.id))
    : [];

  const oldPayees = new Set<PayeeEntity['id']>();
  const accounts = await db.all<db.DbAccount>(
    'SELECT * FROM accounts WHERE tombstone = 0',
  );

  // We need to get all the payees of updated transactions _before_
  // making changes
  if (updated) {
    const descUpdatedIds = updated
      .filter(update => update.payee)
      .map(update => update.id);

    const transactions = await getTransactionsByIds(descUpdatedIds);

    for (let i = 0; i < transactions.length; i++) {
      oldPayees.add(transactions[i].payee);
    }
  }

  // Apply all the updates. We can batch this now! This is important
  // and makes bulk updates much faster
  await batchMessages(async () => {
    if (added) {
      // Assign sort_order using the new YYYYMMDDseq format for transactions
      // that don't already have a sort_order value
      const transactionsNeedingSortOrder = added.filter(
        t => t.sort_order == null && t.date,
      );
      const transactionsWithSortOrder = added.filter(
        t => t.sort_order != null || !t.date,
      );

      // Get existing transactions on the same dates to determine next seq
      const dates = [...new Set(transactionsNeedingSortOrder.map(t => t.date))];
      let existingTransactions: Array<{
        sort_order: number | null;
      }> = [];
      if (dates.length > 0) {
        existingTransactions = await db.all<{
          sort_order: number | null;
        }>(
          `SELECT sort_order FROM v_transactions_internal 
           WHERE date IN (${dates.map(() => '?').join(',')}) AND tombstone = 0`,
          dates,
        );
      }

      // Assign sort_order to transactions that need it
      // assignBatchSeq extracts dates from sort_order values, so we pass empty date strings
      // since they won't be used (existing transactions' dates come from their sort_order)
      const existingWithPlaceholderDate = existingTransactions.map(t => ({
        date: '',
        sort_order: t.sort_order,
      }));
      const assignedTransactions = assignBatchSeq(
        transactionsNeedingSortOrder,
        existingWithPlaceholderDate,
      );

      // Combine with transactions that already have sort_order
      const allTransactions = [
        ...transactionsWithSortOrder,
        ...assignedTransactions,
      ];

      addedIds = await Promise.all(
        allTransactions.map(async t => {
          // Offbudget account transactions and parent transactions should not have categories.
          const account = accounts.find(acct => acct.id === t.account);
          if (t.is_parent || account?.offbudget === 1) {
            t.category = null;
          }
          return db.insertTransaction(t);
        }),
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
        }),
      );
    }

    if (updated) {
      await Promise.all(
        updated.map(async t => {
          if (t.account) {
            // Moving transactions off budget should always clear the
            // category. Parent transactions should not have categories.
            const account = accounts.find(acct => acct.id === t.account);
            if (t.is_parent || account?.offbudget === 1) {
              t.category = null;
            }
          }

          await db.updateTransaction(t);
        }),
      );
    }
  });

  // Get all of the full transactions that were changed. This is
  // needed to run any cascading logic that depends on the full
  // transaction. Things like transfers, analyzing rule updates, and
  // more
  const allAdded = await getTransactionsByIds(addedIds);
  const allUpdated = await getTransactionsByIds(updatedIds);
  const allDeleted = await getTransactionsByIds(deletedIds);

  // Post-processing phase: first do any updates to transfers.
  // Transfers update the transactions and we need to return updates
  // to the client so that can apply them. Note that added
  // transactions just return the full transaction.
  const resultAdded = allAdded;
  const resultUpdated = allUpdated;
  let transfersUpdated: Awaited<ReturnType<typeof transfer.onUpdate>>[];

  if (runTransfers) {
    await batchMessages(async () => {
      await Promise.all(allAdded.map(t => transfer.onInsert(t)));

      // Return any updates from here
      transfersUpdated = (
        await Promise.all(allUpdated.map(t => transfer.onUpdate(t)))
      ).filter(Boolean);

      await Promise.all(allDeleted.map(t => transfer.onDelete(t)));
    });
  }

  if (learnCategories) {
    // Analyze any updated categories and update rules to learn from
    // the user's activity
    const ids = new Set([
      ...(added ? added.filter(add => add.category).map(add => add.id) : []),
      ...(updated
        ? updated.filter(update => update.category).map(update => update.id)
        : []),
    ]);
    await rules.updateCategoryRules(
      allAdded.concat(allUpdated).filter(trans => ids.has(trans.id)),
    );
  }

  if (detectOrphanPayees) {
    // Look for any orphaned payees and notify the user about merging
    // them

    if (updated) {
      const newPayeeIds = updated.map(u => u.payee).filter(Boolean);
      if (newPayeeIds.length > 0) {
        const allOrphaned = new Set(await db.getOrphanedPayees());

        const orphanedIds = [...oldPayees].filter(id => allOrphaned.has(id));

        if (orphanedIds.length > 0) {
          connection.send('orphaned-payees', {
            orphanedIds,
            updatedPayeeIds: newPayeeIds,
          });
        }
      }
    }
  }

  return {
    added: resultAdded,
    updated: runTransfers ? transfersUpdated : resultUpdated,
    deleted: allDeleted,
    errors: ((added || []) as Partial<TransactionEntity>[])
      .concat(updated || [])
      .flatMap(t => t._ruleErrors || []),
  };
}
