# Exchange rates

This page uses the example family budget from [Multi-currency](../budgeting/multi-currency.md): a Paris apartment subleased to a brother-in-law and visits to parents in Mexico.

<ExperimentalFeatureWarning issueId="9381" />

When Multiple currencies is on, **General** shows **Exchange rates** under the currency block. This budget uses US dollars. The saved rates are a standing 0.909091 euro rate and a standing 20 peso rate, both dated 2026-10-31.

The rate input defaults to dollars per 1 unit of the account currency. Use the swap button to enter the reciprocal direction. **Kind** is **Standing rate** or **One-day rate**. A one-day rate is for that UTC day. A standing rate applies from its date when no fetched rate is available. Both can be saved on the same date. Saving the same currency, kind, and date again asks you to replace the saved rate.

**Saved rates** can be limited with **All currencies**. **Edit** loads a manual row back into the form. **Remove** deletes it. When the list has another page, **Load more** appears. A page can be empty and still have more rates after it.

<img width="616" alt="Exchange rates with a standing 0.909091 euro rate and a standing 20 peso rate per 1 dollar" src="/img/budgeting/multi-currency-rates@2x.png" />

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

**Export rates** downloads the rates in the current list filter. With both rates showing, it saved `exchange-rates-USD-2026-10-31.csv` and said: "Rates exported: 2. Invalid rates left out: 0."

The file is UTF-8. The header is `base_currency`, `quote_currency`, `rate`, `kind`, `date`, `source`, and `timestamp`. Rates that cannot be exported are counted and left out.

## Import

**Choose file** reads a CSV of manual rates. The header needs `quote_currency`, `rate`, `kind`, and `date`. A `base_currency` column is accepted when every value is the budget currency. Any other column is ignored. A row whose kind is `fetched` is skipped.

A file with a standing 0.85 euro rate on 2026-10-15 and the peso rate already saved showed **New: 1** and **Unchanged: 1**. The other counts were 0. The preview listed "Line 3: already saved. MXN 20 standing 2026-10-31". New rows are counted and are not listed. **Keep existing** is the selected choice. **Import** was not clicked.

**Keep existing** leaves a saved manual rate in place. **Replace existing** asks you to confirm how many saved rates differ, then overwrites those rates. The confirmation says you can undo the import. If the saved rates change after the preview, or the preview is no longer available, choose the file again.

## Backfill

**Backfill** asks a sync server for fetched rates for one currency. The form was set to **EUR - Euro (€)**, from 10/01/2026 to 10/31/2026, with **Keep existing**. **Check dates** said: "Backfill needs a sync server. Rates you save or import work without one." **Start backfill** stayed off. Saving a rate and importing a file work without a sync server.

<img width="616" alt="Export of two rates, an import preview with one new row and one unchanged peso rate, and a backfill that needs a sync server" src="/img/budgeting/multi-currency-rate-history@2x.png" />

The range is inclusive, at most 366 days, and cannot end after today. **Check dates** reports how many dates are in the range, how many are already saved, and how many would be fetched. **Start backfill** stays off until that summary matches the currency, the dates, and the Keep or Replace choice on the form. Changing any of those clears the summary.

For a backfill, **Keep existing** treats a date as already saved when a fetched rate for that day exists, and it does not fetch that date. **Replace existing** fetches every date in the range and asks you to confirm, because those changes cannot be undone. **Cancel backfill** stops a run. Rates already written stay saved.

Removing a fetched rate deletes that saved day. It stays deleted until a backfill with **Replace existing** brings it back. **Keep existing** does not restore it.
