# Multiple Currencies

<ExperimentalFeatureWarning issueId="5191" />

## What It Is

Accounts can hold different currencies, for example a Canadian budget with a US dollar account and a Colombian peso account. Every amount is stored only in the currency of its account. Exchange rates are used to show those amounts, and to add them up, in the budget's default currency. Nothing you enter is ever converted and saved, so changing a rate never changes your transactions.

## Turning It On

1. Go to **Settings → Experimental** and turn on **Currency support**, then **Multiple currencies** below it.
2. Go to **Settings → General → Currency** and choose the **Default currency**, the currency your budget is kept in.

Until a default currency is chosen, nothing changes.

Any currency Actual offers can be used, both as the default currency and for accounts, including currencies without decimals such as the Japanese yen or the Korean won.

## Account Currencies

Open an account's menu and choose **Account settings** to pick its currency. You can also choose a currency when adding an account.

Accounts created before the feature was turned on use the budget's default currency. Settings lists them so you can review them. Choosing the default currency explicitly removes an account from that list and keeps it in that currency if you later change the default currency.

Changing the currency of an account that already has transactions only relabels its amounts; they are not converted.

:::note

Changing the budget's default currency relabels the amounts of accounts that use the default currency. When some of them have transactions, closed accounts included, Actual asks whether to keep them in the old currency; accounts without transactions simply follow the new default.

:::

## Exchange Rates

Rates are managed on the **Exchange Rates** page, under **Settings** or pinned to the sidebar. Enter what one unit of a currency is worth in another, for example 1 USD = 1.38 CAD. The reverse direction is worked out for you, and so are conversions through a third currency, such as USD to COP through CAD.

Each currency pair has its own tab, for example **USD → CAD**, where you add and edit the rates of that pair only. To start a new pair, use the **New pair** tab. A pair is entered in one direction only: once there is a USD → CAD tab, CAD → USD rates are worked out from it.

To delete many rates at once, tick them in the table and choose **Delete** from the selection menu. To delete a whole pair, use **Delete pair…** above its table or right-click its tab; Actual asks you to confirm first.

Rates are typed with your number format, like amounts, and must be between 0.000000001 and 1,000,000,000. Importing a file shows how many rates were new, updated or already up to date, and which rows were skipped.

Each rate has a date. A conversion uses the latest rate on or before the date it needs, so you can keep a history of rates. A rate on or before the date, even through a third currency, is used before a later rate of the pair itself.

To add many rates at once, use the **Import and export** tab with a CSV file. The first row names the columns `date`, `from`, `to` and `rate`:

```
date,from,to,rate
2026-10-01,USD,CAD,1.3862
2026-10-01,CAD,COP,3000
```

Rates in the file are plain numbers with a dot as the decimal mark and no thousands separators. Files separated by semicolons or tabs may use a decimal comma instead, such as `1,3862`. Each row needs as many values as the first row; other rows are reported and skipped.

The same tab exports all your rates in this format, for example to move them to another budget.

Until a currency has a rate, its amounts count 1:1 against the default currency, the same way they added up before the feature existed.

## Known Limitations

- Rates can't be fetched automatically yet.
