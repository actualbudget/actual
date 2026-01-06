# Rules Examples

This page has examples of custom rules that some of our users have found useful for their own budgets. If you have any custom rules you're proud of, click the "Edit this page" button below to propose adding them to this page [tell us about them](/contact)!

### Q: How do I set the payee when the payee name changes between transactions

**A:** Sometimes the payee shows up slightly differently from transaction to transaction. To set the same payee every time and not create a new one every time a new transaction is imported, use a **Pre** rule that reads the imported payee field and finds the merchant name using a "contains" condition.

![](/img/rules-custom/custom-rules-imported-payee.webp)

### Q: How do I set a default account when I add transactions?

**A:** Set a **Pre** rule to check for an empty account field. When entering a transaction in the "All Accounts" ledger or from the ledger of a Category listing, your preferred default account will be auto filled.

![](/img/rules-custom/custom-rules-1.webp)

### Q: I have accounts (like cash or Venmo) that instantly "clear" at the moment of purchase. How can I automate toggling the "cleared" status?

**A:** Set a **Post** rule to check for your account or accounts where instant transactions can be made, set the action to "cleared", and select the checkbox. Cash or Venmo are typical examples of this type of account. Any time a transaction is added to the accounts listed in this rule, those transactions will automatically get a cleared state from now on.

![](/img/rules-custom/custom-rules-2.webp)

### Q: I use bank sync. How do I create transfers and not make duplicates?

**A:** Rules can be used to automatically create transfers.
Under the hood, Actual creates payees for each of your accounts.
To create a transfer, simply set the payee to the other account you are transferring between.
It is recommended to also limit the rule to a specific account.

![](/img/rules-custom/custom-rules-transfer.webp)

If you are using bank syncing on both accounts in the transfer you will need to create a rule for both accounts.
This will prevent the creation of duplicate transfers.
The processes will look like this:

1. Bank account **A** is imported and has a transfer
2. Your rule will catch the transaction that should be labeled as a transfer and create the transfer.
3. The transfer will show up in both accounts.
4. Bank account **B** is imported and contains a transaction for the same transfer.
5. Your second rule will catch the transfer transaction and set it as a transfer.
6. Actual's deduplication will see two transfers of the same amount on the same day with the same payee and delete the duplicate.
