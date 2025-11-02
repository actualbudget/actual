import { q, Query } from 'loot-core/shared/query';

import { ReportOptions } from '@desktop-client/components/reports/ReportOptions';

function filteredQuery(
  name: string,
  startDate: string,
  endDate: string,
  interval: string,
  conditionsOpKey: string,
  filters: unknown[],
  excludedTransactions: string[] = []
) {
  const intervalFilter =
    interval === 'Weekly'
      ? '$day'
      : '$' + ReportOptions.intervalMap.get(interval)?.toLowerCase() || 'month';

  const query = q('transactions')
    //Apply filters and split by "Group By"
    .filter({
      [conditionsOpKey]: filters,
    })
    //Apply month range filters
    .filter({
      $and: [
        { date: { $transform: intervalFilter, $gte: startDate } },
        { date: { $transform: intervalFilter, $lte: endDate } },
        { id: { $notoneof: excludedTransactions } },
      ],
    })
    //Show assets or debts
    .filter(
      name === 'assets' ? { amount: { $gt: 0 } } : { amount: { $lt: 0 } },
    );

  return query;
}

export function makeGroupedSplitsQuery (
  name: string,
  startDate: string,
  endDate: string,
  interval: string,
  conditionsOpKey: string,
  filters: unknown[],
) {
  return filteredQuery(name, startDate, endDate, interval, conditionsOpKey, filters)
    .options({ splits: 'grouped' })
    .select([{ isParent: 'is_parent' }, { isChild: 'is_child' }]);
}

export function makeQuery(
  name: string,
  startDate: string,
  endDate: string,
  interval: string,
  conditionsOpKey: string,
  filters: unknown[],
  excludedTransactions: string[] = []
) {
  let query = filteredQuery(name, startDate, endDate, interval, conditionsOpKey, filters, excludedTransactions);

  const intervalGroup =
    interval === 'Monthly'
      ? { $month: '$date' }
      : interval === 'Yearly'
        ? { $year: '$date' }
        : { $day: '$date' };

  return query.groupBy([
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
    { categoryIncome: { $id: '$category.is_income' } },
    { categoryGroup: { $id: '$category.group.id' } },
    { categoryGroupHidden: { $id: '$category.group.hidden' } },
    { account: { $id: '$account.id' } },
    { accountOffBudget: { $id: '$account.offbudget' } },
    { payee: { $id: '$payee.id' } },
    { transferAccount: { $id: '$payee.transfer_acct.id' } },
    { amount: { $sum: '$amount' } },
  ]);
}
