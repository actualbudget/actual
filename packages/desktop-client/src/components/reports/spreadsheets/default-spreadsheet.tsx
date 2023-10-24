import * as d from 'date-fns';

import q, { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import {
  integerToCurrency,
  integerToAmount,
  amountToInteger,
} from 'loot-core/src/shared/util';

import { index } from '../util';

export default function createSpreadsheet(
  start,
  end,
  split,
  categories,
  payees,
  accounts,
  conditions = [],
  conditionsOp,
  hidden,
) {
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
          hidden: splt.hidden,
          balances: index(balances, 'date'),
          starting,
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
              // eslint-disable-next-line rulesdir/typography
              dateFormatted: d.format(d.parseISO(`${month}-01`), "MMM ''yy"),
              amount: groupedAmount,
            };
          }),
        );

        return {
          starting: groupedStarting,
          name: group.name,
          id: group.id,
          balances: index(mon, 'date'),
        };
      }),
    );

    const splitData = split === 2 ? groupData : graphData;

    let totalAssets = 0;
    let totalDebts = 0;
    let totalTotals = 0;

    const monthData = await Promise.all(
      months.map(async month => {
        let perMonthAssets = 0;
        let perMonthDebts = 0;
        let perMonthTotals = 0;
        const stacked = await Promise.all(
          splitData.map(async graph => {
            let stackDebts = 0;
            let stackAssets = 0;
            let stackTotals = 0;
            if (graph.balances[month]) {
              if (graph.balances[month].amount < 0) {
                perMonthDebts += -graph.balances[month].amount;
                stackDebts += -graph.balances[month].amount;
              } else {
                perMonthAssets += graph.balances[month].amount;
                stackAssets += graph.balances[month].amount;
              }
              perMonthTotals = perMonthAssets - perMonthDebts;
              stackTotals += stackAssets - stackDebts;
            }
            return {
              name: graph.name,
              totalAssets: integerToAmount(stackAssets),
              totalDebts: -1 * integerToAmount(stackDebts),
              totalTotals: integerToAmount(stackTotals),
            };
          }),
        );
        totalAssets += perMonthAssets;
        totalDebts += perMonthDebts;
        totalTotals += perMonthTotals;

        const indexedSplit = index(stacked, 'name');
        return {
          // eslint-disable-next-line rulesdir/typography
          date: d.format(d.parseISO(`${month}-01`), "MMM ''yy"),
          ...indexedSplit,
          totalDebts: -1 * integerToAmount(perMonthDebts),
          totalAssets: integerToAmount(perMonthAssets),
          totalTotals:
            perMonthAssets >= perMonthDebts
              ? integerToAmount(perMonthTotals)
              : integerToAmount(perMonthTotals),
        };
      }),
    );

    const data = await Promise.all(
      splitData.map(async graph => {
        const calc = recalculate(graph, start, end);
        return { ...calc };
      }),
    );

    setData({
      split: splitList,
      data,
      monthData,
      totalDebts: -1 * integerToAmount(totalDebts),
      totalAssets: integerToAmount(totalAssets),
      totalTotals:
        totalAssets >= totalDebts
          ? integerToAmount(totalTotals)
          : -1 * integerToAmount(totalTotals),
    });
  };
}

function recalculate(data, start, end) {
  const months = monthUtils.rangeInclusive(start, end);

  let totalDebts = 0;
  let totalAssets = 0;
  let totalTotals = 0;
  //let startingDebts = 0;
  //let startingAssets = 0;
  let hasNegative = false;
  let startNetWorth = 0;
  let endNetWorth = 0;
  let lowestNetWorth = null;
  let highestNetWorth = null;

  const graphData = months.reduce((arr, month) => {
    let debts = 0;
    let assets = 0;
    let total = 0;
    const last = arr.length === 0 ? null : arr[arr.length - 1];

    if (data.balances[month]) {
      if (data.balances[month].amount < 0) {
        debts += -data.balances[month].amount;
        //startingDebts += -data.balances[month].amount;
        totalDebts += -data.balances[month].amount;
      } else {
        assets += data.balances[month].amount;
        //startingAssets += data.balances[month].amount;
        totalAssets += data.balances[month].amount;
      }
      total = assets - debts;
      totalTotals = totalAssets - totalDebts;
    }

    if (total < 0) {
      hasNegative = true;
    }

    const x = d.parseISO(`${month}-01`);
    const y =
      assets >= debts ? integerToAmount(total) : -1 * integerToAmount(total);
    const change = last ? total - amountToInteger(last.y) : 0;

    if (arr.length === 0) {
      startNetWorth = total;
    }
    endNetWorth = total;

    arr.push({
      x,
      y,
      assets: integerToAmount(assets),
      debts: integerToAmount(debts),
      change: integerToCurrency(change),
      networth: integerToCurrency(total),
      // eslint-disable-next-line rulesdir/typography
      date: d.format(x, "MMM ''yy"),
    });

    arr.forEach(item => {
      if (item.y < lowestNetWorth || lowestNetWorth === null) {
        lowestNetWorth = item.y;
      }
      if (item.y > highestNetWorth || highestNetWorth === null) {
        highestNetWorth = item.y;
      }
    });
    return arr;
  }, []);

  const yTotal =
    totalAssets > totalDebts
      ? integerToAmount(totalTotals)
      : -1 * integerToAmount(totalTotals);

  return {
    graphData: {
      data: graphData,
      hasNegative,
      start,
      end,
    },
    totalAssets: integerToAmount(totalAssets),
    totalDebts: -1 * integerToAmount(totalDebts),
    totalTotals: yTotal,
    netWorth: endNetWorth,
    totalChange: endNetWorth - startNetWorth,
    lowestNetWorth,
    highestNetWorth,
    id: data.id,
    name: data.name,
  };
}
