# Merging Duplicate Transactions

To merge two duplicate transactions, select two transactions with the same amount (e.g. two payments of 2 USD), then either use the shortcut key "G" or select the transaction menu dropdown in the top right and click merge. This option will only appear when exactly two matching transactions are selected.

![Merge Transactions](/img/merge-transactions/merge-g.webp)

When two transactions are merged, one is determined to be the 'kept' transaction and the other is the 'dropped' transaction. Any empty fields in the 'kept' transactions are copied over from the 'dropped' transaction and the 'dropped' transaction will be deleted. So, if the 'kept' transaction is uncategorized or has no payee, the payee and/or category will be copied over from the 'dropped' transaction before it is deleted.

The following logic is used to determine which transaction is kept:

1. If one transaction is imported through [bank sync](/docs/advanced/bank-sync) and the other is not, the synced transaction is kept. Otherwise, continue to the next step.
2. If one transaction is imported through a [file import](/docs/transactions/importing) and the other is not, the imported transaction is kept. Otherwise, continue to the final step.
3. The transaction with the earlier date is kept.
