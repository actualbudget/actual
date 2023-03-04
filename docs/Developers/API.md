---
title: API Reference
---

import { types, objects, PrimitiveTypeList, PrimitiveType, StructType, Method, MethodBox } from './types';
import APIList from './APIList';

This is the documentation of all available API methods. The API has not been released yet, but it will be available in the next update. This section is a work in progress.

<APIList title="Transactions" sections={[
"Transaction",
"addTransactions",
"importTransactions",
"getTransactions",
"filterTransactions",
"updateTransaction",
"deleteTransaction"
]} />

<APIList title="Accounts" sections={[
"Account",
"getAccounts",
"createAccount",
"updateAccount",
"closeAccount",
"reopenAccount",
"deleteAccount"
]} />

<APIList title="Categories" sections={[
"Category",
"getCategories",
"createCategory",
"updateCategory",
"deleteCategory"
]} />

<APIList title="Category Groups" sections={[
"Category group",
"getCategoryGroups",
"createCategoryGroup",
"updateCategoryGroup",
"deleteCategoryGroup"
]} />

<APIList title="Payees" sections={[
"Payee",
"getPayees",
"createPayee",
"updatePayee",
"deletePayee"
]} />

<APIList title="Payee rules" sections={[
"Payee rule",
"getPayeeRules",
"createPayeeRule",
"updatePayeeRule",
"deletePayeeRule"
]} />

## Types of methods

API methods are categorized into one of four types:

- `get`
- `create`
- `update`
- `delete`

Objects may have fields specific for a type of method. For example, the `payee` field of a `transaction` is only available in a `create` method. This field doesn't exist in objects returned from a `get` method (`payee_id` is used instead).

Fields specific to a type of request are marked as such in the notes.

`id` is a special field. All objects have an `id` field. However, you don't need to specify an `id` in a `create` method; all `create` methods will return the created `id` back to you.

All `update` and `delete` methods take an `id` to specify the desired object. `update` takes the fields to update as a second argument — it does not take a full object. That means even if a field is required, you don't have to pass it to `update`. For example, a `category` requires the `group_id` field, however `updateCategory(id, { name: "Food" })` is a valid call. Required means that an `update` can't set the field to `null` and `create` method must always have it.

## Primitives

These are types.

<PrimitiveTypeList />

## Budgets

#### `getBudgetMonths`

<Method name="getBudgetMonths" args={[]}  returns="Promise<month[]>" />

#### `getBudgetMonth`

<Method name="getBudgetMonth" args={[{ name: 'month', type: 'month' }]} returns="Promise<Budget>" />

#### `setBudgetAmount`

<Method name="setBudgetAmount" args={[{ name: 'month', type: 'month' }, { name: 'categoryId', type: 'id' }, { name: 'value', type: 'amount' }]} returns="Promise<null>" />

#### `setBudgetCarryover`

<Method name="setBudgetCarryover" args={[{ name: 'month', type: 'month' }, { name: 'categoryId', type: 'id' }, { name: 'flag', type: 'bool' }]} returns="Promise<null>" />

#### Examples

## Transactions

#### Transaction

<StructType fields={objects.transaction} />

#### Split transactions

A split transaction has several sub-transactions that split the total
amount across them. You can create a split transaction by specifying
an an array of sub-transactions in the `subtransactions` field.

Subtransactions can specify the following fields, and `amount` is the only required field:

- `amount`
- `category_id`
- `notes`

If the amounts of the sub-transactions do not equal the total amount
of the transaction, currently the API call will succeed but an error
with be displayed within the app.

#### Transfers

Existing transfers will have the `transfer_id` field which points to the transaction on the other side. **You should not change this** or you will cause unexpected behavior. (You are allowed to set this when importing, however.)

If you want to create a transfer, use the transfer payee for the account you wish to transfer to/from. Load the payees, use the [`transfer_acct`](#payee) field of the payee to find the account you want to transfer to/from assign that payee to the transaction. A transfer with a transaction in both accounts will be created. (See [transfer payees](#transfers-1).)

#### Methods

#### `addTransactions`

<Method name="addTransactions" args={[{ name: 'accountId', type: 'id'}, { name: 'transactions', type: 'Transaction[]'}]} returns="Promise<id[]>" />

Adds multiple transactions at once. Does not reconcile (see `importTransactions`). Returns an array of ids of the newly created transactions.

If a transfer payee is given, this method does **not** create a transfer. Use `importTransactions` if you want to create transfers.

You probably want to use `importTransactions`. This method is mainly for custom importers that want to skip all the automatic stuff because it wants to create raw data.

#### `importTransactions`

<Method name="importTransactions" args={[{ name: 'accountId', type: 'id'}, { name: 'transactions', type: 'Transaction[]'}]} returns="Promise<{ errors, added, updated }>" />

Adds multiple transactions at once, but goes through the same process as importing a file or downloading transactions from a bank. You probably want to use this one. Returns an array of ids of the newly created transactions.

The import will "reconcile" transactions to avoid adding duplicates. Transactions with the same `imported_id` will never be added more than once. Otherwise, the system will match transactions with the same amount and with similar dates and payees and try to avoid duplicates. If not using `imported_id` you should check the results after importing.

It will also create transfers if a transfer payee is specified. See [transfers](#transfers).

This method returns an object with the following fields:

- `added`: an array of ids of transactions that were added
- `updated`: an array of ids of transactions that were updated (such as being cleared)
- `errors`: any errors that occurred during the process (most likely a single error with no changes to transactions)

#### `getTransactions`

<Method name="getTransactions" args={[{ name: 'accountId', type: 'id'}, { name: 'startDate', type: 'date' }, { name: 'endDate', type: 'date' }]} returns="Promise<Transaction[]>" />

Get all the transactions in `accountId` between the specified dates (inclusive). Returns an array of [`Transaction`](#transaction) objects.

#### `filterTransactions`

`filterTransactions` has been removed. Use [ActualQL](/developers/ActualQL/Overview/) instead.

#### `updateTransaction`

<Method name="updateTransaction" args={[{ name: 'id', type: 'id'}, { name: 'fields', type: 'object'} ]} />

Update fields of a transaction. `fields` can specify any field described in [`Transaction`](#transaction).

#### `deleteTransaction`

<Method name="deleteTransaction" args={[{ name: 'id', type: 'id'}]} />

Delete a transaction.

#### Examples

```js
// Create a transaction of $12.00. A payee of "Kroger" will be
// automatically created if it does not exist already and
// assigned to the transaction.

await importTransactions(accountId, [
  {
    account_id: 'e2564e8c-ec96-43d7-92ce-3b91ee9d2d69',
    date: '2019-08-20',
    amount: 1200,
    payee: 'Kroger',
    category_id: 'c179c3f4-28a6-4fbd-a54d-195cced07a80',
  },
]);
```

```js
// Get all transactions in an account for the month of August
// (it doesn't matter that August 31st doesn't exist).

await getTransactions(accountId, '2019-08-01', '2019-08-31');
```

```js
// Find transactions with the amount of 3.91. Currently this
// assumes you are using a currency with two decimal places.
await filterTransactions(accountId, '3.91');
```

```js
// Assign the "Food" category to a transaction

let categories = await getCategories();
let foodCategory = category.find(cat => cat.name === 'Food');
await updateTransaction(id, { category_id: foodCategory.id });
```

## Accounts

#### Account

<StructType fields={objects.account} />

#### Account types

The account type must be one of these valid strings:

- `checking`
- `savings`
- `credit`
- `investment`
- `mortgage`
- `debt`
- `other`

The account type does not effect anything currently. It's simply extra information about the account.

#### Closing accounts

Avoid setting the `closed` property directly to close an account; instead use the `closeAccount` method. If the account still has money in it you will be required to specify another account to transfer the current balance to. This will help track your money correctly.

If you want to fully delete an account and remove it entirely from the system, use [`deleteAccount`](#deleteaccount). Note that if it's an on-budget account, any money coming from that account will disappear.

#### Methods

#### `getAccounts`

<Method name="getAccounts" args={[]} returns="Promise<Account[]>" />

Get all accounts. Returns an array of [`Account`](#account) objects.

#### `createAccount`

<Method name="createAccount" args={[{ name: 'account', type: 'Account' }, { name: 'initialBalance = 0', type: 'amount?' }]} returns="Promise<id>" />

Create an account with an initial balance of `initialBalance` (defaults to 0). Remember that [`amount`](#primitives) has no decimal places. Returns the `id` of the new account.

#### `updateAccount`

<Method name="updateAccount" args={[{ name: 'id', type: 'id' }, { name: 'fields', type: 'object' }]} />

Update fields of an account. `fields` can specify any field described in [`Account`](#account).

#### `closeAccount`

<Method name="closeAccount" args={[{ name: 'id', type: 'id' }, { name: 'transferAccountId', type: 'id?' }, { name: 'transferCategoryId', type: 'id?' }]} />

Close an account. `transferAccountId` and `transferCategoryId` are optional if the balance of the account is 0, otherwise see next paragraph.

If the account has a non-zero balance, you need to specify an account with `transferAccountId` to transfer the money into. If you are transferring from an on-budget account to an off-budget account, you can optionally specify a category with `transferCategoryId` to categorize the transfer transaction.

Tranferring money to an off-budget account needs a category because money is taken out of the budget, so it needs to come from somewhere.

If you want to simply delete an account, see [`deleteAccount`](#deleteaccount).

#### `reopenAccount`

<Method name="reopenAccount" args={[{ name: 'id', type: 'id' }]} />

Reopen a closed account.

#### `deleteAccount`

<Method name="deleteAccount" args={[{ name: 'id', type: 'id' }]} />

Delete an account.

#### Examples

```js
// Create a savings accounts
createAccount({
  name: "Ally Savings",
  type: "savings
})
```

```js
// Get all accounts

let accounts = await getAccounts();
```

## Categories

#### Category

<StructType fields={objects.category} />

#### Methods

#### `getCategories`

<Method name="getCategories" args={[]} returns="Promise<Categories[]>" />

Get all categories.

#### `createCategory`

<Method name="createCategory" args={[{ name: 'category', type: 'Category' }]} returns="Promise<id>" />

Create a category. Returns the `id` of the new account.

#### `updateCategory`

<Method name="updateCategory" args={[{ name: 'id', type: 'id' }, { name: 'fields', type: 'object' }]} returns="Promise<null>" />

Update fields of a category. `fields` can specify any field described in [`Category`](#category).

#### `deleteCategory`

<Method name="deleteCategory" args={[{ name: 'id', type: 'id' }]} returns="Promise<null>" />

Delete a category.

### Examples

```js
{
  name: "Food",
  group_id: "238d4d38-a512-4e28-9bbe-e96fd5d99251"
}
```

#### Income categories

Set `is_income` to `true` to create an income category. The `group_id` of the category should point to the existing income group category (currently only one ever exists, see [category group](#category-group)).

## Category groups

#### Category group

<StructType fields={objects.categoryGroup} />

```js
{
  name: 'Bills';
}
```

#### Income category groups

There should only ever be one income category group,

#### Methods

#### `getCategoryGroups`

<Method name="getCategoryGroups" args={[]} returns="Promise<CategoryGroup[]>" />

Get all category groups.

#### `createCategoryGroup`

<Method name="createCategoryGroup" args={[{ name: 'group', type: 'CategoryGroup' }]} returns="Promise<id>" />

Create a category group. Returns the `id` of the new group.

#### `updateCategoryGroup`

<Method name="updateCategoryGroup" args={[{ name: 'id', type: 'id' }, { name: 'fields', type: 'object' }]} returns="Promise<id>" />

Update fields of a category group. `fields` can specify any field described in [`CategoryGroup`](#categorygroup).

#### `deleteCategoryGroup`

<Method name="deleteCategoryGroup" args={[{ name: 'id', type: 'id' }]} returns="Promise<null>" />

Delete a category group.

#### Examples

## Payees

#### Payee

<StructType fields={objects.payee} />

```js
{
  name: "Kroger",
  category: "a1bccbd1-039e-410a-ba05-a76b97a74fc8"
}
```

#### Transfers

Transfers use payees to indicate which accounts to transfer money to/from. This lets the system use the same payee matching logic to manage transfers as well.

Each account has a corresponding "transfer payee" already created in the system. If a payee is a transfer payee, it will have the `transfer_acct` field set to an account id. Use this to create transfer transactions with [`importTransactions`](#importtransactions).

#### Methods

#### `getPayees`

<Method name="getPayees" args={[]} returns="Promise<Payee[]>" />

Get all payees.

#### `createPayee`

<Method name="createPayee" args={[{ name: 'payee', type: 'Payee' }]} returns="Promise<id>" />

Create a payee. Returns the `id` of the new payee.

#### `updatePayee`

<Method name="updatePayee" args={[{ name: 'id', type: 'id' }, { name: 'fields', type: 'object' }]} returns="Promise<id>" />

Update fields of a payee. `fields` can specify any field described in [`Payee`](#payee).

#### `deletePayee`

<Method name="deletePayee" args={[{ name: 'id', type: 'id' }]} returns="Promise<null>" />

Delete a payee.

#### Examples

## Payee rules

#### Payee rule

<StructType fields={objects.payeeRule} />

#### Methods

#### `getPayeeRules`

<Method name="getPayees" args={[{ name: 'payeeId', type: "id" }]} returns="Promise<PayeeRule[]>" />

Get all payees rules for `payeeId`.

#### `createPayeeRule`

<Method name="createPayeeRule" args={[{ name: 'payeeId', type: 'id' }, { name: 'rule', type: 'PayeeRule' }]} returns="Promise<id>" />

Create a payee rule for `payeeId`. Returns the `id` of the new rule.

#### `updatePayeeRule`

<Method name="updatePayeeRule" args={[{ name: 'id', type: 'id' }, { name: 'fields', type: 'object' }]} returns="Promise<id>" />

Update fields of a payee rule. `fields` can specify any field described in [`PayeeRule`](#payeerule).

#### `deletePayeeRule`

<Method name="deletePayeeRule" args={[{ name: 'id', type: 'id' }]} returns="Promise<null>" />

Delete a payee rule.

#### Examples

```js
{
  payee_id: "08fc54b5-3baa-4874-bef4-470c238d25ac",
  type: "contains",
  value: "grocery"
}
```
