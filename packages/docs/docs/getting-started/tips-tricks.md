---
sidebar_position: 1
title: 'Tips & Tricks'
---

## Undo/Redo {#undo-redo}

If you ever make a mistake, pressing <Key mod="ctrl" k="z" /> will undo, and pressing <Key mod="ctrl shift" k="z" /> will redo. Using the desktop app, this is an undo system that you can always rely on; any change can be undone and the UI will walk back in time. If you're using the web app, this is only good for the current session of the website. If you refresh, or close the browser tab, undo history is lost.

## Context Menus

Context menus (right-click menus) are available throughout Actual. Use the method based on your operating system and/or hardware to access them.

## Keyboard Shortcuts

Actual has a number of keyboard shortcuts that can help you navigate and manage the application more efficiently.

### The Command Palette

The Command Palette is a powerful tool which allows you to quickly access various features and functions within Actual.

- Open it by pressing the <Key mod="ctrl" fixed k="k" /> combination.
- On macOS keyboards, use the <Key mod="cmd" fixed k="k" /> key combination.

![Command Palette](/img/tips-tricks/command-palette.webp)

Once open, you can start typing to search for the functions in the sidebar, or you can use the arrow keys to navigate
through the list of available commands. You can also quickly move to any of the available accounts by typing their name.

### General shortcuts

- <Key k="?" /> will open the help menu. The Help Menu contains links to the Documentation, Community support (Discord) and the Keyboard shortcuts.
- <Key mod="ctrl" k="O" /> (the letter O, not zero) this will close the budget and list other available budgets to open.
- <Key mod="shift" mod="ctrl" k="P" /> [Toggle the privacy filter.](#scramble-hide)
- <Key mod="ctrl" fixed k="k" /> Open Command Palette.
- <Key mod="ctrl" k="z" /> Undo.
- <Key mod="ctrl shift" k="z" /> Redo.

### Budget page shortcuts

- <Key k="enter" /> while editing a budget amount will move to the next category.
- <Key mod="shift" k="enter" /> Move to the previous budget category.
- <Key k="0" /> (zero) View the current month.
- <Key arrow="left" /> View the previous month.
- <Key arrow="right" /> View the next month.

### Account page shortcuts

- <Key mod="ctrl" k="B" /> Initiate bank sync.
- <Key mod="ctrl" k="I" /> ( i ) Import transactions.
- <Key k="t" /> Add new transaction with date picker open.
- <Key k="f" /> Show only selected transactions. If no transaction is selected, it brings up the Filter dropdown menu.

#### Selection shortcuts

- <Key mod="ctrl" k="A" /> Toggle selection of all transactions or deselection of all selected transactions.
- <Key k="space" /> Toggle selection of current transaction.
- <Key mod="shift" k="space" /> Select all transactions between current transaction and most recently selected transaction.
- <Key k="J" /> or <Key arrow="down" /> With a transaction selected, move to the next transaction down. Hold to scroll down.
- <Key k="K" /> or <Key arrow="up" /> With a transaction selected, move to the next transaction up. Hold to scroll up.

#### Transaction shortcuts

- <Key k="enter" /> when editing will move down. In a dropdown, this will save the value and close the dropdown. in either the Payment or Deposit columns this will add the transaction; the form remains open for the next addition.
- <Key mod="shift" k="enter" /> when editing will move up. In a dropdown, this will save the value and close the dropdown.
- <Key mod="ctrl" k="enter" /> will add the transaction and close the form regardless of where you are editing.
- <Key k="tab" /> when editing will move right. This will save the value and close an open dropdown.
- <Key mod="shift" k="tab" /> when editing will move left. This will save the value and close an open dropdown.

#### When Managing Transactions

:::important
Transaction(s) must be selected for the following shortcuts, or as noted.

See [Bulk Actions](/docs/transactions/bulk-editing.md) for guidance on working with multiple transactions.
:::

- <Key k="e" /> Open date picker and set date for selected transactions.
- <Key k="p" /> Set payee for selected transactions.
- <Key k="n" /> Set notes for selected transactions.
- <Key k="c" /> Set category for selected transactions.
- <Key k="m" /> Set amount for selected transactions.
- <Key k="l" /> Toggle cleared status for selected transactions.
- <Key k="a" /> Set account for selected transactions.
- <Key k="S" /> Link or view schedule for selected transactions.
- <Key k="f" /> Show only selected transactions. If no transaction is selected, it brings up the Filter dropdown menu.
- <Key k="d" /> Delete selected transactions.
- <Key k="u" /> Duplicate selected transactions.
- <Key k="g" /> Merge selected transactions. Only _two_ transactions with equal amounts can be selected. [Learn more.](/docs/transactions/merging.md)

## How to View Multiple Months at Once

In the top left of the budget, you will see this control:

![Months selector](/img/tips-tricks/months-selector.webp)

This sets the maximum amount of months to render at once, and defaults to 1. If you want to view multiple months on the same page, click the boxes to increase the number.

:::note
This only controls the _maximum_ number of months. If the app is too small to render all of them it will only render the months that fit on the screen.
:::

## Scramble and Hide Data {#scramble-hide}

Actual Budget includes a privacy filter to help you obfuscate sensitive _amounts_ on screen.

:::important
The privacy filter is visual only: it does not encrypt, delete, or alter your saved data or exports.

Be advised that when you hover over scrambled items, the amounts will be shown. This is a feature to help you see the actual amounts when you need them, but it may not be suitable for sharing screenshots or screen recordings.
:::

**Turn it on**: Click the _eye icon_ in the top-right corner of the app or use the shortcut <Key mod="shift" mod="ctrl" k="P" />.

![Top right corner](/img/a-tour-of-actual/tour-overview-top-right.webp)

When enabled, only currency amounts are scrambled so you can take screenshots or share your screen without exposing real numbers.

![Top right corner](/img/tips-tricks/scrambled-scrambled-view.webp)

What changes when the filter is on:

- Hidden/Scrambled: account balances, budgeted/available amounts, transaction amounts, totals in reports and widgets.
- Remain Visible: account names, category group and category names, payee names, transaction dates, notes/memos, flags, cleared status, and the presence of individual transactions (only the amounts are scrambled).

**Turn it off**: Click the _eye icon_ or <Key mod="shift" mod="ctrl" k="P" /> again to restore normal viewing. This will show the data in its original form.

## Show The Running Balance

A "running balance" is the balance of the account after every transaction over time. This is very useful for reconciling accounts with banks because you can see the balance at a specific date and use it to compare it with your bank. Note that the "Show running balance" option and column is only available when the list of transactions is sorted by date in descending order.

To enable this:

1. Click on an account.
2. Click on the 3 dots to show the actions menu.
3. Select "Show running balance".

A new column should appear which shows the balance of the account after each transaction:

![Show running balance](/img/tips-tricks/running-balance.webp)

## Using Emojis in Actual

Actual supports emojis in many places, including payees, categories, and notes. You can use emojis to add visual
flair to your budget and make it more fun to use.

To add an emoji, you can use the emoji picker on your operating system, or you can copy and paste emojis from web sites
like [Emojipedia](https://emojipedia.org/), [EmojiDB](https://emojidb.org/) or [Get Emoji](https://getemoji.com/).

![Emojis everywhere](/img/tips-tricks/using-emojis.webp)

:::tip[HINT]

To scrub emojis out of an exported list, use the formula `=REGEXREPLACE(text or cell reference, "[^\x00-\x7F]", "")` in Excel or Google sheets.

:::

By using emojis on the accounts, you can have grouping of accounts by type, such as credit cards, expenses, and savings.

## Math Operators

When entering amounts for transactions, math operators can be used to calculate a final value.

For example when splitting a transaction, you can input `16.99*1.1` in the subcategory's payment field to apply a 10% tax rate to the amount, which would display `$18.69` once entered.
