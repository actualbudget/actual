# Exchange rates

This page uses the example family budget from [Multi-currency](../budgeting/multi-currency.md): a Paris apartment subleased to a brother-in-law and visits to parents in Mexico.

<ExperimentalFeatureWarning />

When Multiple currencies is on, Settings has an **Exchange rates** page. The page is hidden when Multiple currencies is off. This budget uses US dollars. The BNP Paribas account is in euros and the BBVA México account is in pesos, so the page has tabs **EUR to USD** and **MXN to USD**.

Each tab is one currency paired with the budget currency. An account in another currency gets a tab, and so does any other currency with saved rates. To save rates for a currency that has no account yet, choose it from **Add currency…**. The tab holds that pair's rate form, its saved rates, and the import, export, and backfill tools.

The rate input defaults to dollars per 1 unit of the account currency. Use the swap button to enter the reciprocal direction. **Kind** is **Standing rate** or **One-day rate**. A one-day rate is for that UTC day. A standing rate applies from its date when no fetched rate is available. Both can be saved on the same date. Saving the same currency, kind, and date again asks you to replace the saved rate. A fetched rate comes from the sync server. A file import never creates one.

On **EUR to USD**, **Kind** is **Standing rate**, the date is 10/31/2026, and **Rate** defaults to `1 EUR = [rate] USD`. Swap to **EUR per 1 USD** to enter 0.909091. **Rate in use today** reads `standing rate 0.909091 from 2026-10-31` on both lines: the rate a new transaction today would use, and the rate Estimates and To Budget would use. **Saved rates** lists that euro row. **Edit** loads it back into the form. **Remove** deletes it. When the list has another page, **Load more** appears. A page can be empty and still have more rates after it.

<img width="616" alt="Exchange rates on the USD to EUR tab, with USD to MXN beside it and a standing 0.909091 euro rate per 1 dollar" src="/img/budgeting/multi-currency-rates@2x.png" />

## Which rate Actual uses

For a transaction, Actual uses the first available option in this order:

1. **An amount or rate entered for that transaction.** An entered budget-currency amount determines the recorded conversion; otherwise, an entered rate takes priority over saved rates.
2. **A one-day manual rate for the transaction's UTC day.**
3. **A fetched rate for that UTC day.**
4. **The most recent earlier fetched rate, up to seven days old.** This is the fetched-rate fallback, and it takes priority over a standing rate.
5. **The latest standing manual rate starting on or before that day.** A standing rate has no age limit and remains applicable until another standing rate supersedes it.

Estimates, automatic schedules, account-currency corrections, and To Budget valuations skip one-day manual rates. They use the fetched rate for the valuation or transaction day, then the earlier fetched-rate fallback, then the applicable standing rate. This is why **Rate in use today** can show different rates for a new transaction and for Estimates and To Budget.

Rates from a later UTC day are never used. If no applicable rate exists, Actual reports that the rate is unavailable; it does not assume a 1:1 conversion. A zero amount needs no rate. Manual transaction entry uses an applicable saved rate without opening the conversion prompt. If a conversion needs input, the prompt lets you enter a rate or budget-currency amount.

Manual scheduled posting first tries the saved rates. If a rate is missing, Actual asks the connected provider for the occurrence date and retries posting before opening manual conversion. The dialog remains available if there is no server, the provider fails, or a future date has no usable rate.

Rate selection uses saved rates. Backfilling history is described below. Changing a saved rate does not change the recorded budget-currency amounts of transactions already posted.

## Export

**Export rates** downloads the rates for the selected tab's currency. On **EUR to USD** it saved `exchange-rates-USD-2026-10-31.csv` and said: "Rates exported: 1. Invalid rates left out: 0."

The file is UTF-8. The header is `base_currency`, `quote_currency`, `rate`, `kind`, `date`, `source`, and `timestamp`. Rates that cannot be exported are counted and left out.

## Import

**Choose file** reads a CSV of manual rates. The header needs `quote_currency`, `rate`, `kind`, and `date`. A `base_currency` column is accepted when every value is the budget currency. Any other column is ignored. A row whose kind is `fetched` is skipped.

The preview covers every currency in the file, including rates for other tabs. A file with a standing 0.85 euro rate on 2026-10-15 and the peso rate already saved showed **New: 1** and **Unchanged: 1**. The other counts were 0. The preview listed "Line 3: already saved. MXN 20 standing 2026-10-31". New rows are counted and are not listed. **Keep existing** is the selected choice. **Import** was not clicked.

**Keep existing** leaves a saved manual rate in place. **Replace existing** asks you to confirm how many saved rates differ, then overwrites those rates. The confirmation says you can undo the import. If the saved rates change after the preview, or the preview is no longer available, choose the file again.

## Backfill

**Backfill** asks a sync server for fetched rates for the selected tab's currency. On **EUR to USD** the currency is EUR. The form was set from 10/01/2026 to 10/31/2026, with **Keep existing**. **Check dates** said: "Backfill needs a sync server. Rates you save or import work without one." **Start backfill** stayed off. Saving a rate and importing a file work without a sync server.

<img width="616" alt="Export of one euro rate, an import preview with one new row and one unchanged peso rate, and a euro backfill that needs a sync server" src="/img/budgeting/multi-currency-rate-history@2x.png" />

The range is inclusive, at most 366 days, and cannot end after today. **Check dates** reports how many dates are in the range, how many are already saved, and how many would be fetched. **Start backfill** stays off until that summary matches the tab, the dates, and the Keep or Replace choice on the form. Changing any of those, including switching tabs, clears the summary.

For a backfill, **Keep existing** treats a date as already saved when a fetched rate for that day exists, and it does not fetch that date. **Replace existing** fetches every date in the range and asks you to confirm, because those changes cannot be undone. **Cancel backfill** stops a run. Rates already written stay saved.

Removing a fetched rate deletes that saved day. It stays deleted until a backfill with **Replace existing** brings it back. **Keep existing** does not restore it.

## Where fetched rates come from

The sync server includes the fawazahmed0 exchange-api provider. Its rates are market data, and they are not official rates. A fetched row in **Saved rates** shows its source as exchange-api.

**Check dates** asks your sync server which provider is available. It does not download rates. **Start backfill** asks that server for rates. The server reads each snapshot from jsDelivr (`cdn.jsdelivr.net`), then from `currency-api.pages.dev` when jsDelivr does not have the file. Those hosts can see the currency code, the snapshot date, and the sync server's IP address. The server requests a quote-currency file only when the direct rate is below 1. The saved date is the snapshot's day, not a verified capture time.
