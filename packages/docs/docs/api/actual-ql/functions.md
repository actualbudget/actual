# ActualQL Functions

## Joining Tables

You might have noticed the `category.name` field in the first few examples. What exactly is that field, and why can't we just use `category`?

The `category` field in `transactions` is an `id`. You can give it a specific category id to filter by that; you don't want to give it a name like `Home` because multiple categories can exist with the same name in different groups. By giving it a category id, you know you are getting back transactions specific to that category.

However, you often don't have a category id and want to just quickly search by category name. Using the `.` operator in a field name will "poke through" to the referenced table and allow you to access any fields on it. Here, we can access any fields on the `categories` table.

So filtering by `category.name` allows you to search by name instead of id. You could use any field for `category`; for example `{ 'category.is_income': true }` would find all income categories.

## Sorting

You can sort the results with the `orderBy` function:

```js
q('transactions')
  .filter({ 'category.is_income': true })
  .select('*')
  .orderBy('category.name');
```

This returns transactions with an income category sorted by category name. You can also pass an array to `orderBy` to sort by multiple fields.

You can also change the sort order by specifying either `asc` or `desc`:

```js
q('transactions')
  .filter({ 'category.is_income': true })
  .select('*')
  .orderBy({ 'category.name': 'desc' });
```

## Aggregate Functions

You can specify aggregate functions in `select` for things like sums and counts. An example:

```js
q('transactions')
  .filter({ 'category.name': 'Food' })
  .select({ total: { $sum: '$amount' } });
```

This sums up the amount of all transactions with the `Food` category (usually, you will filter by date too). **Aggregate results must be named**; here we named it `total`. You will get an error if you don't name it. (In the future, we may remove this restriction)

Since it's so common to select a single aggregate expression, ActualQL provides a different method for running them: `calculate`. The above query could be rewritten as:

```js
q('transactions')
  .filter({ 'category.name': 'Food' })
  .calculate({ $sum: '$amount' });
```

Not only did we not have to name the result, `data` in the result will also be the summed value itself. If you use `select`, data will be an array with one element. The difference is that in the above you just use `data`, but if you used `select` you'd have to use `data[0].total`.
