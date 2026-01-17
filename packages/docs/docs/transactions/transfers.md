# Transfers

If you want to transfer money between accounts, you will want to do it in a way that doesn't mess up reports. If you only created two transactions, Actual would have no way of knowing they are a single transfer and can be ignored in reports.

When you create a transfer in Actual, those two transactions are linked and updating one always automatically updates the other. For example, if you typed something into the **Notes** column it would appear in both transactions.

![](/img/transfers/transfer-complete.webp)

## Creating a transfer

In the **Payee** field of a transaction, choose the account in the dropdown you want to transfer to/from. You can press **Make Transfer** if you want to just see a list of accounts and hide other payees.

![](/img/transfers/payees-dropdown.webp)

:::caution
A transaction in the corresponding account will automatically be created.
:::

If you are importing files, it is recommended to import into a single account and create the transfer first, and then import the second account. This way the transaction in the second account is automatically reconciled to the transfer transaction. If you imported to both accounts first, you can [make a transfer from the already imported transactions](#make-a-transfer-from-two-existing-transactions).

### Make a transfer from two existing transactions

:::note
This process will only apply when the below conditions are met

- The two transactions are related to different accounts
- The amounts are exactly the same but inverted e.g. a **debit** of `1.00` and a **credit** of `1.00`

:::

Make a transfer of existing transactions in the same way you [bulk-edit transactions](bulk-editing.md).

![](/img/transfers/make-transfer-tooltip.webp)

1. Go to a multi-account view like "All accounts" so that you can see all transactions.
2. Identify the transactions that you wish to change and select the tick box in the left hand column (by the date column).
3. Go to the drop down top right (the arrow below "2 transactions")
4. If the transactions are valid to be converted to a transfer, you can click **Make transfer**.

## Deleting a transfer

Delete a transfer the same way you delete any transaction: hover over it and press the **X** on the left. Deleting a transfer transaction always deletes both the transaction in the currently open account, as well as the transfer transaction in the other account.

## Transfer Categories

Transfers between On Budget accounts don't have a category. This is because the funds never left your budget. One way to think about this is that the funds both left and entered your budget thus canceling each other out. Actual marks these types of transfers with _`Transfer`_ in the category field.

Transfers between Off Budget and On Budget accounts are different. Only one half of the transfer exists on your budget and, from the perspective of your budget, is the same as a regular transaction. You can create these transfers just the same as an On Budget transfer, but you will be asked to assign a category on the On Budget side of the transfer.

## Payee rules

Transfers are actually just custom payees, so if you want to you can [create custom rules for them](./payees.md#transfer-payees).
