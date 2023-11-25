import * as d from 'date-fns';

import q, { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToAmount } from 'loot-core/src/shared/util';

export default function createSpreadsheet(
  start,
  end,
  groupBy,
  balanceTypeOp,
  categories,
  selectedCategories,
  payees,
  accounts,
  conditions = [],
  conditionsOp,
  hidden,
  uncat,
  setDataCheck,
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

    let totalAssets = 0;
    let totalDebts = 0;

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
                  asset =>
                    asset[groupByLabel] === item.id && asset.date === month,
                )
                .reduce((a, v) => (a = a + v.amount), 0);
              groupedAssets += monthAssets;

              let monthDebts = debts
                .filter(
                  debts =>
                    debts[groupByLabel] === item.id && debts.date === month,
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
            const calc = recalculate(item, months, assets, debts, groupByLabel);
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

    const groupByData = groupBy === 'Group' ? catGroup : groupByList;

    const monthData = months.reduce((arr, month) => {
      let perMonthAssets = 0;
      let perMonthDebts = 0;
      let stacked = {};

      groupByData.map(item => {
        let stackAmounts = 0;

        let monthAssets = assets
          .filter(
            asset =>
              asset.date === month &&
              (groupBy === 'Group'
                ? item.categories
                    .map(cat => cat.id)
                    .includes(asset[groupByLabel])
                : asset[groupByLabel] === item.id),
          )
          .reduce((a, v) => (a = a + v.amount), 0);
        perMonthAssets += monthAssets;

        let monthDebts = debts
          .filter(
            debts =>
              debts.date === month &&
              (groupBy === 'Group'
                ? item.categories
                    .map(cat => cat.id)
                    .includes(debts[groupByLabel])
                : debts[groupByLabel] === item.id),
          )
          .reduce((a, v) => (a = a + v.amount), 0);
        perMonthDebts += monthDebts;

        if (typeItem === 'totalAssets') {
          stackAmounts += monthAssets;
        }
        if (typeItem === 'totalDebts') {
          stackAmounts += monthDebts;
        }
        if (stackAmounts !== 0) {
          stacked[item.name] = integerToAmount(Math.abs(stackAmounts));
        }

        return null;
      });
      totalAssets += perMonthAssets;
      totalDebts += perMonthDebts;

      arr.push({
        // eslint-disable-next-line rulesdir/typography
        date: d.format(d.parseISO(`${month}-01`), "MMM ''yy"),
        ...stacked,
        totalDebts: integerToAmount(perMonthDebts),
        totalAssets: integerToAmount(perMonthAssets),
        totalTotals: integerToAmount(perMonthDebts + perMonthAssets),
      });

      return arr;
    }, []);

    let calcData;

    if (groupBy === 'Group') {
      calcData = catGroup
        .filter(f => (hidden || f.hidden === 0) && f)
        .map(group => {
          let groupedAssets = 0;
          let groupedDebts = 0;

          const monthData = months.reduce((arr, month) => {
            let perMonthAssets = 0;
            let perMonthDebts = 0;

            group.categories.map(item => {
              let monthAssets = assets
                .filter(
                  asset =>
                    asset[groupByLabel] === item.id && asset.date === month,
                )
                .reduce((a, v) => (a = a + v.amount), 0);
              perMonthAssets += monthAssets;

              let monthDebts = debts
                .filter(
                  debts =>
                    debts[groupByLabel] === item.id && debts.date === month,
                )
                .reduce((a, v) => (a = a + v.amount), 0);
              perMonthDebts += monthDebts;

              return null;
            });

            groupedAssets += perMonthAssets;
            groupedDebts += perMonthDebts;

            arr.push({
              date: month,
              totalAssets: integerToAmount(perMonthAssets),
              totalDebts: integerToAmount(perMonthDebts),
              totalTotals: integerToAmount(perMonthAssets + perMonthDebts),
            });

            return arr;
          }, []);

          return {
            id: group.id,
            name: group.name,
            totalAssets: integerToAmount(groupedAssets),
            totalDebts: integerToAmount(groupedDebts),
            totalTotals: integerToAmount(groupedAssets + groupedDebts),
            monthData,
          };
        });
    } else {
      calcData = groupByList.map(item => {
        const calc = recalculate(item, months, assets, debts, groupByLabel);
        return { ...calc };
      });
    }

    setData({
      data: calcData,
      monthData,
      groupedData,
      start,
      end,
      totalDebts: integerToAmount(totalDebts),
      totalAssets: integerToAmount(totalAssets),
      totalTotals: integerToAmount(totalAssets + totalDebts),
    });
    setDataCheck?.(true);
  };
}

function recalculate(item, months, assets, debts, groupByLabel) {
  let totalAssets = 0;
  let totalDebts = 0;
  const monthData = months.reduce((arr, month) => {
    let monthAssets = assets
      .filter(asset => asset[groupByLabel] === item.id && asset.date === month)
      .reduce((a, v) => (a = a + v.amount), 0);
    totalAssets += monthAssets;

    let monthDebts = debts
      .filter(debts => debts[groupByLabel] === item.id && debts.date === month)
      .reduce((a, v) => (a = a + v.amount), 0);
    totalDebts += monthDebts;

    const dateParse = d.parseISO(`${month}-01`);
    //const change = last ? total - amountToInteger(last.totalTotals) : 0;

    arr.push({
      dateParse,
      totalAssets: integerToAmount(monthAssets),
      totalDebts: integerToAmount(monthDebts),
      totalTotals: integerToAmount(monthAssets + monthDebts),
      // eslint-disable-next-line rulesdir/typography
      date: d.format(dateParse, "MMM ''yy"),
      dateLookup: month,
    });

    return arr;
  }, []);

  return {
    id: item.id,
    name: item.name,
    totalAssets: integerToAmount(totalAssets),
    totalDebts: integerToAmount(totalDebts),
    totalTotals: integerToAmount(totalAssets + totalDebts),
    monthData,
  };
}
