// @ts-strict-ignore
import csvStringify from 'csv-stringify/lib/sync';

import { integerToAmount } from '../../../shared/util';
import { runQuery as aqlQuery } from '../../aql';

export async function exportToCSV(
  transactions,
  accounts,
  categoryGroups,
  payees,
) {
  const accountNamesById = accounts.reduce((reduced, { id, name }) => {
    reduced[id] = name;
    return reduced;
  }, {});

  const categoryNamesById = categoryGroups.reduce(
    (reduced, { name, categories: subCategories }) => {
      subCategories.forEach(
        subCategory =>
          (reduced[subCategory.id] = `${name}: ${subCategory.name}`),
      );
      return reduced;
    },
    {},
  );

  const payeeNamesById = payees.reduce((reduced, { id, name }) => {
    reduced[id] = name;
    return reduced;
  }, {});

  const transactionsForExport = transactions.map(
    ({
      account,
      date,
      payee,
      notes,
      category,
      amount,
      cleared,
      reconciled,
    }) => ({
      Account: accountNamesById[account],
      Date: date,
      Payee: payeeNamesById[payee],
      Notes: notes,
      Category: categoryNamesById[category],
      Amount: amount == null ? 0 : integerToAmount(amount),
      Cleared: cleared,
      Reconciled: reconciled,
    }),
  );

  return csvStringify(transactionsForExport, { header: true });
}

export async function exportQueryToCSV(query) {
  const { data: transactions } = await aqlQuery(
    query
      .select([
        { Id: 'id' },
        { Account: 'account.name' },
        { Date: 'date' },
        { Payee: 'payee.name' },
        { ParentId: 'parent_id' },
        { IsParent: 'is_parent' },
        { IsChild: 'is_child' },
        { SortOrder: 'sort_order' },
        { Notes: 'notes' },
        { Category: 'category.name' },
        { Amount: 'amount' },
        { Cleared: 'cleared' },
        { Reconciled: 'reconciled' },
      ])
      .options({ splits: 'all' }),
  );

  // initialize a map to allow splits to have correct number of split from
  const parentsChildCount: Map<number, number> = new Map();
  const childSplitOrder: Map<number, number> = new Map();

  // find children, their order, and total # siblings
  for (const trans of transactions) {
    if (trans.IsChild) {
      let childNumber = parentsChildCount.get(trans.ParentId) || 0;
      childNumber++;
      childSplitOrder.set(trans.Id, childNumber);
      parentsChildCount.set(trans.ParentId, childNumber);
    }
  }

  // map final properties for export and grab the child count for splits from their parent transaction
  const transactionsForExport = transactions.map(trans => {
    return {
      Account: trans.Account,
      Date: trans.Date,
      Payee: trans.Payee,
      Notes: trans.IsParent
        ? '(SPLIT INTO ' +
          parentsChildCount.get(trans.Id) +
          ') ' +
          (trans.Notes || '')
        : trans.IsChild
          ? '(SPLIT ' +
            childSplitOrder.get(trans.Id) +
            ' OF ' +
            parentsChildCount.get(trans.ParentId) +
            ') ' +
            (trans.Notes || '')
          : trans.Notes,
      Category: trans.Category,
      Amount: trans.IsParent
        ? 0
        : trans.Amount == null
          ? 0
          : integerToAmount(trans.Amount),
      Split_Amount: trans.IsParent ? integerToAmount(trans.Amount) : 0,
      Cleared:
        trans.Reconciled === true
          ? 'Reconciled'
          : trans.Cleared === true
            ? 'Cleared'
            : 'Not cleared',
    };
  });

  return csvStringify(transactionsForExport, { header: true });
}
