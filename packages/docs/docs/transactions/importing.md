# Importing Transactions

There are various ways to get transactions into Actual. 

## Linked Bank Import

Actual Budget supports [linking your bank accounts](/docs/advanced/bank-sync.md) to sync using SimpleFIN, GoCardless or Pluggy.ai.

There are also [community projects](/docs/community-repos.md) that implement bank syncing. 

## Import Financial Files

A quick way to import transactions is to login to your bank's website and download a file. 

Actual supports importing CSV, QIF, OFX, QFX and CAMT files. Your bank probably allows you to download one of these formats (OFX/QFX is recommended).

1. Open the account you want to import transactions into.
2. Press the **Import** button and select the file.

## Import CSV Files

If your bank doesn’t support downloading financial files, you can import a CSV file instead.

1. Open the account you want to import transactions into.
2. Press the **Import** button and select the file.
3. Select the **CSV** option.
4. Set up the fields to match the CSV file.
   - For the “CSV Fields” dropdowns, leave them as “Choose field…” to leave the related field blank. Otherwise select the column from your CSV that corresponds to each field.
   - If the date is not being imported correctly (the green date is how Actual interprets the date), you can change the date format to match your CSV file. If your date format is not shown in the dropdown, check that the date column is correctly selected from your CSV file.
   - If the file can’t be imported at all, try changing the CSV delimiter to match your file. (Let us know if your file uses a different delimiter that isn’t listed!)
   - You can optionally toggle on “Flip amount” if you want to negate all of the amounts in the CSV file.
   - You can optionally toggle on “Split amount into separate inflow/outflow columns” if your CSV file has separate columns for inflow and outflow amounts (also known as debit and credit.)
   - You can toggle on “Add Multiplier” to add a multiplier to all of the amounts in the CSV file. This can be useful if you want to make an approximate currency conversion.
5. Once you’re happy with the settings, press **Import**.

![CSV Import](/img/import/import-csv@2x.png)

## Manually Add Transactions

If desired, you can manually add transactions. This is the most work but allows you to manage accounts that may not work with any other importing mechanism.

1. Open the account to want to add transactions to.
2. Press the **Add New** button.
3. Fill out the transaction and press **Add**.

## Avoiding duplicate transactions

Actual will automatically try to avoid duplicate transactions. This works best with OFX/QFX files since they provide rich data about transactions. They provide an **id** that we can use to avoid importing duplicates.

After checking the **id**, Actual will look for transactions around the same date, with the same amount, and with a similar payee. If it thinks the transaction already exists, it will avoid creating a duplicate. This means you can manually enter a transaction, and later it will be matched when you import it from a file.

It will always favor the imported transaction. If it matches a manually-entered transaction, it will update the date to match the imported transaction. **Keeping dates in sync with your bank is important** as it allows you to compare the balance at any point in time with your bank.
