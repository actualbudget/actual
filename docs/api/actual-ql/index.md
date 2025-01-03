# ActualQL Overview

## Introduction

ActualQL is a new query language introduced in 0.0.129. This allows you to query data any way you like. For example, previously we provided a `filterTransactions` method that let you search transactions, but its behavior was baked into the backend. You couldn't change how transactions were sorted, search certain fields specifically, or sum the total amount.

ActualQL provides a lightweight syntax for querying data. It looks like this:

```js
q('transactions')
  .filter({
    'category.name': 'Food',
    date: '2021-02-20',
  })
  .select(['id', 'date', 'amount']);
```

The above query would return the `id`, `date`, and `amount` of all transactions with the `Food` category on `2021-02-20`.

Currently the query language is mostly undocumented, but more docs will come soon. Most of Actual uses ActualQL, so you have access to the same functionality that Actual has.

Until we have better docs, here are few things you can do with ActualQL.

## Running a Query

You construct a query with `q` and run it with `runQuery`. The result is an object with a `data` prop. An example:

```js
let { q, runQuery } = require('@actual-app/api');

let { data } = await runQuery(q('transactions').select('*'));
```

`data` will be an array of all the transactions in the system.

## Specify Split Transaction Behavior

Split transactions complicate things: when you sum transaction amounts, do you sum up all the subtransactions or do you just use the top-level transaction? When selecting transactions, which ones do you want?

The `transactions` table provides two different interfaces for transaction data to help with this. You can configure the type of data to return using `options` and passing a `splits` option:

```js
q('transactions').select('*').options({ splits: 'inline' });
```

There are two different options for `splits`: `inline` or `grouped`<super>\*</super>. **`inline` is the default**, and will not return the "parent" transaction of a split transaction. It will only show you subtransactions of split transaction, and the result is a flat array of transactions. This lets you sum all the amounts of transactions and by default it will ignore the "parent" transaction.

`grouped` always returns the full split transaction (parent and subtransaction), no matter which part of it matched a filter. The returned data is also grouped so that transactions have a `subtransactions` property that lists them.

These two options give you full control over how you want to handle split transactions.

_\* There is a third option as well, `all`, which returns both transactions and subtransactions in a flat list. You only need this if doing something advanced._

## Searching Transactions

Calling `filter` applies conditions to the query; only data that matches the given filters will be returned.

The keys of a filter object are the names of the fields (see [Transaction](../reference.md#transaction)) and the values are the condition. By default, it will perform an "is equal" but you can also provide various operators. An example:

```js
q('transactions')
  .filter({
    'category.name': 'Food',
    date: { $gte: '2021-01-01' },
  })
  .select('*');
```

The `$gte` operator on `date` returns transactions on or after `2021-01-01`. Available operators are `$eq`, `$lt`, `$lte`, `$gt`, `$gte`, `$ne`, `$oneof`, `$regex`, `$like`, and `$notlike`.

If you pass an array to a field, it will combine the conditions with `$and`:

```js
q('transactions')
  .filter({
    date: [{ $gte: '2021-01-01' }, { $lte: '2021-12-31' }],
  })
  .select('*');
```

This is the same query but restricts it to transactions between `2021-01-01` and `2021-12-31`. This could have been written as:

```js
q('transactions')
  .filter({
    $and: [{ date: { $gte: '2021-01-01' } }, { date: { $lte: '2021-12-31' } }],
  })
  .select('*');
```

`$and` and `$or` takes an array and combines multiple conditions. For example, you could get transactions on multiple dates like this:

```js
q('transactions')
  .filter({
    $or: [{ date: '2021-01-01' }, { date: '2021-01-02' }],
  })
  .select('*');
```

The above will return transactions on `2021-01-01` **or** `2021-01-02`.
