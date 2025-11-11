# Identify and Apply Transfers Historically

These SQL scripts modify transactions as to apply [transfers](../../transactions/transfers.md) historically over migrated data without duplicating transactions. This is useful when you have migrated multiple accounts.

:::caution
Before executing any actions, make sure you have a complete [backup](../../backup-restore/backup.md).
:::

:::note
This process will only apply when the below conditions are met

- The two transactions are related to different accounts
- The amounts are exactly the same but inverted e.g. `-1.00` and `1.00`
- The transaction dates are within 3 days of each other

- The match only occurs once. This means transfers of equal value following the pattern below will not be applied.

      `Account A` -> `Account B` -> `Account A/C`

      As we cannot reliably tell the order of the transfers.

:::

## How To

1. Create a second copy of the backup
2. Extract the backup
3. Open the `db.sqlite` file with your preferred tool [SQLite3 cli](https://www.sqlite.org/cli.html), [heidiSQL](https://www.heidisql.com/), etc.
4. Run the below query to first view the impacted transactions

   ```sql
   SELECT t.id,
       acct,
       a.name,
       amount,
       t.date,
       imported_description,
       t.description,
       t.transferred_id,
       (
           SELECT id
           FROM transactions s
           WHERE s.tombstone = 0
               AND s.id != t.id
               AND starting_balance_flag = 0
               AND s.amount = (t.amount * -1)
               AND s.acct != t.acct
               AND (
                   (
                       s.date >= t.date
                       AND s.date <= (t.date + 3)
                   )
                   OR (
                       s.date <= t.date
                       AND s.date >= (t.date -3)
                   )
               )
       ) AS "transferred_id_new",
       (
           SELECT pa.id
           FROM transactions s
               LEFT JOIN payees pa ON s.acct = pa.transfer_acct
           WHERE s.tombstone = 0
               AND s.id != t.id
               AND starting_balance_flag = 0
               AND s.amount = (t.amount * -1)
               AND s.acct != t.acct
               AND (
                   (
                       s.date >= t.date
                       AND s.date <= (t.date + 3)
                   )
                   OR (
                       s.date <= t.date
                       AND s.date >= (t.date -3)
                   )
               )
       ) AS "description_new"
   FROM transactions t
       LEFT JOIN accounts a ON t.acct = a.id
       LEFT JOIN payees p ON t.description = p.id
       LEFT JOIN accounts ta ON p.transfer_acct = ta.id
   WHERE t.tombstone = 0
       AND starting_balance_flag = 0
       AND (
           SELECT COUNT(*)
           FROM transactions s
           WHERE s.tombstone = 0
               AND s.id != t.id
               AND starting_balance_flag = 0
               AND s.amount = (t.amount * -1)
               AND s.acct != t.acct
               AND (
                   (
                       s.date >= t.date
                       AND s.date <= (t.date + 3)
                   )
                   OR (
                       s.date <= t.date
                       AND s.date >= (t.date -3)
                   )
               )
       ) = 1
   ORDER BY DATE DESC;
   ```

5. Run the below query to update the transactions

   ```sql
   UPDATE transactions
   SET transferred_id = (
           SELECT s.id
           FROM transactions s
           WHERE s.tombstone = 0
               AND s.id != transactions.id
               AND starting_balance_flag = 0
               AND s.amount = (transactions.amount * -1)
               AND s.acct != transactions.acct
               AND (
                   (
                       s.date >= transactions.date
                       AND s.date <= (transactions.date + 3)
                   )
                   OR (
                       s.date <= transactions.date
                       AND s.date >= (transactions.date -3)
                   )
               )
       ),
       description = (
           SELECT pa.id
           FROM transactions s
               LEFT JOIN payees pa ON s.acct = pa.transfer_acct
           WHERE s.tombstone = 0
               AND s.id != transactions.id
               AND starting_balance_flag = 0
               AND s.amount = (transactions.amount * -1)
               AND s.acct != transactions.acct
               AND (
                   (
                       s.date >= transactions.date
                       AND s.date <= (transactions.date + 3)
                   )
                   OR (
                       s.date <= transactions.date
                       AND s.date >= (transactions.date -3)
                   )
               )
       )
   WHERE tombstone = 0
       AND starting_balance_flag = 0
       AND (
           SELECT COUNT(*)
           FROM transactions s
           WHERE s.tombstone = 0
               AND s.id != transactions.id
               AND starting_balance_flag = 0
               AND s.amount = (transactions.amount * -1)
               AND s.acct != transactions.acct
               AND (
                   (
                       s.date >= transactions.date
                       AND s.date <= (transactions.date + 3)
                   )
                   OR (
                       s.date <= transactions.date
                       AND s.date >= (transactions.date -3)
                   )
               )
       ) = 1;
   ```

6. Zip the `db.sqlite` file with the original `metadata.json` file
7. Follow the [restore](../../backup-restore/restore.md) process to apply these into your Actual Server instance
8. Verify your balances are correct and you see the correct transactions marked as transfers!
