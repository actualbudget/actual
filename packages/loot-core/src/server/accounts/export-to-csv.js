import csvStringify from 'csv-stringify/lib/sync';

import { integerToAmount } from '../../shared/util';
import { runQuery as aqlQuery } from '../aql';

export async function exportToCSV(
  transactions,
  accounts,
  categoryGroups,
  payees
) {
  const accountNamesById = accounts.reduce((reduced, { id, name }) => {
    reduced[id] = name;
    return reduced;
  }, {});

  const categoryNamesById = categoryGroups.reduce(
    (reduced, { name, categories: subCategories }) => {
      subCategories.forEach(
        subCategory =>
          (reduced[subCategory.id] = `${name}: ${subCategory.name}`)
      );
      return reduced;
    },
    {}
  );

  const payeeNamesById = payees.reduce((reduced, { id, name }) => {
    reduced[id] = name;
    return reduced;
  }, {});

  const transactionsForExport = transactions.map(
    ({ account, date, payee, notes, category, amount }) => ({
      Account: accountNamesById[account],
      Date: date,
      Payee: payeeNamesById[payee],
      Notes: notes,
      Category: categoryNamesById[category],
      Amount: amount == null ? 0 : integerToAmount(amount)
    })
  );

  return csvStringify(transactionsForExport, { header: true });
}

export async function exportQueryToCSV(query) {
  let { data: transactions } = await aqlQuery(
    query
      .select([
        { Id: 'id' },
        { Account: 'account.name' },
        { Date: 'date' },
        { Payee: 'payee.name' },
        { ParentId: 'parent_id' },
        { IsParent: 'is_parent' },
        { Notes: 'notes' },
        { Category: 'category.name' },
        { Amount: 'amount' }
      ])
      .options({ splits: 'all' })
  );

  let parentsPayees = new Map();
  for (let trans of transactions) {
    if (trans.IsParent) {
      parentsPayees.set(trans.Id, trans.Payee);
    }
  }

  // filter out any parent transactions
  let noParents = transactions.filter(t => !t.IsParent);

  // map final properties for export and grab the payee for splits from their parent transaction
  let transactionsForExport = noParents.map(trans => {
    return {
      Account: trans.Account,
      Date: trans.Date,
      Payee: trans.ParentId ? parentsPayees.get(trans.ParentId) : trans.Payee,
      Notes: trans.Notes,
      Category: trans.Category,
      Amount: trans.Amount == null ? 0 : integerToAmount(trans.Amount)
    };
  });

  return csvStringify(transactionsForExport, { header: true });
}
