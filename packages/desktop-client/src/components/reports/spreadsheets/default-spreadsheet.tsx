import * as d from 'date-fns';

import q, { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToAmount, amountToInteger } from 'loot-core/src/shared/util';

import { index } from '../util';

export default function createSpreadsheet(
  start,
  end,
  groupBy,
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

  let groupByList;
  let groupByLabel;
  switch (groupBy) {
    case 'Category':
      groupByList = catList;
      groupByLabel = 'category';
      break;
    case 'Group':
      groupByList = catList;
      groupByLabel = 'category';
      break;
    case 'Payee':
      groupByList = payees;
      groupByLabel = 'payee';
      break;
    case 'Account':
      groupByList = accounts;
      groupByLabel = 'account';
      break;
    case 'Month':
      groupByList = catList;
      groupByLabel = 'category';
      break;
    case 'Year':
      groupByList = catList;
      groupByLabel = 'category';
      break;
    default:
  }

  return async (spreadsheet, setData) => {
    if (groupByList.length === 0) {
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
          [groupByLabel]: splt.id,
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
      groupByList.map(async splt => {
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
                [groupByLabel]: splt.id,
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
    const calcData = graphData.map(graph => {
      let graphStarting = 0;
      const mon = months.map(month => {
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
      });

      return {
        id: graph.id,
        uncat_id: graph.uncat_id,
        name: graph.name,
        starting: graphStarting,
        hidden: graph.hidden,
        balances: index(mon, 'date'),
      };
    });

    const categoryGroupCalcData = catGroup.map(group => {
      if (hidden || group.hidden === 0) {
        let groupedStarting = 0;
        const mon = months.map(month => {
          let groupedAssets = 0;
          let groupedDebts = 0;
          graphData.map(graph => {
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
            return null;
          });
          return {
            date: month,
            assets: groupedAssets,
            debts: groupedDebts,
          };
        });

        return {
          id: group.id,
          name: group.name,
          starting: groupedStarting,
          hidden: group.hidden,
          balances: index(mon, 'date'),
        };
      } else {
        return null;
      }
    });

    const groupByData = groupBy === 'Group' ? categoryGroupCalcData : calcData;

    const data = groupByData.map(graph => {
      const calc = recalculate(graph, start, end);
      return { ...calc };
    });

    const categoryGroupData = catGroup.map(group => {
      const catData = group.categories.map(graph => {
        let catMatch = null;
        calcData.map(cat => {
          if (
            cat.id === null
              ? cat.uncat_id === graph.uncat_id
              : cat.id === graph.id
          ) {
            catMatch = cat;
          }
          return null;
        });
        const calcCat = catMatch && recalculate(catMatch, start, end);
        return { ...calcCat };
      });
      let groupMatch = null;
      categoryGroupCalcData.map(split => {
        if (split.id === group.id) {
          groupMatch = split;
        }
        return null;
      });
      const calcGroup = groupMatch && recalculate(groupMatch, start, end);
      return {
        ...calcGroup,
        categories: catData,
      };
    });

    let totalAssets = 0;
    let totalDebts = 0;
    let totalTotals = 0;

    const monthData = months.map(month => {
      let perMonthAssets = 0;
      let perMonthDebts = 0;
      let perMonthTotals = 0;
      graphData.map(graph => {
        if (graph.assets[month] || graph.debts[month]) {
          if (graph.assets[month]) {
            perMonthAssets += graph.assets[month].assets;
          }
          if (graph.debts[month]) {
            perMonthDebts += graph.debts[month].debts;
          }
          perMonthTotals = perMonthAssets + perMonthDebts;
        }
        return null;
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
    });

    const stackedData = months.map(month => {
      let perMonthAmounts = 0;
      const stacked = data.map(graph => {
        let stackAmounts = 0;
        if (graph.indexedMonthData[month]) {
          perMonthAmounts += graph.indexedMonthData[month][typeItem];
          stackAmounts += graph.indexedMonthData[month][typeItem];
        }
        return {
          name: graph.name,
          id: graph.id,
          amount: stackAmounts,
        };
      });

      const indexedStack = index(stacked, 'name');
      return {
        // eslint-disable-next-line rulesdir/typography
        date: d.format(d.parseISO(`${month}-01`), "MMM ''yy"),
        ...indexedStack,
        totalTotals: perMonthAmounts,
      };
    });

    setData({
      stackedData,
      groupBy: groupBy === 'Group' ? catGroup : groupByList,
      data,
      groupData: categoryGroupData,
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

  const monthData = months.reduce((arr, month) => {
    let debts = 0;
    let assets = 0;
    let total = 0;
    const last = arr.length === 0 ? null : arr[arr.length - 1];

    if (item.balances[month]) {
      exists = true;
      if (item.balances[month].debts) {
        debts += item.balances[month].debts;
        totalDebts += item.balances[month].debts;
      }
      if (item.balances[month].assets) {
        assets += item.balances[month].assets;
        totalAssets += item.balances[month].assets;
      }
      total = assets + debts;
      totalTotals = totalAssets + totalDebts;
    }

    const dateParse = d.parseISO(`${month}-01`);
    const change = last ? total - amountToInteger(last.totalTotals) : 0;

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

    return arr;
  }, []);

  const indexedMonthData = exists ? index(monthData, 'dateLookup') : monthData;

  return {
    indexedMonthData,
    monthData,
    totalAssets: integerToAmount(totalAssets),
    totalDebts: integerToAmount(totalDebts),
    totalTotals: integerToAmount(totalTotals),
    id: item.id,
    name: item.name,
  };
}
