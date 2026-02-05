// @ts-strict-ignore
// This is a special usage of the API because this package is embedded
// into Actual itself. We only want to pull in the methods in that
// case and ignore everything else; otherwise we'd be pulling in the
// entire backend bundle from the API
import { send } from '@actual-app/api/injected';
import * as actual from '@actual-app/api/methods';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../platform/server/log';
import * as monthUtils from '../../shared/months';
import { q } from '../../shared/query';
import { groupBy, sortByKey } from '../../shared/util';
import {
  type RecurConfig,
  type RecurPattern,
  type RuleEntity,
  type TagEntity,
} from '../../types/models';
import { ruleModel } from '../transactions/transaction-rules';

import type {
  Budget,
  Payee,
  ScheduledSubtransaction,
  ScheduledTransaction,
  Subtransaction,
  Transaction,
} from './ynab5-types';

function amountFromYnab(amount: number) {
  // YNAB multiplies amount by 1000 and Actual by 100
  // so, this function divides by 10
  return Math.round(amount / 10);
}

function getDayOfMonth(date: string) {
  return monthUtils.parseDate(date).getDate();
}

function getYnabMonthlyPatterns(dateFirst: string): RecurPattern[] | undefined {
  if (getDayOfMonth(dateFirst) !== 31) {
    return undefined;
  }

  return [
    {
      type: 'day',
      value: -1,
    },
  ];
}

// Use Actual's "specific days" to avoid drifting every 15 days.
// This approximates YNAB's "second occurrence is 15 days after the chosen day"
// by locking to two day-of-month values.
function getYnabTwiceMonthlyPatterns(dateFirst: string): RecurPattern[] {
  const firstDay = getDayOfMonth(dateFirst);
  // Compute the second occurrence as 15 calendar days after the first.
  const secondDay = getDayOfMonth(monthUtils.addDays(dateFirst, 15));

  return [
    { type: 'day', value: firstDay === 31 ? -1 : firstDay },
    { type: 'day', value: secondDay === 31 ? -1 : secondDay },
  ];
}

function mapYnabFrequency(
  frequency: string,
  dateFirst: string,
): {
  frequency: RecurConfig['frequency'];
  interval?: number;
  patterns?: RecurPattern[];
} {
  switch (frequency) {
    case 'daily':
      return { frequency: 'daily' };
    case 'weekly':
      return { frequency: 'weekly' };
    case 'monthly':
      return {
        frequency: 'monthly',
        patterns: getYnabMonthlyPatterns(dateFirst),
      };
    case 'yearly':
      return { frequency: 'yearly' };
    case 'everyOtherWeek':
      return { frequency: 'weekly', interval: 2 };
    case 'every4Weeks':
      return { frequency: 'weekly', interval: 4 };
    case 'everyOtherMonth':
      return {
        frequency: 'monthly',
        interval: 2,
        patterns: getYnabMonthlyPatterns(dateFirst),
      };
    case 'every3Months':
      return {
        frequency: 'monthly',
        interval: 3,
        patterns: getYnabMonthlyPatterns(dateFirst),
      };
    case 'every4Months':
      return {
        frequency: 'monthly',
        interval: 4,
        patterns: getYnabMonthlyPatterns(dateFirst),
      };
    case 'everyOtherYear':
      return { frequency: 'yearly', interval: 2 };
    case 'twiceAMonth': {
      return {
        frequency: 'monthly',
        patterns: getYnabTwiceMonthlyPatterns(dateFirst),
      };
    }
    case 'twiceAYear': {
      return {
        frequency: 'monthly',
        interval: 6,
        patterns: getYnabMonthlyPatterns(dateFirst),
      };
    }
    default:
      throw new Error(`Unsupported scheduled frequency: ${frequency}`);
  }
}

function getScheduleDateValue(
  scheduled: ScheduledTransaction,
): RecurConfig | string {
  const dateFirst = scheduled.date_first;
  const frequency = scheduled.frequency;

  if (frequency === 'never') {
    return scheduled.date_next;
  }

  const mapped = mapYnabFrequency(frequency, dateFirst);
  return {
    frequency: mapped.frequency,
    interval: mapped.interval,
    patterns: mapped.patterns,
    skipWeekend: false,
    weekendSolveMode: 'after',
    endMode: 'never',
    start: dateFirst,
  };
}

function importAccounts(data: Budget, entityIdMap: Map<string, string>) {
  return Promise.all(
    data.accounts.map(async account => {
      if (!account.deleted) {
        const id = await actual.createAccount({
          name: account.name,
          offbudget: account.on_budget ? false : true,
          closed: account.closed,
        });
        entityIdMap.set(account.id, id);
      }
    }),
  );
}

async function importCategories(
  data: Budget,
  entityIdMap: Map<string, string>,
) {
  // Hidden categories are put in its own group by YNAB,
  // so it's already handled.

  const categories = await actual.getCategories();
  const incomeCatId = findIdByName(categories, 'Income');
  const ynabIncomeCategories = ['To be Budgeted', 'Inflow: Ready to Assign'];

  function checkSpecialCat(cat) {
    if (
      cat.category_group_id ===
      findIdByName(data.category_groups, 'Internal Master Category')
    ) {
      if (
        ynabIncomeCategories.some(ynabIncomeCategory =>
          equalsIgnoreCase(cat.name, ynabIncomeCategory),
        )
      ) {
        return 'income';
      } else {
        return 'internal';
      }
    } else if (
      cat.category_group_id ===
      findIdByName(data.category_groups, 'Credit Card Payments')
    ) {
      return 'creditCard';
    } else if (
      cat.category_group_id === findIdByName(data.category_groups, 'Income')
    ) {
      return 'income';
    }
  }
  // Can't be done in parallel to have
  // correct sort order.

  for (const group of data.category_groups) {
    if (!group.deleted) {
      let groupId;
      // Ignores internal category and credit cards
      if (
        !equalsIgnoreCase(group.name, 'Internal Master Category') &&
        !equalsIgnoreCase(group.name, 'Credit Card Payments') &&
        !equalsIgnoreCase(group.name, 'Hidden Categories') &&
        !equalsIgnoreCase(group.name, 'Income')
      ) {
        let run = true;
        const MAX_RETRY = 10;
        let count = 1;
        const origName = group.name;
        while (run) {
          try {
            groupId = await actual.createCategoryGroup({
              name: group.name,
              is_income: false,
              hidden: group.hidden,
            });
            entityIdMap.set(group.id, groupId);
            if (group.note) {
              send('notes-save', { id: groupId, note: group.note });
            }
            run = false;
          } catch (e) {
            group.name = origName + '-' + count.toString();
            count += 1;
            if (count >= MAX_RETRY) {
              run = false;
              throw Error(e.message);
            }
          }
        }
      }

      if (equalsIgnoreCase(group.name, 'Income')) {
        groupId = incomeCatId;
        entityIdMap.set(group.id, groupId);
      }

      const cats = data.categories.filter(
        cat => cat.category_group_id === group.id,
      );

      for (const cat of cats.reverse()) {
        if (!cat.deleted) {
          // Handles special categories. Starting balance is a payee
          // in YNAB so it's handled in importTransactions
          switch (checkSpecialCat(cat)) {
            case 'income': {
              // doesn't create new category, only assigns id
              const id = incomeCatId;
              entityIdMap.set(cat.id, id);
              break;
            }
            case 'creditCard': // ignores it
            case 'internal': // uncategorized is ignored too, handled by actual
              break;
            default: {
              let run = true;
              const MAX_RETRY = 10;
              let count = 1;
              const origName = cat.name;
              while (run) {
                try {
                  const id = await actual.createCategory({
                    name: cat.name,
                    group_id: groupId,
                    hidden: cat.hidden,
                  });
                  entityIdMap.set(cat.id, id);
                  if (cat.note) {
                    send('notes-save', { id, note: cat.note });
                  }
                  run = false;
                } catch (e) {
                  cat.name = origName + '-' + count.toString();
                  count += 1;
                  if (count >= MAX_RETRY) {
                    run = false;
                    throw Error(e.message);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

function importPayees(data: Budget, entityIdMap: Map<string, string>) {
  return Promise.all(
    data.payees.map(async payee => {
      if (!payee.deleted) {
        const id = await actual.createPayee({
          name: payee.name,
        });
        entityIdMap.set(payee.id, id);
      }
    }),
  );
}

async function importScheduledTransactions(
  data: Budget,
  entityIdMap: Map<string, string>,
) {
  const scheduledTransactions = data.scheduled_transactions;
  const scheduledSubtransactionsGrouped = groupBy(
    data.scheduled_subtransactions,
    'scheduled_transaction_id',
  );
  if (scheduledTransactions.length === 0) {
    return;
  }

  const payees = await actual.getPayees();
  const payeesByTransferAcct = payees
    .filter(payee => payee?.transfer_acct)
    .map(payee => [payee.transfer_acct, payee] as [string, Payee]);
  const payeeTransferAcctHashMap = new Map<string, Payee>(payeesByTransferAcct);
  const scheduleCategoryMap = new Map<string, string>();
  const scheduleSplitsMap = new Map<string, ScheduledSubtransaction[]>();
  const schedulePayeeMap = new Map<string, string>();

  async function createScheduleWithUniqueName(params: {
    name: string;
    posts_transaction: boolean;
    payee: string;
    account: string;
    amount: number;
    amountOp: 'is';
    date: RecurConfig | string;
  }) {
    const baseName = params.name;
    const MAX_RETRY = 50;
    let count = 1;

    while (true) {
      try {
        return await actual.createSchedule({ ...params, name: params.name });
      } catch (e) {
        if (count >= MAX_RETRY) {
          throw Error(e.message);
        }
        params.name = `${baseName} (${count})`;
        count += 1;
      }
    }
  }

  async function getRuleForSchedule(
    scheduleId: string,
  ): Promise<RuleEntity | null> {
    const { data: ruleId } = (await actual.aqlQuery(
      q('schedules').filter({ id: scheduleId }).calculate('rule'),
    )) as { data: string | null };
    if (!ruleId) {
      return null;
    }

    const { data: ruleData } = (await actual.aqlQuery(
      q('rules').filter({ id: ruleId }).select('*'),
    )) as { data: Array<Record<string, unknown>> };
    const ruleRow = ruleData?.[0];
    if (!ruleRow) {
      return null;
    }

    return ruleModel.toJS(ruleRow);
  }

  for (const scheduled of scheduledTransactions) {
    if (scheduled.deleted) {
      continue;
    }

    const mappedAccountId = entityIdMap.get(scheduled.account_id);
    if (!mappedAccountId) {
      continue;
    }

    const scheduleDate = getScheduleDateValue(scheduled);

    let mappedPayeeId: string | undefined;
    if (scheduled.transfer_account_id) {
      const mappedTransferAccountId = entityIdMap.get(
        scheduled.transfer_account_id,
      );
      mappedPayeeId = mappedTransferAccountId
        ? payeeTransferAcctHashMap.get(mappedTransferAccountId)?.id
        : undefined;
    } else if (scheduled.payee_id) {
      mappedPayeeId = entityIdMap.get(scheduled.payee_id);
    }

    if (!mappedPayeeId) {
      continue;
    }

    const scheduleId = await createScheduleWithUniqueName({
      name: scheduled.memo,
      posts_transaction: false,
      payee: mappedPayeeId,
      account: mappedAccountId,
      amount: amountFromYnab(scheduled.amount),
      amountOp: 'is',
      date: scheduleDate,
    });
    schedulePayeeMap.set(scheduleId, mappedPayeeId);

    const scheduleNotes = buildTransactionNotes(scheduled);
    if (scheduleNotes) {
      const rule = await getRuleForSchedule(scheduleId);
      if (rule) {
        const actions = rule.actions ? [...rule.actions] : [];
        actions.push({
          op: 'set',
          field: 'notes',
          value: scheduleNotes,
        });

        await actual.updateRule(buildRuleUpdate(rule, actions));
      }
    }

    const scheduledSubtransactions =
      scheduledSubtransactionsGrouped
        .get(scheduled.id)
        ?.filter(subtransaction => !subtransaction.deleted) || [];

    if (scheduledSubtransactions.length > 0) {
      scheduleSplitsMap.set(scheduleId, scheduledSubtransactions);
    } else if (!scheduled.transfer_account_id && scheduled.category_id) {
      const mappedCategoryId = entityIdMap.get(scheduled.category_id);
      if (mappedCategoryId) {
        scheduleCategoryMap.set(scheduleId, mappedCategoryId);
      }
    }
  }

  if (scheduleCategoryMap.size > 0 || scheduleSplitsMap.size > 0) {
    for (const [scheduleId, categoryId] of scheduleCategoryMap.entries()) {
      const rule = await getRuleForSchedule(scheduleId);
      if (!rule) {
        continue;
      }

      const actions = rule.actions ? [...rule.actions] : [];
      actions.push({
        op: 'set',
        field: 'category',
        value: categoryId,
      });

      await actual.updateRule(buildRuleUpdate(rule, actions));
    }

    for (const [scheduleId, subtransactions] of scheduleSplitsMap.entries()) {
      const rule = await getRuleForSchedule(scheduleId);
      if (!rule) {
        continue;
      }

      const actions = rule.actions ? [...rule.actions] : [];
      const parentPayeeId = schedulePayeeMap.get(scheduleId);

      subtransactions.forEach((subtransaction, index) => {
        const splitIndex = index + 1;

        actions.push({
          op: 'set-split-amount',
          value: amountFromYnab(subtransaction.amount),
          options: { splitIndex, method: 'fixed-amount' },
        });

        if (subtransaction.memo) {
          actions.push({
            op: 'set',
            field: 'notes',
            value: subtransaction.memo,
            options: { splitIndex },
          });
        }

        if (subtransaction.transfer_account_id) {
          const mappedTransferAccountId = entityIdMap.get(
            subtransaction.transfer_account_id,
          );
          const transferPayeeId = mappedTransferAccountId
            ? payeeTransferAcctHashMap.get(mappedTransferAccountId)?.id
            : undefined;
          if (transferPayeeId) {
            actions.push({
              op: 'set',
              field: 'payee',
              value: transferPayeeId,
              options: { splitIndex },
            });
          }
        } else if (subtransaction.payee_id) {
          const mappedPayeeId = entityIdMap.get(subtransaction.payee_id);
          if (mappedPayeeId) {
            actions.push({
              op: 'set',
              field: 'payee',
              value: mappedPayeeId,
              options: { splitIndex },
            });
          }
        } else if (parentPayeeId) {
          actions.push({
            op: 'set',
            field: 'payee',
            value: parentPayeeId,
            options: { splitIndex },
          });
        }

        if (!subtransaction.transfer_account_id && subtransaction.category_id) {
          const mappedCategoryId = entityIdMap.get(subtransaction.category_id);
          if (mappedCategoryId) {
            actions.push({
              op: 'set',
              field: 'category',
              value: mappedCategoryId,
              options: { splitIndex },
            });
          }
        }
      });

      await actual.updateRule(buildRuleUpdate(rule, actions));
    }
  }
}

async function importTransactions(
  data: Budget,
  entityIdMap: Map<string, string>,
) {
  const payees = await actual.getPayees();
  const categories = await actual.getCategories();
  const incomeCatId = findIdByName(categories, 'Income');
  const startingBalanceCatId = findIdByName(categories, 'Starting Balances'); //better way to do it?

  const startingPayeeYNAB = findIdByName(data.payees, 'Starting Balance');

  const transactionsGrouped = groupBy(data.transactions, 'account_id');
  const subtransactionsGrouped = groupBy(
    data.subtransactions,
    'transaction_id',
  );

  const payeesByTransferAcct = payees
    .filter(payee => payee?.transfer_acct)
    .map(payee => [payee.transfer_acct, payee] as [string, Payee]);
  const payeeTransferAcctHashMap = new Map<string, Payee>(payeesByTransferAcct);
  const orphanTransferMap = new Map<string, Transaction[]>();
  const orphanSubtransfer = [] as Subtransaction[];
  const orphanSubtransferTrxId = [] as string[];
  const orphanSubtransferAcctIdByTrxIdMap = new Map<string, string>();
  const orphanSubtransferDateByTrxIdMap = new Map<string, string>();

  // Go ahead and generate ids for all of the transactions so we can
  // reliably resolve transfers
  // Also identify orphan transfer transactions and subtransactions.
  for (const transaction of data.subtransactions) {
    entityIdMap.set(transaction.id, uuidv4());

    if (transaction.transfer_account_id) {
      orphanSubtransfer.push(transaction);
      orphanSubtransferTrxId.push(transaction.transaction_id);
    }
  }

  for (const transaction of data.transactions) {
    entityIdMap.set(transaction.id, uuidv4());

    if (
      transaction.transfer_account_id &&
      !transaction.transfer_transaction_id
    ) {
      const key =
        transaction.account_id + '#' + transaction.transfer_account_id;
      if (!orphanTransferMap.has(key)) {
        orphanTransferMap.set(key, [transaction]);
      } else {
        orphanTransferMap.get(key).push(transaction);
      }
    }

    if (orphanSubtransferTrxId.includes(transaction.id)) {
      orphanSubtransferAcctIdByTrxIdMap.set(
        transaction.id,
        transaction.account_id,
      );
      orphanSubtransferDateByTrxIdMap.set(transaction.id, transaction.date);
    }
  }

  // Compute link between subtransaction transfers and orphaned transaction
  // transfers. The goal is to match each transfer subtransaction to the related
  // transfer transaction according to the accounts, date, amount and memo.
  const orphanSubtransferMap = orphanSubtransfer.reduce(
    (map, subtransaction) => {
      const key =
        subtransaction.transfer_account_id +
        '#' +
        orphanSubtransferAcctIdByTrxIdMap.get(subtransaction.transaction_id);
      if (!map.has(key)) {
        map.set(key, [subtransaction]);
      } else {
        map.get(key).push(subtransaction);
      }
      return map;
    },
    new Map<string, Subtransaction[]>(),
  );

  // The comparator will be used to order transfer transactions and their
  // corresponding tranfer subtransaction in two aligned list. Hopefully
  // for every list index in the transactions list, the related subtransaction
  // will be at the same index.
  const orphanTransferComparator = (
    a: Transaction | Subtransaction,
    b: Transaction | Subtransaction,
  ) => {
    // a and b can be a Transaction (having a date attribute) or a
    // Subtransaction (missing that date attribute)

    const date_a =
      'date' in a
        ? a.date
        : orphanSubtransferDateByTrxIdMap.get(a.transaction_id);
    const date_b =
      'date' in b
        ? b.date
        : orphanSubtransferDateByTrxIdMap.get(b.transaction_id);
    // A transaction and the related subtransaction have inverted amounts.
    // To have those in the same order, the subtransaction has to be reversed
    // to have the same amount.
    const amount_a = 'date' in a ? a.amount : -a.amount;
    const amount_b = 'date' in b ? b.amount : -b.amount;

    // Transaction are ordered first by date, then by amount, and lastly by memo
    if (date_a > date_b) return 1;
    if (date_a < date_b) return -1;
    if (amount_a > amount_b) return 1;
    if (amount_a < amount_b) return -1;
    if (a.memo > b.memo) return 1;
    if (a.memo < b.memo) return -1;
    return 0;
  };

  const orphanTrxIdSubtrxIdMap = new Map<string, string>();
  orphanTransferMap.forEach((transactions, key) => {
    const subtransactions = orphanSubtransferMap.get(key);
    if (subtransactions) {
      transactions.sort(orphanTransferComparator);
      subtransactions.sort(orphanTransferComparator);

      // Iterate on the two sorted lists transactions and subtransactions and
      // find matching data to identify the related transaction ids.
      let transactionIdx = 0;
      let subtransactionIdx = 0;
      do {
        switch (
          orphanTransferComparator(
            transactions[transactionIdx],
            subtransactions[subtransactionIdx],
          )
        ) {
          case 0:
            // The current list indexes are matching: the transaction and
            // subtransaction are related (same date, amount and memo)
            orphanTrxIdSubtrxIdMap.set(
              transactions[transactionIdx].id,
              entityIdMap.get(subtransactions[subtransactionIdx].id),
            );
            orphanTrxIdSubtrxIdMap.set(
              subtransactions[subtransactionIdx].id,
              entityIdMap.get(transactions[transactionIdx].id),
            );
            transactionIdx++;
            subtransactionIdx++;
            break;
          case -1:
            // The current list indexes are not matching:
            // The current transaction is "smaller" than the current subtransaction
            // (earlier date, smaller amount, memo value sorted before)
            // So we advance to the next transaction and see if it match with
            // the current subtransaction
            transactionIdx++;
            break;
          case 1:
            // Inverse of the previous case:
            // The current subtransaction is "smaller" than the current transaction
            // So we advance to the next subtransaction
            subtransactionIdx++;
            break;
          default:
            throw new Error(`Unrecognized orphan transfer comparator result`);
        }
      } while (
        transactionIdx < transactions.length &&
        subtransactionIdx < subtransactions.length
      );
    }
  });

  await Promise.all(
    [...transactionsGrouped.keys()].map(async accountId => {
      const transactions = transactionsGrouped.get(accountId);

      const toImport = transactions
        .map(transaction => {
          if (transaction.deleted) {
            return null;
          }

          const subtransactions = subtransactionsGrouped.get(transaction.id);

          // Add transaction
          const newTransaction = {
            id: entityIdMap.get(transaction.id),
            account: entityIdMap.get(transaction.account_id),
            date: transaction.date,
            amount: amountFromYnab(transaction.amount),
            category: entityIdMap.get(transaction.category_id) || null,
            cleared: ['cleared', 'reconciled'].includes(transaction.cleared),
            reconciled: transaction.cleared === 'reconciled',
            notes: buildTransactionNotes(transaction),
            imported_id: transaction.import_id || null,
            transfer_id:
              entityIdMap.get(transaction.transfer_transaction_id) ||
              orphanTrxIdSubtrxIdMap.get(transaction.id) ||
              null,
            subtransactions: subtransactions
              ? subtransactions.map(subtrans => {
                  return {
                    id: entityIdMap.get(subtrans.id),
                    amount: amountFromYnab(subtrans.amount),
                    category: entityIdMap.get(subtrans.category_id) || null,
                    notes: subtrans.memo,
                    transfer_id:
                      orphanTrxIdSubtrxIdMap.get(subtrans.id) || null,
                    payee: null,
                    imported_payee: null,
                  };
                })
              : null,
            payee: null,
            imported_payee: null,
          };

          // Handle transactions and subtransactions payee
          function transactionPayeeUpdate(
            trx: Transaction | Subtransaction,
            newTrx,
            fallbackPayeeId?: string | null,
          ) {
            if (trx.transfer_account_id) {
              const mappedTransferAccountId = entityIdMap.get(
                trx.transfer_account_id,
              );
              newTrx.payee = payeeTransferAcctHashMap.get(
                mappedTransferAccountId,
              )?.id;
            } else if (trx.payee_id) {
              newTrx.payee = entityIdMap.get(trx.payee_id);
              newTrx.imported_payee = data.payees.find(
                p => !p.deleted && p.id === trx.payee_id,
              )?.name;
            } else if (fallbackPayeeId) {
              newTrx.payee = fallbackPayeeId;
            }
          }

          transactionPayeeUpdate(transaction, newTransaction);
          if (newTransaction.subtransactions) {
            subtransactions.forEach(subtrans => {
              const newSubtransaction = newTransaction.subtransactions.find(
                newSubtrans => newSubtrans.id === entityIdMap.get(subtrans.id),
              );
              transactionPayeeUpdate(
                subtrans,
                newSubtransaction,
                newTransaction.payee,
              );
            });
          }

          // Handle starting balances
          if (
            transaction.payee_id === startingPayeeYNAB &&
            entityIdMap.get(transaction.category_id) === incomeCatId
          ) {
            newTransaction.category = startingBalanceCatId;
            newTransaction.payee = null;
          }
          return newTransaction;
        })
        .filter(x => x);

      await actual.addTransactions(entityIdMap.get(accountId), toImport, {
        learnCategories: true,
      });
    }),
  );
}

async function importBudgets(data: Budget, entityIdMap: Map<string, string>) {
  // There should be info in the docs to deal with
  // no credit card category and how YNAB and Actual
  // handle differently the amount To be Budgeted
  // i.e. Actual considers the cc debt while YNAB doesn't
  //
  // Also, there could be a way to set rollover using
  // Deferred Income Subcat and Immediate Income Subcat

  const budgets = sortByKey(data.months, 'month');

  const internalCatIdYnab = findIdByName(
    data.category_groups,
    'Internal Master Category',
  );
  const creditcardCatIdYnab = findIdByName(
    data.category_groups,
    'Credit Card Payments',
  );

  await actual.batchBudgetUpdates(async () => {
    for (const budget of budgets) {
      const month = monthUtils.monthFromDate(budget.month);

      await Promise.all(
        budget.categories.map(async catBudget => {
          const catId = entityIdMap.get(catBudget.id);
          const amount = Math.round(catBudget.budgeted / 10);

          if (
            !catId ||
            catBudget.category_group_id === internalCatIdYnab ||
            catBudget.category_group_id === creditcardCatIdYnab
          ) {
            return;
          }

          await actual.setBudgetAmount(month, catId, amount);
        }),
      );
    }
  });
}

// Utils

export async function doImport(data: Budget) {
  const entityIdMap = new Map<string, string>();

  logger.log('Importing Accounts...');
  await importAccounts(data, entityIdMap);

  logger.log('Importing Categories...');
  await importCategories(data, entityIdMap);

  logger.log('Importing Payees...');
  await importPayees(data, entityIdMap);

  logger.log('Importing Tags...');
  await importYnabFlagTags(data);

  logger.log('Importing Transactions...');
  await importTransactions(data, entityIdMap);

  logger.log('Importing Scheduled Transactions...');
  await importScheduledTransactions(data, entityIdMap);

  logger.log('Importing Budgets...');
  await importBudgets(data, entityIdMap);

  logger.log('Setting up...');
}

export function parseFile(buffer: Buffer): Budget {
  let data = JSON.parse(buffer.toString());
  if (data.data) {
    data = data.data;
  }
  if (data.budget) {
    data = data.budget;
  }

  return data;
}

export function getBudgetName(_filepath: string, data: Budget) {
  return data.budget_name || data.name;
}

function equalsIgnoreCase(stringa: string, stringb: string): boolean {
  return (
    stringa.localeCompare(stringb, undefined, {
      sensitivity: 'base',
    }) === 0
  );
}

function findByNameIgnoreCase<T extends { name: string }>(
  categories: T[],
  name: string,
) {
  return categories.find(cat => equalsIgnoreCase(cat.name, name));
}

function findIdByName<T extends { id: string; name: string }>(
  categories: Array<T>,
  name: string,
) {
  return findByNameIgnoreCase<T>(categories, name)?.id;
}

function buildTransactionNotes(
  transaction: Transaction | ScheduledTransaction,
) {
  const normalizedMemo = transaction.memo?.trim() ?? '';
  const normalizedFlag = getFlagTagName(transaction) ?? '';
  const notes = `${normalizedMemo} ${
    normalizedFlag ? `#${normalizedFlag}` : ''
  }`.trim();
  return notes.length > 0 ? notes : null;
}

function buildRuleUpdate(
  rule: RuleEntity,
  actions: RuleEntity['actions'],
): RuleEntity {
  return {
    id: rule.id,
    stage: rule.stage ?? null,
    conditionsOp: rule.conditionsOp ?? 'and',
    conditions: rule.conditions,
    actions,
  };
}

type FlaggedTransaction = Pick<
  Transaction | ScheduledTransaction,
  'flag_name' | 'flag_color' | 'deleted'
>;

function getFlagTagName(transaction: FlaggedTransaction) {
  const normalizedFlag =
    transaction.flag_name?.trim() ?? transaction.flag_color?.trim() ?? '';
  return normalizedFlag.length > 0 ? normalizedFlag : null;
}

async function importYnabFlagTags(data: Budget) {
  const tagsByName = new Map<string, string>();
  const flaggedTransactions: FlaggedTransaction[] = [
    ...data.transactions,
    ...data.scheduled_transactions,
  ];

  // const flagColorMap = {
  //   red: '#F44336',
  //   orange: '#FB8C00',
  //   yellow: '#FDD835',
  //   green: '#43A047',
  //   blue: '#1E88E5',
  //   purple: '#8E24AA',
  // }

  // const ynabColorMap = {
  //   red: 'rgb(255, 69, 58)',
  //   orange: 'rgb(255, 159, 10)',
  //   yellow: 'rgb(255, 214, 10)',
  //   green: 'rgb(50, 215, 75)',
  //   blue: 'rgb(100, 210, 255)',
  //   purple: 'rgb(191, 90, 242)',
  // };

  for (const transaction of flaggedTransactions) {
    if (transaction.deleted) {
      continue;
    }

    const tagName = getFlagTagName(transaction);
    const tagColor = transaction.flag_color;
    if (!tagName || !tagColor) {
      continue;
    }

    if (!tagsByName.has(tagName)) {
      tagsByName.set(tagName, tagColor);
    }
  }

  if (tagsByName.size === 0) {
    return;
  }

  const existingTags = (await send('tags-get')) as TagEntity[];
  const existingTagsByName = new Map(existingTags.map(tag => [tag.tag, tag]));

  await Promise.all(
    [...tagsByName.entries()].map(async ([tag, color]) => {
      const existingTag = existingTagsByName.get(tag);
      if (existingTag?.color) {
        return;
      }

      await send('tags-create', {
        tag,
        color,
        description: 'Imported from YNAB',
      });
    }),
  );
}
