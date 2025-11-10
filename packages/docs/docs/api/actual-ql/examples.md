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
