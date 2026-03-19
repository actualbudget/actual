# ActualQL Examples

## Searching by Month or Year

ActualQL supports various functions to convert data, as well as the ability to convert field data. For example, saying `{ $month: '2021-01-01' }` would come back with the month of `2021-01`. But we need a way to apply that to the `date` field, and we use `$transform` for that.

This part deserves better docs, but here's a reference example you can use to search by month or year:

```js
q('transactions')
  .filter({ date: { $transform: '$month', $eq: '2021-01' } })
  .select('*');
```

This would return all transactions in the month of `2021-01`. We've applied the `$month` function to the `date` field and applied the condition of equaling `2021-01`.

You can substitute `$year` to do the same thing for year.

## Total Amount per Payee Between 6 Apr 2020 and 5 Apr 2021

```js
(
  await $query(
    $q('transactions')
      .filter({
        $and: [
          { date: { $gte: '2020-04-06' } },
          { date: { $lte: '2021-04-05' } },
        ],
      })
      .groupBy('payee.name')
      .orderBy('payee.name')
      .select(['payee.name', { amount: { $sum: '$amount' } }]),
  )
).data.map(row => {
  console.log(`${row['payee.name']}: ${row.amount / 100}`);
});
```

## Total Amount of all Transactions With Note Containing #interest (P) Between 6 Apr 2020 and 5 Apr 2021

```js
(
  await $query(
    $q('transactions')
      .filter({
        $and: [
          { date: { $gte: '2020-04-06' } },
          { date: { $lte: '2021-04-05' } },
          { notes: { $like: '%#interest (P)%' } },
        ],
      })
      .calculate({ $sum: '$amount' }),
  )
).data / 100;
```

or

```js
(
  await $query(
    $q('transactions')
      .filter({
        $and: [
          { date: { $gte: '2020-04-06' } },
          { date: { $lte: '2021-04-05' } },
          { notes: { $like: '%#interest (P)%' } },
        ],
      })
      .select({ total: { $sum: '$amount' } }),
  )
).data[0].total / 100;
```

## Total Amount per Category Between 6 Apr 2020 and 5 Apr 2021

```js
(
  await $query(
    $q('transactions')
      .filter({
        $and: [
          { date: { $gte: '2020-04-06' } },
          { date: { $lte: '2021-04-05' } },
        ],
      })
      .groupBy('category.name')
      .orderBy(['category.group.sort_order', 'category.sort_order'])
      .select([
        'category.group.name',
        'category.name',
        { amount: { $sum: '$amount' } },
      ]),
  )
).data.map(row => {
  console.log(
    `${row['category.group.name']}/${row['category.name']}: ${
      row.amount / 100
    }`,
  );
});
```

## CLI Usage

The examples above are shown in JavaScript. If you're using the [CLI tool](../cli.md), you can express many of the same queries with command-line flags. Here's how the JS patterns translate:

```bash
# Select specific fields (JS: .select(['date', 'amount', 'payee.name']))
actual query run --table transactions --select "date,amount,payee.name"

# Filter by condition (JS: .filter({ amount: { $lt: 0 } }))
actual query run --table transactions --filter '{"amount":{"$lt":0}}'

# Order by field descending (JS: .orderBy([{ date: 'desc' }]))
actual query run --table transactions --order-by "date:desc"

# Search by month (JS: .filter({ date: { $transform: '$month', $eq: '2021-01' } }))
actual query run --table transactions --filter '{"date":{"$transform":"$month","$eq":"2021-01"}}'

# Group by payee with sum — use --file for aggregate queries
echo '{"table":"transactions","groupBy":["payee.name"],"select":["payee.name",{"amount":{"$sum":"$amount"}}]}' | actual query run --file -

# Count transactions (JS: .calculate({ $count: '*' }))
actual query run --table transactions --count

# Quick shortcut: last 10 transactions
actual query run --last 10
```
