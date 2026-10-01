# Importing Transactions

There are various ways to get transactions into Actual.

## Linked Bank Import

Actual Budget supports [linking your bank accounts](../advanced/bank-sync.md) to sync using SimpleFIN, GoCardless or Pluggy.ai.

There are also [community projects](../community-repos.md) that implement bank syncing.

## Import Financial Files

A quick way to import transactions is to login to your bank's website and download a file.

Actual supports importing CSV, QIF, OFX, QFX and CAMT files. Your bank probably allows you to download one of these formats (OFX/QFX is recommended).

1. Open the account you want to import transactions into.
2. Press the **Import** button and select the file.

You can also start from **All Accounts** and let Actual work out which account the file belongs to. See [Importing From All Accounts](#importing-from-all-accounts) below.

## Importing From All Accounts

You don't have to open an account first. Starting from **All Accounts** saves a few clicks and helps you avoid importing a file into the wrong account.

1. Open **All Accounts**.
2. Press the **Import** button, or press <Key mod="ctrl" k="i" />, and select the file.
3. Check the account that Actual selected, or choose one, and press **Continue**.
4. Finish the import as usual.

Actual always asks you to confirm the account before the import starts.

### How Actual Finds the Account

OFX, QFX, QIF and CAMT files usually say which bank account they were exported from. Actual remembers this the first time you import a file into an account, so the next file from the same bank account is matched automatically.

- **The file matches an account:** Actual selects that account. You can still choose a different one.
- **The file doesn't match an account yet:** Choose the account yourself. Actual remembers your choice once the import finishes.
- **Actual finds similar transactions:** If the payees in the file already appear in only one of your accounts, Actual says "This looks like" followed by that account, and offers a **Use** button. Nothing is selected until you press it.
- **CSV files:** These don't say which account they belong to, so you always choose the account.

### Importing From an Account Page

If you start from an account page, the import goes straight ahead as before. The only exception is when the file looks like it belongs to a different account. Then Actual warns you and lets you import into the account it recognized, or into the one you started from anyway.

### Changing the Account for a File

If you import a file into a different account than the one Actual remembered, Actual updates what it remembers and shows a notice once the import is done. Transactions you already imported are not changed.

:::note
Actual stores only a scrambled (hashed) version of the account number found in a file, never the number itself. This keeps the number from being readable by accident, for example in a shared budget file, but it is not strong protection against someone determined to recover a short account number.
:::

## Import CSV Files

If your bank doesn't support downloading financial files, you can import a CSV file instead.

1. Open the account you want to import transactions into.
2. Press the **Import** button and select the file.
3. Select the **CSV** option.
4. Set up the fields to match the CSV file.
   - For the "CSV Fields" dropdowns, leave them as "Choose field…" to leave the related field blank. Otherwise select the column from your CSV that corresponds to each field.
   - If the date is not being imported correctly (the green date is how Actual interprets the date), you can change the date format to match your CSV file. If your date format is not shown in the dropdown, check that the date column is correctly selected from your CSV file.
   - If the file can't be imported at all, try changing the CSV delimiter to match your file. (Let us know if your file uses a different delimiter that isn't listed!)
   - You can optionally toggle on "Flip amount" if you want to negate all of the amounts in the CSV file.
   - You can optionally toggle on "Split amount into separate inflow/outflow columns" if your CSV file has separate columns for inflow and outflow amounts (also known as debit and credit.)
   - You can toggle on "Add Multiplier" to add a multiplier to all of the amounts in the CSV file. This can be useful if you want to make an approximate currency conversion.
5. Once you're happy with the settings, press **Import**.

![CSV Import](/img/import/import-csv@2x.webp)

## Manually Add Transactions

If desired, you can manually add transactions. This is the most work but allows you to manage accounts that may not work with any other importing mechanism.

1. Open the account to want to add transactions to.
2. Press the **Add New** button.
3. Fill out the transaction and press **Add**.

## Avoiding duplicate transactions

Actual will automatically try to avoid duplicate transactions. This works best with OFX/QFX files since they provide rich data about transactions. They provide an **id** that we can use to avoid importing duplicates.

After checking the **id**, Actual will look for transactions around the same date, with the same amount, and with a similar payee. If it thinks the transaction already exists, it will avoid creating a duplicate. This means you can manually enter a transaction, and later it will be matched when you import it from a file.

It will always favor the imported transaction. If it matches a manually-entered transaction, it will update the date to match the imported transaction. **Keeping dates in sync with your bank is important** as it allows you to compare the balance at any point in time with your bank.

When "Merge with existing transactions" is enabled, a **Reimport deleted transactions** checkbox is also available. When checked (the default for file imports), any transactions that were previously imported and then deleted will be reimported. Disable this option if you do _not_ want deleted transactions to reappear during import.

:::note
The [API](../api/reference.md#importtransactions) defaults `reimportDeleted` to `true` for backward compatibility. If you are importing via the API and want to skip deleted transactions, pass `reimportDeleted: false` explicitly.
:::
