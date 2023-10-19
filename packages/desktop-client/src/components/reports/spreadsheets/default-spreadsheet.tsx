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
  categories,
  payees,
  accounts,
  conditions = [],
  conditionsOp,
  split,
) {
  let splitItem;
  let splitLabel;
  switch (split) {
    case 1:
      splitItem = categories.list;
      splitLabel = 'category';
      break;
    case 2:
      splitItem = categories.list;
      splitLabel = 'category';
      break;
    case 3:
      splitItem = payees;
      splitLabel = 'payee';
      break;
    case 4:
      splitItem = accounts;
      splitLabel = 'account';
      break;
    default:
  }

  return async (spreadsheet, setData) => {
    if (accounts.length === 0) {
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
              .filter({
                [conditionsOpKey]: filters,
                [splitLabel]: splt.id,
                'account.offbudget': false,
                date: { $lt: start + '-01' },
              })
              .calculate({ $sum: '$amount' }),
          ).then(({ data }) => data),

          runQuery(
            q('transactions')
              .filter({
                [conditionsOpKey]: [...filters],
              })
              .filter({
                [splitLabel]: splt.id,
                'account.offbudget': false,
                $and: [
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
              if (graph.balances[month]) {
                if (group.categories.map(v => v.id).includes(graph.id)) {
                  groupedAmount += graph.balances[month].amount;
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
          starting: groupedStarting,
          name: group.name,
          id: group.id,
          balances: index(mon, 'date'),
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
        const stacked = await Promise.all(
          graphData.map(async graph => {
            let stack = 0;
            if (graph.balances[month]) {
              stack += graph.balances[month].amount;

              if (graph.balances[month].amount < 0) {
                perMonthDebts += -graph.balances[month].amount;
              } else {
                perMonthAssets += graph.balances[month].amount;
              }
              perMonthTotals = perMonthAssets - perMonthDebts;
            }
            return {
              name: graph.name,
              amount: stack,
            };
          }),
        );
        totalAssets += perMonthAssets;
        totalDebts += perMonthDebts;
        totalTotals += perMonthTotals;

        return {
          date: month,
          split: stacked,
          totalDebts: -1 * integerToAmount(perMonthDebts),
          totalAssets: integerToAmount(perMonthAssets),
          totalTotals:
            perMonthAssets >= perMonthDebts
              ? integerToAmount(perMonthTotals)
              : integerToAmount(perMonthTotals),
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

    setData({
      [split]: splitItem,
      data,
      monthData,
      totalDebts: -1 * integerToAmount(totalDebts),
      totalAssets: integerToAmount(totalAssets),
      totalTotals:
        totalAssets >= totalDebts
          ? integerToAmount(totalTotals)
          : `-${integerToAmount(totalTotals)}`,
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
  let yTotal = null;

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
      assets >= debts ? integerToAmount(total) : `-${integerToAmount(-total)}`;
    yTotal =
      totalAssets > totalDebts
        ? integerToAmount(totalTotals)
        : `-${integerToAmount(-totalTotals)}`;
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
      date: d.format(x, 'MMMM yyyy'),
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
