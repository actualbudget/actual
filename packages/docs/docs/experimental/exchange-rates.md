# Exchange rates

This page uses the example family budget from [Multi-currency](../budgeting/multi-currency.md): a Paris apartment subleased to a brother-in-law and visits to parents in Mexico.

<ExperimentalFeatureWarning />

When Multiple currencies is on, Settings has an **Exchange rates** page. The page is hidden when Multiple currencies is off. This budget uses US dollars. The BNP Paribas account is in euros and the BBVA México account is in pesos, so the page has tabs **EUR to USD** and **MXN to USD**.

Each tab is one currency paired with the budget currency. An account in another currency gets a tab, and so does any other currency with saved rates. To save rates for a currency that has no account yet, choose it from **Add currency…**. The tab holds that pair's rate form, its saved rates, and the import and export tools.

The rate input takes dollars per 1 unit of the tab's currency. Use the swap button to enter the reverse. **Save fallback** saves a manual fallback for that date only. Saving another rate for the same currency and date says a fallback is already saved for that date and offers **Replace saved rate**.

On **EUR to USD**, the date is 10/31/2026 and **Rate** reads `1 EUR = [rate] USD`. Entering 1.10 and clicking **Save fallback** saves the euro fallback. **Rate in use today** then reads "New transactions and valuations today use: manual fallback 1.1 for 2026-10-31." **Saved rates** lists that euro row as stored, 0.909090909090909 euros per dollar. **Edit** loads it back into the form. **Remove** deletes it. When the list has another page, **Load more** appears. A page can be empty and still have more rates after it.

<img width="672" alt="Exchange rates on the EUR to USD tab, with MXN to USD beside it and a fallback of 1.10 dollars per euro for 2026-10-31" src="/img/budgeting/multi-currency-rates@2x.png" />

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

**Export rates** downloads the selected tab's rates. On **EUR to USD** it saved `exchange-rates-USD-2026-10-31.csv` and said: "Rates exported: 1. Invalid rates left out: 0."

The file is UTF-8. The header is `base_currency`, `quote_currency`, `rate`, `kind`, `date`, `source`, and `timestamp`. Each rate is in units per 1 dollar, and a manual fallback has the kind `dated`. Rates that cannot be exported are counted and left out.

## Import

**Choose file** reads a CSV of manual fallbacks. The header needs `quote_currency`, `rate`, `kind`, and `date`. A `base_currency` column is accepted when every value is the budget currency. Any other column is ignored. A row whose kind is `fetched` is skipped.

The preview covers every currency in the file, including rates for other tabs. A file with a euro fallback of 0.85 euros per dollar for 2026-10-15 and the peso fallback already saved showed **New: 1** and **Unchanged: 1**. The other counts were 0. The preview listed "Line 3: already saved. MXN 20 dated 2026-10-31". New rows are counted and are not listed. **Keep existing** is the selected choice. **Import** was not clicked.

<img width="672" alt="Export of one euro rate and an import preview with one new euro fallback and one unchanged peso fallback" src="/img/budgeting/multi-currency-rate-history@2x.png" />

**Keep existing** leaves a saved fallback in place. **Replace existing** asks you to confirm how many saved rates differ, then overwrites those rates. The confirmation says you can undo the import. If the saved rates change after the preview, or the preview is no longer available, choose the file again.

On a fetched rate, **Save fallback** loads it into the form, and saving makes a separate fallback for that day. **Remove** deletes that day's fetched rate.
