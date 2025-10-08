// @ts-strict-ignore

import * as connection from '../../platform/server/connection';
import { logger } from '../../platform/server/log';
import { getCurrency } from '../../shared/currencies';
import { type Diff } from '../../shared/util';
import { type PayeeEntity, type TransactionEntity } from '../../types/models';
import * as db from '../db';
import { incrFetch, whereIn } from '../db/util';
import { exchangeRateService } from '../exchange-rate';
import { batchMessages } from '../sync';

import * as rules from './transaction-rules';
import * as transfer from './transfer';

/**
 * Calculate base_amount from a foreign currency amount using the given rate.
 * This accounts for different decimal places between currencies.
 *
 * For example, converting 0.01 BTC (stored as 1,000,000 satoshis) to USD at rate 90722:
 * - BTC has 8 decimal places, USD has 2
 * - Result should be $907.22 (stored as 90722 cents)
 * - Formula: amount * rate / 10^(sourceDecimals - targetDecimals)
 */
function calculateBaseAmount(
  amount: number,
  rate: number,
  sourceCurrency: string,
  targetCurrency: string,
): number {
  const sourceDecimals = getCurrency(sourceCurrency).decimalPlaces;
  const targetDecimals = getCurrency(targetCurrency).decimalPlaces;
  const decimalDiff = sourceDecimals - targetDecimals;

  if (decimalDiff === 0) {
    return Math.round(amount * rate);
  }

  // Adjust for decimal place difference
  const scaleFactor = Math.pow(10, decimalDiff);
  return Math.round((amount * rate) / scaleFactor);
}

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

  // Get default currency for base_amount calculations (optional for backwards compatibility)
  const defaultCurrency = await db.first<{ value: string }>(
    'SELECT value FROM preferences WHERE id = ?',
    ['defaultCurrencyCode'],
  );

  // base_amount calculations are only needed if multi-currency is configured
  const baseCurrency = defaultCurrency?.value;

  // Build account currency map for efficient lookups
  const accountCurrencyMap = new Map<string, string | null>();
  for (const account of accounts) {
    accountCurrencyMap.set(
      account.id,
      account.currency_code || baseCurrency || null,
    );
  }

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
      addedIds = await Promise.all(
        added.map(async t => {
          // Offbudget account transactions and parent transactions should not have categories.
          const account = accounts.find(acct => acct.id === t.account);
          if (t.is_parent || account?.offbudget === 1) {
            t.category = null;
          }

          // Calculate base_amount for foreign currency transactions
          // Only if multi-currency is configured (baseCurrency is set)
          const accountCurrency = accountCurrencyMap.get(t.account);
          if (
            baseCurrency &&
            accountCurrency &&
            accountCurrency !== baseCurrency
          ) {
            try {
              const rate = await exchangeRateService.getRate(
                accountCurrency,
                baseCurrency,
                t.date,
              );
              if (rate !== null) {
                t.base_amount = calculateBaseAmount(
                  t.amount,
                  rate,
                  accountCurrency,
                  baseCurrency,
                );
              }
            } catch (error) {
              // If rate fetch fails, leave base_amount as null
              // Transaction will still be created, but won't contribute to base currency totals
              logger.warn(
                `Failed to fetch exchange rate for transaction ${t.id}:`,
                error,
              );
            }
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

          // Calculate base_amount for foreign currency transactions if amount or account changed
          // Only if multi-currency is configured (baseCurrency is set)
          if (
            baseCurrency &&
            (t.amount !== undefined || t.account !== undefined)
          ) {
            const accountCurrency = accountCurrencyMap.get(
              t.account || (await db.getTransaction(t.id))?.account,
            );
            if (accountCurrency && accountCurrency !== baseCurrency) {
              // Get the full transaction to access date and amount if not provided
              const fullTransaction =
                t.date && t.amount !== undefined
                  ? t
                  : await db.getTransaction(t.id);
              const transDate = t.date || fullTransaction?.date;
              const transAmount =
                t.amount !== undefined ? t.amount : fullTransaction?.amount;

              if (transDate && transAmount !== undefined) {
                try {
                  const rate = await exchangeRateService.getRate(
                    accountCurrency,
                    baseCurrency,
                    transDate,
                  );
                  if (rate !== null) {
                    t.base_amount = calculateBaseAmount(
                      transAmount,
                      rate,
                      accountCurrency,
                      baseCurrency,
                    );
                  }
                } catch (error) {
                  logger.warn(
                    `Failed to fetch exchange rate for transaction ${t.id}:`,
                    error,
                  );
                }
              }
            } else if (accountCurrency === baseCurrency) {
              // If transaction moved to base currency account, clear base_amount
              t.base_amount = null;
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
