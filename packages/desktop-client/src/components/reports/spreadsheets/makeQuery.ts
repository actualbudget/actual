import q from 'loot-core/src/client/query-helpers';
import { type CategoryEntity } from 'loot-core/src/types/models';

function makeQuery(
  name: string,
  start: string,
  end: string,
  hidden: boolean,
  selectedCategories: CategoryEntity[],
  categoryFilter: CategoryEntity[],
  conditionsOpKey: string,
  filters: unknown[],
) {
  let query = q('transactions')
    .filter(
      //Show Offbudget and hidden categories
      !hidden && {
        $and: [
          {
            'account.offbudget': false,
            $or: [
              {
                'category.hidden': false,
                category: null,
              },
            ],
          },
        ],
        $or: [
          {
            'payee.transfer_acct.offbudget': true,
            'payee.transfer_acct': null,
          },
        ],
      },
    )
    //Apply Category_Selector
    .filter(
      selectedCategories && {
        $or: [
          {
            category: null,
            $or: categoryFilter.map(category => ({
              category: category.id,
            })),
          },
        ],
      },
    )
    //Apply filters and split by "Group By"
    .filter({
      [conditionsOpKey]: [...filters],
    })
    //Apply month range filters
    .filter({
      $and: [
        { date: { $transform: '$month', $gte: start } },
        { date: { $transform: '$month', $lte: end } },
      ],
    })
    //Show assets or debts
    .filter(
      name === 'assets' ? { amount: { $gt: 0 } } : { amount: { $lt: 0 } },
    );

  return query
    .groupBy([
      { $month: '$date' },
      { $id: '$account' },
      { $id: '$payee' },
      { $id: '$category' },
      { $id: '$payee.transfer_acct.id' },
    ])
    .select([
      { date: { $month: '$date' } },
      { category: { $id: '$category.id' } },
      { categoryGroup: { $id: '$category.group.id' } },
      { account: { $id: '$account.id' } },
      { accountOffBudget: { $id: '$account.offbudget' } },
      { payee: { $id: '$payee.id' } },
      { transferAccount: { $id: '$payee.transfer_acct.id' } },
      { amount: { $sum: '$amount' } },
    ]);
}

export default makeQuery;
