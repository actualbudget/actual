---
sidebar_position: 1
title: 'Tips & Tricks'
---

## Undo/Redo {#undo-redo}

If you ever make a mistake, pressing <Key mod="cmd" k="z" /> will undo, and pressing <Key mod="cmd shift" k="z" /> will redo. Using the desktop app, this is an undo system that you can always rely on; any change can be undone and the UI will walk back in time.  If you're using the web app, this is only good for the current session of the website. If you refresh, or close the browser tab, undo history is lost.

## Keyboard Shortcuts

Actual has a number of keyboard shortcuts that can help you navigate and manage the application more efficiently.
Below is a list of the most useful shortcuts.

### The Command Palette

The Command Palette is a powerful tool which allows you to quickly access various features and functions within Actual.
- On Windows and Linux, you can open it by pressing the <Key mod="ctrl" fixed k="k" /> combination to open the Command Palette.
- On macOS, you can use the <Key mod="cmd" fixed k="k" /> or the <Key mod="ctrl" fixed k="k" /> key combinations to open the Command Palette.

![Command Palette](/img/tips-tricks/command-palette.png)

Once open, you can start typing to search for the functions in the sidebar, or you can use the arrow keys to navigate
through the list of available commands. You can also quickly move to any of the available accounts by typing their name.


### Other Global Shortcuts

-  <Key mod="ctrl" k="O" /> (the letter O, not zero) this will close the file and list other available files to open.
   On macOS, you can also use the <Key mod="cmd" k="O" /> key combination.


### Within the Budget View

- <Key k="enter" /> while editing a budget amount will move to the next category.
- <Key mod="shift" k="enter" /> will move to the previous category.

### When Editing Transactions

- When editing, <Key k="enter" /> and <Key mod="shift" k="enter" /> will move down and up. If a dropdown is open and you've typed a new value, this will instead save the value and close the dropdown.
- When editing, <Key k="tab" /> and <Key mod="shift" k="tab" /> will move left and right
- When adding a new transaction, <Key mod="cmd" k="enter" /> will add it regardless of where you are editing. Pressing <Key k="enter" /> in either the Payment or Deposit columns will add it as well.

### When Managing Transactions

- <Key k="f" /> Show only selected transactions.
- <Key k="d" /> Delete selected transactions.
- <Key k="u" /> Duplicate selected transactions.
- <Key k="g" /> Merge selected transactions
- <Key k="t" /> Set date for selected transactions.
- <Key k="a" /> Set account for selected transactions.
- <Key k="p" /> set payee for selected transactions.
- <Key k="n" /> Set notes for selected transactions.
- <Key k="c" /> Set category for selected transactions.
- <Key k="m" /> Set amount for selected transactions.
- <Key k="l" /> Toggle cleared for current transaction.

The following require a transaction to have been selected first:

- <Key k="J" />/<Key arrow="down" /> Move to the next transaction down.
- <Key k="K" />/<Key arrow="up" /> Move to the next transaction up.
- <Key k="space" /> Toggle selection of current transaction.
- <Key mod="shift" k="space" /> Add all transactions between current transaction and most recently selected transaction.

## How to View Multiple Months at Once

In the top left of the budget, you will see this control:

![Months selector](/img/tips-tricks/months-selector.png)

This sets the maximum amount of months to render at once, and defaults to 1. If you want to view multiple months on the same page, click the boxes to increase the number.

:::note
This only controls the _maximum_ number of months. If the app is too small to render all of them it will only render the months that fit on the screen.
:::

## Scramble and Hide Data

Actual Budget includes a privacy filter to help you obfuscate sensitive *amounts* on screen.

:::important
Be advised that when you hover over scrambled items, the amounts will be shown. This is a feature to help you see the actual amounts when you need them, but it may not be suitable for sharing screenshots or screen recordings.
:::

**Turn it on**: Click the _eye icon_ in the top-right corner of the app.

![Top right corner](/img/a-tour-of-actual/tour-overview-top-right.png)

When enabled, only currency amounts are scrambled so you can take screenshots or share your screen without exposing real numbers.

![Top right corner](/img/tips-tricks/scrambled-scrambled-view.png)

What changes when the filter is on
- Hidden/Scrambled: account balances, budgeted/available amounts, transaction amounts, totals in reports and widgets.
- Remain Visible: account names, category group and category names, payee names, transaction dates, notes/memos, flags, cleared status, and the presence of individual transactions (only the amounts are scrambled).

:::note
The privacy filter is visual only: it does not encrypt, delete, or alter your saved data or exports.
:::


**Turn it off**: Click the _eye icon_ again to restore normal viewing. This will show the data in its original form.



## Show The Running Balance

A "running balance" is the balance of the account after every transaction over time. This is very useful for reconciling accounts with banks because you can see the balance at a specific date and use it to compare it with your bank. Note that the "Show running balance" option and column is only available when the list of transactions is sorted by date in descending order.

To enable this:

1. Click on an account
2. Click on the 3 dots to show the actions menu
3. Select "Show running balance"

A new column should appear which shows the balance of the account after each transaction:

![Show running balance](/img/tips-tricks/running-balance.png)


## Using Emojis in Actual

Actual supports emojis in many places, including payees, categories, and notes. You can use emojis to add visual
flair to your budget and make it more fun to use.

To add an emoji, you can use the emoji picker on your operating system, or you can copy and paste emojis from web sites
like [Emojipedia](https://emojipedia.org/), [EmojiDB](https://emojidb.org/) or [Get Emoji](https://getemoji.com/).

![Emojis everywhere](/img/tips-tricks/using-emojis.png)

By using emojis on the accounts, you can have grouping of accounts by type, such as credit cards, expenses, and savings.

## Math Operators

When entering amounts for transactions, math operators can be used to calculate a final value.

For example when splitting a transaction, you can input `16.99*1.1` in the subcategory's payment field to apply a 10% tax rate to the amount, which would display `$18.69` once entered.
