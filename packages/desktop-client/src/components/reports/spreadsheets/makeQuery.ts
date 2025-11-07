import { q, } from 'loot-core/shared/query';

import { GroupedQueryDataEntity, QueryDataEntity, ReportOptions } from '@desktop-client/components/reports/ReportOptions';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

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

function makeGroupedQuery (
  name: string,
  startDate: string,
  endDate: string,
  interval: string,
  conditionsOpKey: string,
  filters: unknown[],
) {
  return filteredQuery(name,
    startDate,
    endDate,
    interval,
    conditionsOpKey,
    filters
  )
    .options({ splits: 'grouped' })
    .select([{ isParent: 'is_parent' }, { isChild: 'is_child' }]);
}

function makeQuery(
  name: string,
  startDate: string,
  endDate: string,
  interval: string,
  conditionsOpKey: string,
  filters: unknown[],
  excludedTransactions: string[] = []
) {
  let query =
    filteredQuery(name,
      startDate,
      endDate,
      interval,
      conditionsOpKey,
      filters,
      excludedTransactions
    )
      .options({ splits: 'all' });

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

export const aggregatedAssetsDebts = async (
    startDate: string,
    endDate: string,
    interval: string,
    conditionsOpKey: "$or" | "$and",
    filters: unknown[]
): Promise<{assets: QueryDataEntity[], debts: QueryDataEntity[]}> => {
  const [groupedAssets, groupedDebts]: [GroupedQueryDataEntity[], GroupedQueryDataEntity[]] =
    await Promise.all([
      aqlQuery(
        makeGroupedQuery(
          'assets',
          startDate,
          endDate,
          interval,
          conditionsOpKey,
          filters
        ),
      ).then(({ data }) => data),
      aqlQuery(
        makeGroupedQuery(
          'debts',
          startDate,
          endDate,
          interval,
          conditionsOpKey,
          filters,
        ),
      ).then(({ data }) => data),
    ]);

    // Exclude parent if any child transaction matches.
    // Don't need to exclude children that doesn't match,
    // since they won't be included in the main query.
    const excludedDebts = groupedDebts
      .filter(debt => debt.subtransactions.some(sub => !sub._unmatched))
      .map(debt => debt.id);

    const excludedAssets = groupedAssets
      .filter(asset => asset.subtransactions.some(sub => !sub._unmatched))
      .map(asset => asset.id);

    const [assets, debts]: [QueryDataEntity[], QueryDataEntity[]] = await Promise.all([
      aqlQuery(
        makeQuery(
          'assets',
          startDate,
          endDate,
          interval,
          conditionsOpKey,
          filters,
          excludedDebts
        ),
      ).then(({ data }) => data),
      aqlQuery(
        makeQuery(
          'debts',
          startDate,
          endDate,
          interval,
          conditionsOpKey,
          filters,
          excludedAssets
        ),
      ).then(({ data }) => data),
    ]);

    return {assets, debts}
}
