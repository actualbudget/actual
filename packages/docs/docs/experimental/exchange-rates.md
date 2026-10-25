# Exchange rates

This page uses the example family budget from [Multi-currency](../budgeting/multi-currency.md): a Paris apartment subleased to a brother-in-law and visits to parents in Mexico.

<ExperimentalFeatureWarning issueId="9381" />

When Multiple currencies is on, **General** shows **Exchange rates** under the currency block. This budget uses US dollars. Its saved rates are manual fallbacks for 2026-10-31: 1.10 dollars per euro and 0.05 dollars per peso.

The rate input takes dollars per 1 unit of the chosen currency. Use the swap button to enter the reverse. **Save fallback** saves a manual fallback for that date only. Saving another rate for the same currency and date says a fallback is already saved for that date and offers **Replace saved rate**.

**Saved rates** lists each rate as stored, in units per 1 dollar, and can be limited with **All currencies**. **Edit** loads a fallback back into the form. **Remove** deletes it. When the list has another page, **Load more** appears. A page can be empty and still have more rates after it.

<img width="672" alt="Exchange rates with fallbacks of 1.10 dollars per euro and 0.05 dollars per peso for 2026-10-31" src="/img/budgeting/multi-currency-rates@2x.png" />

## Which rate Actual uses

For a transaction, Actual uses the first available option in this order:

1. **An amount or rate entered for that transaction.** An entered budget-currency amount sets the recorded conversion; otherwise an entered rate comes before saved rates. A rate typed while importing, syncing, linking or correcting accounts converts that operation only and is never saved.
2. **A fetched rate for that day.**
3. **The manual fallback for that day.**
4. **The most recent earlier fetched rate, up to seven days old.**

Estimates, schedules, account-currency corrections and To Budget valuations use the same order for their own date. A fallback never applies to another day.

Rates from a later day are never used. If no rate applies, Actual reports that the rate is unavailable; it does not assume a 1:1 conversion. A zero amount needs no rate. When a conversion needs input, the prompt lets you enter a rate or a budget-currency amount.

Changing a saved rate does not change the recorded budget-currency amounts of transactions already posted.

## Export

**Export rates** downloads the rates in the current list filter. With both rates showing, it saved `exchange-rates-USD-2026-10-31.csv` and said: "Rates exported: 2. Invalid rates left out: 0."

The file is UTF-8. The header is `base_currency`, `quote_currency`, `rate`, `kind`, `date`, `source`, and `timestamp`. Each rate is in units per 1 dollar, and a manual fallback has the kind `dated`. Rates that cannot be exported are counted and left out.

## Import

**Choose file** reads a CSV of manual fallbacks. The header needs `quote_currency`, `rate`, `kind`, and `date`. A `base_currency` column is accepted when every value is the budget currency. Any other column is ignored. A row whose kind is `fetched` is skipped.

A file with a euro fallback of 0.85 euros per dollar for 2026-10-15 and the peso fallback already saved showed **New: 1** and **Unchanged: 1**. The other counts were 0. The preview listed "Line 3: already saved. MXN 20 dated 2026-10-31". New rows are counted and are not listed. **Keep existing** is the selected choice. **Import** was not clicked.

<img width="672" alt="Export of two rates and an import preview with one new euro fallback and one unchanged peso fallback" src="/img/budgeting/multi-currency-rate-history@2x.png" />

**Keep existing** leaves a saved fallback in place. **Replace existing** asks you to confirm how many saved rates differ, then overwrites those rates. The confirmation says you can undo the import. If the saved rates change after the preview, or the preview is no longer available, choose the file again.

A fetched rate has no **Edit**. **Remove** deletes that day's fetched rate.
