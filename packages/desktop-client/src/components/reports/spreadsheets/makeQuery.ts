import { q } from 'loot-core/src/shared/query';
import { type CategoryEntity } from 'loot-core/src/types/models';

export function makeQuery(
  name: string,
  startDate: string,
  endDate: string,
  showOffBudgetHidden: boolean,
  selectedCategories: CategoryEntity[],
  categoryFilter: CategoryEntity[],
  conditionsOpKey: string,
  filters: unknown[],
) {
  const query = q('transactions')
    .filter(
      //Show Offbudget and hidden categories
      !showOffBudgetHidden && {
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
      [conditionsOpKey]: filters,
    })
    //Apply month range filters
    .filter({
      $and: [
        { date: { $transform: '$month', $gte: startDate } },
        { date: { $transform: '$month', $lte: endDate } },
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
