ActualQL is a new query language introduced in 0.0.129. This allows you to query data any way you like. For example, previously we provided a `filterTransactions` method that let you search transactions, but its behavior was baked into the backend. You couldn't change how transactions were sorted, search certain fields specifically, or sum the total amount.

ActualQL provides a lightweight syntax for querying data. It looks like this:

```js
q('transactions')
  .filter({
    'category.name': 'Food',
    date: '2021-02-20'
  })
  .select(['id', 'date', 'amount'])
```

The above query would return the `id`, `date`, and `amount` of all transactions with the `Food` category on `2021-02-20`.

Currently the query language is mostly undocumented, but more docs will come soon. Most of Actual uses ActualQL, so you have access to the same functionality that Actual has.

Until we have better docs, here are few things you can do with ActualQL.

## Run a query

You construct a query with `q` and run it with `runQuery`. The result is an object with a `data` prop. An example:

```js
let { q, runQuery } = require('@actual-app/api');

let { data } = await runQuery(q('transactions').select('*'));
```

`data` will be an array of all the transactions in the system.

## Specify split transaction behavior

Split transactions complicate things: when you sum transaction amounts, do you sum up all the subtransactions or do you just use the top-level transaction? When selecting transactions, which ones do you want?

The `transactions` table provides two different interfaces for transaction data to help with this. You can configure the type of data to return using `options` and passing a `splits` option:

```js
q('transactions')
  .select('*')
  .options({ splits: 'inline' })
```

There are two different options for `splits`: `inline` or `grouped`<super>*</super>. **`inline` is the default**, and will not return the "parent" transaction of a split transaction. It will only show you subtransactions of split transaction, and the result is a flat array of transactions. This lets you sum all the amounts of transactions and by default it will ignore the "parent" transaction.

`grouped` always returns the full split transaction (parent and subtransaction), no matter which part of it matched a filter. The returned data is also grouped so that transactions have a `subtransactions` property that lists them.

These two options gives you full control over how you want to handle split transactions.

_* There is a third option as well, `all`, which returns both transactions and subtransactions in a flat list. You only need this if doing something advanced._

## Search tansactions

Calling `filter` applies conditions to the query; only data that matches the given filters will be returned.

The keys of a filter object are the names of the fields (see [Transaction](/developers/API/#transaction)) and the values are the condition. By default, it will perform an "is equal" but you can also provide various operators. An example:

```js
q('transactions')
  .filter({
    'category.name': 'Food',
    date: { $gte: '2021-01-01' }
  })
  .select('*')
```

The `$gte` operator on `date` returns transactions on or after `2021-01-01`. Available operators are `$eq`, `$lt`, `$lte`, `$gt`, `$gte`, and `$like`.

If you pass an array to a field, it will combine the conditions with `$and`:

```js
q('transactions')
  .filter({
    date: [{ $gte: '2021-01-01' }, { $lte: '2021-12-31' }]
  })
  .select('*')
```

This is the same query but restricts it to transactions between `2021-01-01` and `2021-12-31`. This could have been written as:

```js
q('transactions')
  .filter({
    $and: [
      { date: { $gte: '2021-01-01' } },
      { date: { $lte: '2021-12-31' } }
    ]
  })
  .select('*')
```

`$and` and `$or` takes an array and combines multiple conditions. For example, you could get transactions on multiple dates like this:

```js
q('transactions')
  .filter({
    $or: [
      { date: '2021-01-01' },
      { date: '2021-01-02' }
    ]
  })
  .select('*')
```

The above will return transactions on `2021-01-01` **or** `2021-01-02`.

### Searching by month or year

ActualQL supports various functions to convert data, as well as the ability to convert field data. For example, saying `{ $month: '2021-01-01' }` would come back with the month of `2021-01`. But we need a way to apply that to the `date` field, and we use `$transform` for that.

This part deserves better docs, but here's a reference example you can use to search by month or year:

```js
q('transactions')
  .filter({ date: { $transform: '$month', $eq: '2021-01' } })
  .select('*')
```

This would return all transactions in the month of `2021-01`. We've applied the `$month` function to the `date` field and applied the condition of equaling `2021-01`.

You can substitute `$year` to do the same thing for year.

## Joining tables

You might have noticed the `category.name` field in the first few examples. What exactly is that field, and why can't we just use `category`?

The `category` field in `transactions` is an `id`. You can give it a specific category id to filter by that; you don't want to give it a name like `Home` because multiple categories can exist with the same name in different groups. By giving it a category id, you know you are getting back transactions specific to that category.

However, you often don't have a category id and want to just quickly search by category name. Using the `.` operator in a field name will "poke through" to the referenced table and allow you access any fields on it. Here, we can access any fields on the `categories` table.

So filtering by `category.name` allows you to search by name instead of id. You could use any field for `category`; for example `{ 'category.is_income': true }` would find all income categories.

## Sorting

You can sort the results with the `orderBy` function:

```js
q('transactions')
  .filter({ 'category.is_income': true })
  .select('*')
  .orderBy('category.name')
```

This returns transactions with an income category sorted by category name. You can also pass an array to `orderBy` to sort by multiple fields.

## Aggregate functions

You can specify aggregate functions in `select` for things like sums and counts. An example:

```js
q('transactions')
  .filter({ 'category.name': 'Food' })
  .select({ total: { $sum: 'amount' } })
```

This sums up the amount of all transactions with the `Food` category (usually, you will filter by date too). **Aggregate results must be named**; here we named it `total`. You will get an error if you don't name it. (In the future, we may remove this restriction)

Since it's so common to select a single aggregate expression, ActualQL provides a different method for running them: `calculate`. The above query could be rewritten as:

```js
q('transactions')
  .filter({ 'category.name': 'Food' })
  .calculate({ $sum: 'amount' })
```

Not only did we not have to name the result, `data` in the result will also be the summed value itself. If you use `select`, data will be an array with one element. The difference is in the above you just use `data`, but if you used `select` you'd have to use `data[0].total`.
