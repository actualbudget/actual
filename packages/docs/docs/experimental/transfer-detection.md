# Transfer Detection for Imported Transactions

<ExperimentalFeatureWarning issueId="1628" />

When you move money between two of your own accounts, your bank reports it twice: once as money leaving the first account, and once as money arriving in the second. [File imports](../transactions/importing.md) bring these in as two separate transactions, so the movement looks like spending in one account and income in the other.

With this feature turned on, Actual recognizes the two transactions when they come in through a file import, and links them as a [transfer](../transactions/transfers.md) for you.

## Turning On Transfer Detection

Transfer detection is an experimental feature, so it's switched off until you enable it:

1. Open **Settings** from the sidebar.
2. Click **Show advanced settings**.
3. Open **Experimental features** and acknowledge the warning.
4. Tick **Transfer detection for imported transactions**.

Turning the feature off stops Actual from linking new transactions. Transfers that were already linked stay linked.

## How Actual Recognizes a Transfer

Every time a file import adds a new transaction, Actual looks for the other side of it. Two transactions are linked when all of the following are true:

- They are in two different accounts, and neither account is closed.
- The amounts are exactly the same but inverted, for example a payment of $250.00 and a deposit of $250.00.
- Their dates are at most 3 days apart.
- Neither of them is already a transfer, part of a split transaction, a starting balance or a reconciled (locked) transaction.
- There is no other possible match. If Actual finds two payments of $250.00 that could belong to the same deposit, it doesn't guess and leaves all of them alone.

The other side can also be a transaction that is already in the other account, including one you added by hand.

## What Happens to the Linked Transactions

Linking does the same thing as selecting both transactions and choosing [**Make transfer**](../transactions/transfers.md#make-a-transfer-from-two-existing-transactions):

- The payee of each transaction changes to the other account. The payee name that your bank reported is kept, and you can still see it by hovering over the payee.
- The category is removed when both accounts are on budget, or both are off budget. A transfer between an on budget account and an off budget account keeps its category. See [Transfer Categories](../transactions/transfers.md#transfer-categories).
- Amounts, dates and notes are not changed.

After the import, the transaction that was already in the other account is marked there with a link icon, the same way as any other transaction that an import updated.

:::note
Transfer detection runs when an import adds transactions, and each new transaction can be matched with one already in your accounts. It doesn't go back to link pairs where both transactions were already there, such as transfers imported before you turned this feature on. Link those yourself with [**Make transfer**](../transactions/transfers.md#make-a-transfer-from-two-existing-transactions).
:::

## Fixing a Wrong Match

Two unrelated transactions can look like a transfer. For example, a $40.00 purchase from your checking account and a $40.00 refund on your credit card two days later.

To undo a wrong match, right-click either of the two transactions and choose **Unlink transfer**. Both transactions stay. Each one gets back the payee name that your bank reported, and your [rules](../budgeting/rules/index.md) run on it again, so a rule that sets its category or renames its payee applies as it did when it was imported.

Changing the payee of one side by hand also ends the transfer, but it removes the other side, the same way it does for any other transfer. Use **Unlink transfer** to keep both.

## Known Limitations

- Amounts have to match exactly. A transfer with a fee taken out of it, or a transfer between two currencies, is not recognized.
- If you use a [rule](../budgeting/rules/index.md) to turn imported transactions into transfers, that rule still creates a new transaction in the other account, even when a matching one is already there.
- Actual decides on a match at the end of each import. If a second possible match arrives later, the link that was already made stays.
