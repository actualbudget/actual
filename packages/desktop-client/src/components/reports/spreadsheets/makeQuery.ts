import { monthFromDate } from 'loot-core/shared/months';
import { q } from 'loot-core/src/shared/query';
import { type CategoryEntity } from 'loot-core/src/types/models';

export function makeQuery(
  name: string,
  startDate: string,
  endDate: string,
  interval: string,
  selectedCategories: CategoryEntity[],
  categoryFilter: CategoryEntity[],
  conditionsOpKey: string,
  filters: unknown[],
) {
  const intervalGroup =
    interval === 'Monthly' ? { $month: '$date' } : { $year: '$date' };
  const intervalFilter = interval === 'Monthly' ? '$month' : '$year';
  const dateStart =
    interval === 'Monthly' ? monthFromDate(startDate) : startDate;
  const dateEnd = interval === 'Monthly' ? monthFromDate(endDate) : endDate;
  const query = q('transactions')
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
        { date: { $transform: intervalFilter, $gte: dateStart } },
        { date: { $transform: intervalFilter, $lte: dateEnd } },
      ],
    })
    //Show assets or debts
    .filter(
      name === 'assets' ? { amount: { $gt: 0 } } : { amount: { $lt: 0 } },
    );

  return query
    .groupBy([
      intervalGroup,
      { $id: '$account' },
      { $id: '$payee' },
      { $id: '$category' },
      { $id: '$payee.transfer_acct.id' },
    ])
    .select([
      { date: intervalGroup },
      { category: { $id: '$category.id' } },
      { categoryHidden: { $id: '$category.hidden' } },
      { categoryGroup: { $id: '$category.group.id' } },
      { categoryGroupHidden: { $id: '$category.group.hidden' } },
      { account: { $id: '$account.id' } },
      { accountOffBudget: { $id: '$account.offbudget' } },
      { payee: { $id: '$payee.id' } },
      { transferAccount: { $id: '$payee.transfer_acct.id' } },
      { amount: { $sum: '$amount' } },
    ]);
}
