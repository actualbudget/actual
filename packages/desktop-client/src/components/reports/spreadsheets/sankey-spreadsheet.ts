// @ts-strict-ignore
import { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import { q } from 'loot-core/src/shared/query';
import { integerToAmount } from 'loot-core/src/shared/util';

export function createSpreadsheet(
  start,
  end,
  categories,
  conditions = [],
  conditionsOp,
) {
  return async (spreadsheet, setData) => {
    // gather filters user has set
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    // create list of Income subcategories
    const allIncomeSubcategories = [].concat(
      ...categories
        .filter(category => category.is_income === 1)
        .map(category => category.categories),
    );

    // retrieve sum of subcategory expenses
    async function fetchCategoryData(categories) {
      try {
        return await Promise.all(
          categories.map(async mainCategory => {
            const subcategoryBalances = await Promise.all(
              mainCategory.categories
                .filter(subcategory => subcategory.is_income !== 1)
                .map(async subcategory => {
                  const results = await runQuery(
                    q('transactions')
                      .filter({
                        [conditionsOpKey]: filters,
                      })
                      .filter({
                        $and: [
                          { date: { $gte: start + '-01' } },
                          { date: { $lte: end + '-31' } },
                        ],
                      })
                      .filter({ category: subcategory.id })
                      .calculate({ $sum: '$amount' }),
                  );
                  return {
                    subcategory: subcategory.name,
                    value: results.data * -1,
                  };
                }),
            );

            // Here you could combine, reduce or transform the subcategoryBalances if needed
            return {
              name: mainCategory.name,
              balances: subcategoryBalances,
            };
          }),
        );
      } catch (error) {
        console.error('Error fetching category data:', error);
        throw error; // Re-throw if you want the error to propagate
      }
    }

    // retrieve all income subcategory payees
    async function fetchIncomeData() {
      // Map over allIncomeSubcategories and return an array of promises
      const promises = allIncomeSubcategories.map(subcategory => {
        return runQuery(
          q('transactions')
            .filter({
              [conditionsOpKey]: filters,
            })
            .filter({
              $and: [
                { date: { $gte: start + '-01' } },
                { date: { $lte: end + '-31' } },
              ],
            })
            .filter({ category: subcategory.id })
            .groupBy(['payee'])
            .select(['payee', { amount: { $sum: '$amount' } }]),
        );
      });

      // Use Promise.all() to wait for all queries to complete
      const resultsArrays = await Promise.all(promises);

      // unravel the results
      const payeesDict = {};
      resultsArrays.forEach(item => {
        item.data.forEach(innerItem => {
          payeesDict[innerItem.payee] = innerItem.amount;
        });
      });

      // First, collect all unique IDs from payeesDict
      const payeeIds = Object.keys(payeesDict);

      const results = await runQuery(
        q('payees')
          .filter({ id: { $oneof: payeeIds } })
          .select(['id', 'name']),
      );

      // Convert the resulting array to a payee-name-map
      const payeeNames = {};
      results.data.forEach(item => {
        if (item.name && payeesDict[item.id]) {
          payeeNames[item.name] = payeesDict[item.id];
        }
      });
      return payeeNames;
    }
    const categoryData = await fetchCategoryData(categories);
    const incomeData = await fetchIncomeData();

    // convert retrieved data into the proper sankey format
    setData(transformToSankeyData(categoryData, incomeData));
  };
}

function transformToSankeyData(categoryData, incomeData) {
  const data = { nodes: [], links: [] };
  const nodeNames = new Set();

  // Add the Budget node first.
  data.nodes.push({ name: 'Budget' });
  nodeNames.add('Budget');

  // Handle the income sources and link them to the Budget node.
  Object.entries(incomeData).forEach(([sourceName, value]) => {
    if (!nodeNames.has(sourceName) && integerToAmount(value) > 0) {
      data.nodes.push({ name: sourceName });
      nodeNames.add(sourceName);
      data.links.push({
        source: sourceName,
        target: 'Budget',
        value: integerToAmount(value),
      });
    }
  });

  // add all category expenses that have valid subcategories and a balance
  for (const mainCategory of categoryData) {
    if (!nodeNames.has(mainCategory.name) && mainCategory.balances.length > 0) {
      let mainCategorySum = 0;
      for (const subCategory of mainCategory.balances) {
        if (!nodeNames.has(subCategory.subcategory) && subCategory.value > 0) {
          mainCategorySum += subCategory.value;
        }
      }
      if (mainCategorySum === 0) {
        continue;
      }
      data.nodes.push({ name: mainCategory.name });
      nodeNames.add(mainCategory.name);
      data.links.push({
        source: 'Budget',
        target: mainCategory.name,
        value: integerToAmount(mainCategorySum),
      });

      // add the subcategories of the main category
      for (const subCategory of mainCategory.balances) {
        if (!nodeNames.has(subCategory.subcategory) && subCategory.value > 0) {
          data.nodes.push({ name: subCategory.subcategory });
          nodeNames.add(subCategory.subcategory);

          data.links.push({
            source: mainCategory.name,
            target: subCategory.subcategory,
            value: integerToAmount(subCategory.value),
          });
        }
      }
    }
  }

  // Map source and target in links to the index of the node
  data.links.forEach(link => {
    link.source = data.nodes.findIndex(node => node.name === link.source);
    link.target = data.nodes.findIndex(node => node.name === link.target);
  });

  return data;
}
