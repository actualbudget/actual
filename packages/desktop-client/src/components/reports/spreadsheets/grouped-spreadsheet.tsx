import q, { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToAmount } from 'loot-core/src/shared/util';

import recalculate from './recalculate';

function createSpreadsheet(
  start,
  end,
  categories,
  selectedCategories,
  conditions = [],
  conditionsOp,
  hidden,
  uncat,
) {
  let uncatCat = {
    name: 'Uncategorized',
    id: null,
    uncat_id: '1',
    hidden: 0,
    offBudget: false,
  };
  let uncatTransfer = {
    name: 'Transfers',
    id: null,
    uncat_id: '2',
    hidden: 0,
    transfer: false,
  };
  let uncatOff = {
    name: 'OffBudget',
    id: null,
    uncat_id: '3',
    hidden: 0,
    offBudget: true,
  };

  let uncatGroup = {
    name: 'Uncategorized',
    id: null,
    hidden: 0,
    categories: [uncatCat, uncatTransfer, uncatOff],
  };
  let catList = uncat
    ? [...categories.list, uncatCat, uncatTransfer, uncatOff]
    : categories.list;
  let catGroup = uncat
    ? [...categories.grouped, uncatGroup]
    : categories.grouped;

  let categoryFilter = (catList || []).filter(
    category =>
      !category.hidden &&
      selectedCategories &&
      selectedCategories.some(
        selectedCategory => selectedCategory.id === category.id,
      ),
  );

  return async (spreadsheet, setData) => {
    if (catList.length === 0) {
      return null;
    }

    let { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    function makeQuery2(name) {
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
        ])
        .select([
          { date: { $month: '$date' } },
          { category: { $id: '$category' } },
          { account: { $id: '$account' } },
          { payee: { $id: '$payee' } },
          { amount: { $sum: '$amount' } },
        ]);
    }

    const [assets, debts] = await Promise.all([
      runQuery(makeQuery2('assets')).then(({ data }) => data),
      runQuery(makeQuery2('debts')).then(({ data }) => data),
    ]);

    const months = monthUtils.rangeInclusive(start, end);

    const groupedData = catGroup
      .filter(f => (hidden || f.hidden === 0) && f)
      .map(
        group => {
          let totalAssets = 0;
          let totalDebts = 0;

          const monthData = months.reduce((arr, month) => {
            let groupedAssets = 0;
            let groupedDebts = 0;

            group.categories.map(item => {
              let monthAssets = assets
                .filter(
                  asset => asset.category === item.id && asset.date === month,
                )
                .reduce((a, v) => (a = a + v.amount), 0);
              groupedAssets += monthAssets;

              let monthDebts = debts
                .filter(
                  debts => debts.category === item.id && debts.date === month,
                )
                .reduce((a, v) => (a = a + v.amount), 0);
              groupedDebts += monthDebts;

              return null;
            });

            totalAssets += groupedAssets;
            totalDebts += groupedDebts;

            arr.push({
              date: month,
              totalAssets: integerToAmount(groupedAssets),
              totalDebts: integerToAmount(groupedDebts),
              totalTotals: integerToAmount(groupedDebts + groupedAssets),
            });

            return arr;
          }, []);

          const stackedCategories = group.categories.map(item => {
            const calc = recalculate(item, months, assets, debts, 'category');
            return { ...calc };
          });

          return {
            id: group.id,
            name: group.name,
            totalAssets: integerToAmount(totalAssets),
            totalDebts: integerToAmount(totalDebts),
            totalTotals: integerToAmount(totalAssets + totalDebts),
            monthData,
            categories: stackedCategories,
          };
        },
        [start, end],
      );

    setData(groupedData);
  };
}

export default createSpreadsheet;
