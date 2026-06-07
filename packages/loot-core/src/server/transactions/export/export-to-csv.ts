// @ts-strict-ignore
import { stringify as csvStringify } from 'csv-stringify/sync';

import { aqlQuery } from '#server/aql';
import { q } from '#shared/query';
import { integerToAmount } from '#shared/util';

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

const csvStringifyOptions = {
  header: true,
  cast: {
    string: (value: string) =>
      FORMULA_TRIGGERS.test(value) ? "'" + value : value,
  },
};

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

  return csvStringify(transactionsForExport, csvStringifyOptions);
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
        { CategoryGroup: 'category.group.name' },
        { Category: 'category.name' },
        { Amount: 'amount' },
        { Cleared: 'cleared' },
        { Reconciled: 'reconciled' },
      ])
      .options({ splits: 'all' }),
  );

  // Build a payee map from parent transactions present in the result set.
  // When a category filter is active, parent transactions are not included
  // by the filter (parents have no category), so children may have null
  // payee even though their parent has one. For those cases, fetch the
  // missing parents in a separate query.
  const parentPayeeById = new Map(
    transactions
      .filter(t => t.IsParent && t.Payee)
      .map(t => [t.Id, t.Payee]),
  );

  const missingParentIds = [
    ...new Set(
      transactions
        .filter(t => t.IsChild && !t.Payee && !parentPayeeById.has(t.ParentId))
        .map(t => t.ParentId),
    ),
  ];

  if (missingParentIds.length > 0) {
    const { data: parents } = await aqlQuery(
      q('transactions')
        .filter({ id: { $oneof: missingParentIds } })
        .select([{ Id: 'id' }, { Payee: 'payee.name' }])
        .options({ splits: 'all' }),
    );
    for (const parent of parents) {
      if (parent.Payee) {
        parentPayeeById.set(parent.Id, parent.Payee);
      }
    }
  }

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
      Payee: trans.Payee ?? parentPayeeById.get(trans.ParentId) ?? null,
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
      Category_Group: trans.CategoryGroup,
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

  return csvStringify(transactionsForExport, csvStringifyOptions);
}
