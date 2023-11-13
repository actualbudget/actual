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

  let splitItem;
  let splitList;
  let splitLabel;
  switch (split) {
    case 'Category':
      splitItem = catList;
      splitList = splitItem;
      splitLabel = 'category';
      break;
    case 'Group':
      splitItem = catList;
      splitList = catGroup;
      splitLabel = 'category';
      break;
    case 'Payee':
      splitItem = payees;
      splitList = splitItem;
      splitLabel = 'payee';
      break;
    case 'Account':
      splitItem = accounts;
      splitList = splitItem;
      splitLabel = 'account';
      break;
    case 'Month':
      splitItem = catList;
      splitList = splitItem;
      splitLabel = 'category';
      break;
    case 'Year':
      splitItem = catList;
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

    function makeQuery(splt, name) {
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
        //Calculate uncategorized transactions when box checked
        .filter(
          splt.uncat_id === '2'
            ? {
                'payee.transfer_acct.closed': false,
              }
            : {
                'payee.transfer_acct': null,
                'account.offbudget': splt.offBudget ? splt.offBudget : false,
              },
        )
        //Apply filters and split by "Group By"
        .filter({
          [conditionsOpKey]: [...filters],
          [splitLabel]: splt.id,
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
        .groupBy({ $month: '$date' })
        .select([
          { date: { $month: '$date' } },
          { [name]: { $sum: '$amount' } },
        ]);
    }

    const graphData = await Promise.all(
      splitItem.map(async splt => {
        let [starting, assets, debts] = await Promise.all([
          runQuery(
            q('transactions')
              .filter(
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
              .filter(
                splt.uncat_id === '2'
                  ? {
                      'payee.transfer_acct.closed': false,
                    }
                  : {
                      'payee.transfer_acct': null,
                      'account.offbudget': splt.offBudget
                        ? splt.offBudget
                        : false,
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
                [conditionsOpKey]: [...filters],
                [splitLabel]: splt.id,
              })
              .filter({
                $and: [{ date: { $lt: start + '-01' } }],
              })
              .calculate({ $sum: '$amount' }),
          ).then(({ data }) => data),

          runQuery(makeQuery(splt, 'assets')).then(({ data }) => data),
          runQuery(makeQuery(splt, 'debts')).then(({ data }) => data),
        ]);

        return {
          id: splt.id,
          uncat_id: splt.uncat_id,
          name: splt.name,
          starting,
          hidden: splt.hidden,
          assets: index(assets, 'date'),
          debts: index(debts, 'date'),
        };
      }),
    );

    const months = monthUtils.rangeInclusive(start, end);
    const calcData = await Promise.all(
      graphData.map(async graph => {
        let graphStarting = 0;
        const mon = await Promise.all(
          months.map(async month => {
            let graphAssets = 0;
            let graphDebts = 0;
            if (graph.assets[month] || graph.debts[month]) {
              if (graph.assets[month]) {
                graphAssets += graph.assets[month].assets;
              }
              if (graph.debts[month]) {
                graphDebts += graph.debts[month].debts;
              }
            }

            graphStarting += graph.starting;
            return {
              date: month,
              assets: graphAssets,
              debts: graphDebts,
            };
          }),
        );

        return {
          id: graph.id,
          uncat_id: graph.uncat_id,
          name: graph.name,
          starting: graphStarting,
          hidden: graph.hidden,
          balances: index(mon, 'date'),
        };
      }),
    );

    const groupData = await Promise.all(
      catGroup.map(async group => {
        if (hidden || group.hidden === 0) {
          let groupedStarting = 0;
          const mon = await Promise.all(
            months.map(async month => {
              let groupedAssets = 0;
              let groupedDebts = 0;
              graphData.map(async graph => {
                if (graph.assets[month] || graph.debts[month]) {
                  if (group.categories.map(v => v.id).includes(graph.id)) {
                    if (graph.assets[month]) {
                      groupedAssets += graph.assets[month].assets;
                    }
                    if (graph.debts[month]) {
                      groupedDebts += graph.debts[month].debts;
                    }
                  }
                }

                groupedStarting += graph.starting;
              });
              return {
                date: month,
                assets: groupedAssets,
                debts: groupedDebts,
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
        }
      }),
    );

    const splitData = split === 2 ? groupData : calcData;

    const data = await Promise.all(
      splitData.map(async graph => {
        const calc = recalculate(graph, start, end);
        return { ...calc };
      }),
    );

    const groupedData = await Promise.all(
      catGroup.map(async group => {
        const catData = await Promise.all(
          group.categories.map(async graph => {
            let catMatch = null;
            calcData.map(async cat => {
              if (
                cat.id === null
                  ? cat.uncat_id === graph.uncat_id
                  : cat.id === graph.id
              ) {
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
          if (graph.assets[month] || graph.debts[month]) {
            if (graph.assets[month]) {
              perMonthAssets += graph.assets[month].assets;
            }
            if (graph.debts[month]) {
              perMonthDebts += graph.debts[month].debts;
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

    const stackedData = await Promise.all(
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
      stackedData: stackedData,
      split: splitList,
      data,
      gData: groupedData,
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
      if (item.balances[month].debts) {
        debts += item.balances[month].debts;
        //startingDebts += data.balances[month].amount;
        totalDebts += item.balances[month].debts;
      }
      if (item.balances[month].assets) {
        assets += item.balances[month].assets;
        //startingAssets += data.balances[month].amount;
        totalAssets += item.balances[month].assets;
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
