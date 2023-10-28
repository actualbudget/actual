import * as d from 'date-fns';

import q, { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToAmount, amountToInteger } from 'loot-core/src/shared/util';

import { index } from '../util';

export default function createSpreadsheet(
  start,
  end,
  split,
  typeItem,
  categories,
  selectedCategories,
  payees,
  accounts,
  conditions = [],
  conditionsOp,
  hidden,
) {
  let categoryFilter = (categories.list || []).filter(
    category =>
      !category.hidden &&
      selectedCategories &&
      selectedCategories.some(
        selectedCategory => selectedCategory.id === category.id,
      ),
  );

  let splitItem;
  let splitList;
  let splitLabel;
  switch (split) {
    case 1:
      splitItem = categories.list;
      splitList = splitItem;
      splitLabel = 'category';
      break;
    case 2:
      splitItem = categories.list;
      splitList = categories.grouped;
      splitLabel = 'category';
      break;
    case 3:
      splitItem = payees;
      splitList = splitItem;
      splitLabel = 'payee';
      break;
    case 4:
      splitItem = accounts;
      splitList = splitItem;
      splitLabel = 'account';
      break;
    case 5:
      splitItem = categories.list;
      splitList = splitItem;
      splitLabel = 'category';
      break;
    case 6:
      splitItem = categories.list;
      splitList = splitItem;
      splitLabel = 'category';
      break;
    default:
  }

  return async (spreadsheet, setData) => {
    if (splitItem.length === 0) {
      return null;
    }

    let { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    const graphData = await Promise.all(
      splitItem.map(async splt => {
        let [starting, balances] = await Promise.all([
          runQuery(
            q('transactions')
              .filter(
                !hidden && {
                  $and: [
                    {
                      'account.offbudget': false,
                      'category.hidden': false,
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
              .filter(
                selectedCategories && {
                  $or: categoryFilter.map(category => ({
                    category: category.id,
                  })),
                },
              )
              .filter({
                [splitLabel]: splt.id,
                $and: [
                  { [conditionsOpKey]: filters },
                  { date: { $lt: start + '-01' } },
                ],
              })
              .calculate({ $sum: '$amount' }),
          ).then(({ data }) => data),

          runQuery(
            q('transactions')
              .filter(
                !hidden && {
                  $and: [
                    {
                      'account.offbudget': false,
                      'category.hidden': false,
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
              .filter(
                selectedCategories && {
                  $or: categoryFilter.map(category => ({
                    category: category.id,
                  })),
                },
              )
              .filter({
                [splitLabel]: splt.id,
                $and: [
                  { [conditionsOpKey]: filters },
                  { date: { $gte: start + '-01' } },
                  { date: { $lte: end + '-31' } },
                ],
              })
              .groupBy({ $month: '$date' })
              .select([
                { date: { $month: '$date' } },
                { amount: { $sum: '$amount' } },
              ]),
          ).then(({ data }) => data),
        ]);

        return {
          id: splt.id,
          name: splt.name,
          starting,
          hidden: splt.hidden,
          balances: index(balances, 'date'),
        };
      }),
    );

    const months = monthUtils.rangeInclusive(start, end);
    const groupData = await Promise.all(
      categories.grouped.map(async group => {
        let groupedStarting = 0;
        const mon = await Promise.all(
          months.map(async month => {
            let groupedAmount = 0;
            graphData.map(async graph => {
              if (graph.hidden === 0 && group.hidden === 0) {
                if (graph.balances[month]) {
                  if (group.categories.map(v => v.id).includes(graph.id)) {
                    groupedAmount += graph.balances[month].amount;
                  }
                }
              }

              groupedStarting += graph.starting;
            });
            return {
              date: month,
              amount: groupedAmount,
            };
          }),
        );

        return {
          id: group.id,
          name: group.name,
          starting: groupedStarting,
          hidden: group.hidden,
          balances: index(mon, 'date'),
        };
      }),
    );

    const splitData = split === 2 ? groupData : graphData;

    const data = await Promise.all(
      splitData.map(async graph => {
        const calc = recalculate(graph, start, end);
        return { ...calc };
      }),
    );

    const gData = await Promise.all(
      categories.grouped.map(async group => {
        const catData = await Promise.all(
          group.categories.map(async graph => {
            let catMatch = null;
            graphData.map(async cat => {
              if (cat.id === graph.id) {
                catMatch = cat;
              }
            });
            const calcCat = catMatch && recalculate(catMatch, start, end);
            return { ...calcCat };
          }),
        );
        let groupMatch = null;
        groupData.map(async split => {
          if (split.id === group.id) {
            groupMatch = split;
          }
        });
        const calcGroup = groupMatch && recalculate(groupMatch, start, end);
        return {
          ...calcGroup,
          categories: catData,
        };
      }),
    );

    let totalAssets = 0;
    let totalDebts = 0;
    let totalTotals = 0;

    const monthData = await Promise.all(
      months.map(async month => {
        let perMonthAssets = 0;
        let perMonthDebts = 0;
        let perMonthTotals = 0;
        graphData.map(async graph => {
          if (graph.balances[month]) {
            if (graph.balances[month].amount < 0) {
              perMonthDebts += graph.balances[month].amount;
            } else {
              perMonthAssets += graph.balances[month].amount;
            }
            perMonthTotals = perMonthAssets + perMonthDebts;
          }
        });
        totalAssets += perMonthAssets;
        totalDebts += perMonthDebts;
        totalTotals += perMonthTotals;

        return {
          // eslint-disable-next-line rulesdir/typography
          date: d.format(d.parseISO(`${month}-01`), "MMM ''yy"),
          totalDebts: integerToAmount(perMonthDebts),
          totalAssets: integerToAmount(perMonthAssets),
          totalTotals: integerToAmount(perMonthTotals),
        };
      }),
    );

    const sData = await Promise.all(
      months.map(async month => {
        let perMonthAmounts = 0;
        const stacked = await Promise.all(
          data.map(async graph => {
            let stackAmounts = 0;
            if (graph.indexedMonthData[month]) {
              perMonthAmounts += graph.indexedMonthData[month][typeItem];
              stackAmounts += graph.indexedMonthData[month][typeItem];
            }
            /*const nested = await Promise.all(
              graph.categories.map(async cat => {
                let catAmounts = 0;
                if (cat.monthData[month]) {
                  catAmounts += cat.monthData[month][type];
                }
                return {
                  name: cat.name,
                  id: cat.id,
                  amount: catAmounts,
                };
              }),
            );*/
            return {
              name: graph.name,
              id: graph.id,
              amount: stackAmounts,
            };
          }),
        );

        const indexedSplit = index(stacked, 'name');
        return {
          // eslint-disable-next-line rulesdir/typography
          date: d.format(d.parseISO(`${month}-01`), "MMM ''yy"),
          ...indexedSplit,
          totalTotals: perMonthAmounts,
        };
      }),
    );

    setData({
      stackedData: sData,
      split: splitList,
      data,
      gData: gData,
      monthData,
      start,
      end,
      totalDebts: integerToAmount(totalDebts),
      totalAssets: integerToAmount(totalAssets),
      totalTotals: integerToAmount(totalTotals),
    });
  };
}

function recalculate(item, start, end) {
  const months = monthUtils.rangeInclusive(start, end);

  let totalDebts = 0;
  let totalAssets = 0;
  let totalTotals = 0;
  let exists = false;
  /*
  let startingDebts = 0;
  let startingAssets = 0;
  let hasNegative = false;
  let startNetWorth = 0;
  let endNetWorth = 0;
  let lowestNetWorth = null;
  let highestNetWorth = null;
  */

  const monthData = months.reduce((arr, month) => {
    let debts = 0;
    let assets = 0;
    let total = 0;
    const last = arr.length === 0 ? null : arr[arr.length - 1];

    if (item.balances[month]) {
      exists = true;
      if (item.balances[month].amount < 0) {
        debts += item.balances[month].amount;
        //startingDebts += data.balances[month].amount;
        totalDebts += item.balances[month].amount;
      } else {
        assets += item.balances[month].amount;
        //startingAssets += data.balances[month].amount;
        totalAssets += item.balances[month].amount;
      }
      total = assets + debts;
      totalTotals = totalAssets + totalDebts;
    }

    /*if (total < 0) {
      hasNegative = true;
    }*/

    const dateParse = d.parseISO(`${month}-01`);
    const change = last ? total - amountToInteger(last.totalTotals) : 0;

    /*if (arr.length === 0) {
      startNetWorth = total;
    }
    endNetWorth = total;*/

    arr.push({
      dateParse,
      totalTotals: integerToAmount(total),
      totalAssets: integerToAmount(assets),
      totalDebts: integerToAmount(debts),
      totalChange: integerToAmount(change),
      // eslint-disable-next-line rulesdir/typography
      date: d.format(dateParse, "MMM ''yy"),
      dateLookup: month,
    });

    /*
    arr.forEach(item => {
      if (item.y < lowestNetWorth || lowestNetWorth === null) {
        lowestNetWorth = item.y;
      }
      if (item.y > highestNetWorth || highestNetWorth === null) {
        highestNetWorth = item.y;
      }
    });
    */

    return arr;
  }, []);

  const indexedSplit = exists ? index(monthData, 'dateLookup') : monthData;

  return {
    indexedMonthData: indexedSplit,
    monthData: monthData,
    totalAssets: integerToAmount(totalAssets),
    totalDebts: integerToAmount(totalDebts),
    totalTotals: integerToAmount(totalTotals),
    id: item.id,
    name: item.name,
  };
}
