---
sidebar_position: 1
title: 'Tips & Tricks'
---

## Undo/redo

If you ever make a mistake, pressing <Key mod="cmd" k="z" /> will undo, and pressing <Key mod="cmd shift" k="z" /> will redo. This is an undo system that you can rely on; any change can be undone and the UI will walk back in time.

## Keyboard shortcuts

Firstly, a few global shortcuts for the Electron App that is still in development. Please be aware that these global shortcuts do not work in the web app:

- <Key mod="cmd" k="1" /> will show the budget
- <Key mod="cmd" k="2" /> will show reports
- <Key mod="cmd" k="3" /> will show all accounts
 
BUT here is one that WILL work in the web app as well:
- <Key mod="cmd" k="O" /> (O not zero) this will close the file and list other available files to open

### Budget

- <Key k="enter" /> while editing a budget amount will move to the next category.
- <Key mod="shift" k="enter" /> will move to the previous category.

### Transaction Editing

- When editing, <Key k="enter" /> and <Key mod="shift" k="enter" /> will move down and up. If a dropdown is open and you've typed a new value, this will instead save the value and close the dropdown.
- When editing, <Key k="tab" /> and <Key mod="shift" k="tab" /> will move left and right
- When adding a new transaction, <Key mod="cmd" k="enter" /> will add it regardless of where you are editing. Pressing <Key k="enter" /> in either the Payment or Deposit columns will add it as well.

### Transaction Management

- <Key k="f" /> Show only selected transactions.
- <Key k="d" /> Delete selected transactions.
- <Key k="a" /> Set account for selected transations.
- <Key k="p" /> set payee for selected transactions.
- <Key k="n" /> Set notes for selected transactions.
- <Key k="c" /> Set category for selected transactions.
- <Key k="l" /> Toggle cleared for current transaction.

The following require a transaction to have been selected first:

- <Key k="J" />/<Key arrow="down" /> Move to the next transaction down.
- <Key k="K" />/<Key arrow="up" /> Move to the next transaction up.
- <Key k="space" /> Toggle selection of current transaction.
- <Key mod="shift" k="space" /> Add all transactions between current transaction and most recently selected transaction.

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
