---
sidebar_position: 1
title: 'Tips & Tricks'
---

## Undo/redo

If you ever make a mistake, pressing `Ctrl & z` will undo, and `Ctrl, Shift & z` will redo. This is an undo system that you can rely on; any change can be undone and the UI will walk back in time.

## Keyboard shortcuts

A few global shortcuts:

- `Ctrl & 1` will show the budget
- `Ctrl & 2` will show reports
- `Ctrl & 3` will show all accounts
- `Ctrl & o` will close the file and list other available files to open

### Budget

- `Enter` while editing a budget amount will move to the next category.
- `Shift & Enter` will move to the previous category.

### Transaction Editing

- When editing, `Enter` and `Shift & Enter` will move down and up. If a dropdown is open and you've typed a new value, this will instead save the value and close the dropdown.
- When editing, `Tab` and `Shift & Tab` will move left and right
- When adding a new transaction, `Ctrl & Enter` will add it regardless of where you are editing. Pressing `Enter` in either the Payment or Deposit columns will add it as well.

### Transaction Management

- `f` Show only selected transactions.
- `d` Delete selected transactions.
- `a` Set account for selected transations.
- `p` set payee for selected transactions.
- `n` Set notes for selected transactions.
- `c` Set category for selected transactions.
- `l` Toggle cleared for current transaction.

The following require a transaction to have been selected first:

- `j/Down Arrow` Move to the next transaction down.
- `k/Up Arrow` Move to the next transaction up.
- `Space` Toggle selection of current transaction.
- `Shift & Space` Add all transactions between current transaction and most recently selected transaction.

## View multiple months at once

In the top left of the budget, you will see this control:

![](/img/tips-tricks/months-selector.png)

This sets the maximum amount of months to render at once, and defaults to 1. If you want to view multiple months on the same page, click the boxes to increase the number.

:::note
This only controls the _maximum_ number of months. If the app is too small to render all of them it will only render the months that fit on the screen.
:::

## Show running balances

A "running balance" is the balance of the account after every transaction over time. This is very useful for reconciling accounts with banks because you can see the balance at a specific date and use it to compare it with your bank.

To enable this:

1. Click on an account
2. Click on the 3 dots to show the actions menu
3. Select "Show running balance"

A new column should appear which shows the balance of the account after each transaction:

![](/img/tips-tricks/running-balance.png)
