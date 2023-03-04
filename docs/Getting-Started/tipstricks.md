---
sidebar_position: 1
title: 'Tips & Tricks'
---

## Undo/redo

If you ever make a mistake, pressing `CTRL & Z` will undo, and `CTRL, SHIFT & Z` will redo. This is an undo system that you can rely on; any change can be undone and the UI will walk back in time.

## Keyboard shortcuts

A few global shortcuts:

- `Ctrl & 1` will show the budget
- `Ctrl & 2` will show reports
- `Ctrl & 3` will show all accounts
- `Ctrl & o` will close the file and list other available files to open

### Budget

- `Enter` while editing a budget amount will move to the next category.
- `shift & Enter` will move to the previous category.

### Transactions

- When editing, `Enter` and `shift & Enter` will move down and up. If a dropdown is open and you've typed a new value, this will instead save the value and close the dropdown.
- When editing, `Tab` and `Shift & Tab` will move left and right
- When adding a new transaction, `CTRL & Enter` will add it regardless of where you are editing. Pressing `Enter` in either the Payment or Deposit columns will add it as well.

## View multiple months at once

In the top left of the budget, you will see this control:

![](/img/months-selector.png)

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

![](/img/running-balance.png)
