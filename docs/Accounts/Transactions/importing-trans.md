---
title: 'Import Transactions'
---

There are a couple ways to get transactions into the system. For now, automatic transaction downloading is not available but it will be available very soon.

## Import financial files

A quick way to import transactions is to login to your bank's website and download a file. Actual supports importing QIF, OFX, and QFX files. Your bank probably allows you to download one of these formats (OFX/QFX is recommended).

1. Open the account you want to import transactions into.
2. Press the **Import** button and select the file.

## Manually add transactions

If desired, you can manually add transactions. This is the most work but allows you manage accounts that may not work with any other importing mechanism.

1. Open the account to want to add transactions to.
2. Press the **Add New** button.
3. Fill out the transaction and press **Add**.

## Avoiding duplicate transactions

Actual will automatically try to avoid duplicate transactions. This works best with OFX/QFX files since they provide rich data about transactions. They provide an **id** that we can use to avoid importing duplicates.

After checking the **id**, Actual will look for transactions around the same date, with the same amount, and with a similar payee. If it thinks the transaction already exists, it will avoid creating a duplicate. This means you can manually enter a transaction, and later it will be matched when you import it from a file.

It will always favor the imported transaction. It if matches a manually-entered transaction, it will update the date to match the imported transaction. **Keeping dates in sync with your bank is important** as it allows you compare the balance at any point in time with your bank.
