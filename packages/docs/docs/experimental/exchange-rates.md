# Exchange rates

This page uses the example family budget from [Multi-currency](../budgeting/multi-currency.md): a Paris apartment subleased to a brother-in-law and visits to parents in Mexico.

<ExperimentalFeatureWarning />

When Multiple currencies is on, Settings has an **Exchange rates** page. The page is hidden when Multiple currencies is off. This budget uses US dollars. The BNP Paribas account is in euros and the BBVA México account is in pesos, so the page has tabs **EUR to USD** and **MXN to USD**.

Each tab is one currency paired with the budget currency. An account in another currency gets a tab, and so does any other currency with saved rates. To save rates for a currency that has no account yet, choose it from **Add currency…**. The tab holds that pair's rate form, its saved rates, and the import and export tools.

Above the tabs, **Fetched rates** says where fetched rates come from, offers **Get missing rates**, holds the automatic updates setting and shows the last update. See [Fetched rates](#fetched-rates) and [Automatic updates](#automatic-updates).

The rate input takes dollars per 1 unit of the tab's currency. Use the swap button to enter the reverse. **Save fallback** saves a manual fallback for that date only. Saving another rate for the same currency and date says a fallback is already saved for that date and offers **Replace saved rate**.

On **EUR to USD**, the date is 10/31/2026 and **Rate** reads `1 EUR = [rate] USD`. Automatic updates have already fetched the euro rate for that day, so **Rate in use today** reads "New transactions and valuations today use: fetched rate 1.11619968 from 2026-10-31 (exchange-api)." **Saved rates** lists that fetched row as stored, 0.895897049531496 euros per dollar. On a manual fallback, **Edit** loads it back into the form. **Remove** deletes a row. When the list has another page, **Load more** appears. A page can be empty and still have more rates after it.

<img width="672" alt="Exchange rates with Get missing rates, automatic updates and the last update above the EUR to USD tab, which uses a fetched rate of 1.11619968 dollars per euro for 2026-10-31" src="/img/budgeting/multi-currency-rates@2x.png" />

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

The file is UTF-8. The header is `base_currency`, `quote_currency`, `rate`, `kind`, `date`, `source`, and `timestamp`. Each rate is in units per 1 dollar. A manual fallback has the kind `dated`, and a fetched rate has the kind `fetched`. Rates that cannot be exported are counted and left out.

## Import

**Choose file** reads a CSV of manual fallbacks. The header needs `quote_currency`, `rate`, `kind`, and `date`. A `base_currency` column is accepted when every value is the budget currency. Any other column is ignored. A row whose kind is `fetched` is skipped.

The preview covers every currency in the file, including rates for other tabs. A file with a euro fallback of 0.85 euros per dollar for 2026-10-15 and a peso fallback of 20 pesos per dollar for 2026-10-31 showed **New: 2**. The other counts were 0. New rows are counted and are not listed. A fallback that matches a saved one counts as **Unchanged**, and the preview lists it by line. **Keep existing** is the selected choice. **Import** was not clicked.

<img width="672" alt="Export of one euro rate and an import preview with two new fallbacks" src="/img/budgeting/multi-currency-rate-history@2x.png" />

**Keep existing** leaves a saved fallback in place. **Replace existing** asks you to confirm how many saved rates differ, then overwrites those rates. The confirmation says you can undo the import. If the saved rates change after the preview, or the preview is no longer available, choose the file again.

On a fetched rate, **Save fallback** loads it into the form, and saving makes a separate fallback for that day. **Remove** deletes that day's fetched rate. A removed fetched rate is fetched again by the next update.

## Fetched Rates

Daily rates come from the fawazahmed0 exchange-api, which publishes market data, not official rates. A fetched row in **Saved rates** shows its source as exchange-api. No sync server is needed.

Actual reads each daily snapshot from jsDelivr (`cdn.jsdelivr.net`), then from Cloudflare (`currency-api.pages.dev`) when jsDelivr does not have the file. Those hosts can see the currency codes, the snapshot dates and your IP address. Actual requests the quote currency's file too when the direct rate is below 1, so small rates keep their precision. The saved date is the snapshot's day, not a verified capture time.

**Get missing rates** fills the daily history that accounts in other currencies need. An open account needs every day from its first transaction through today. A closed account needs its days through its last transaction, or through today while it still holds a balance. Today, month ends and transaction dates are fetched first.

**Add account** fetches today's rate when none is saved for an account in another currency. Posting a schedule by hand first tries the saved rates. When a rate is missing, Actual fetches the rate for that date and retries before it opens the conversion dialog.

## Automatic Updates

**Fetch missing daily rates automatically** is on by default. While a budget is open, Actual runs the same update as **Get missing rates** when the budget opens, about two seconds after accounts, transactions, rates or settings change on this or another device, and when the local day changes. A run that failed or left recent days missing is tried again an hour later. Automatic runs skip days the provider did not publish; **Get missing rates** asks for them again.

The line under **Get missing rates** shows the current run, such as "Updating exchange rates…" and then "Exchange rates updated: 3 added, 1 not published, 0 failed." When the provider limits requests, it says when Actual will ask again. After five failed lookups in a row, the run stops and automatic runs wait an hour.

**Stop** ends the current run. Automatic runs then wait until the budget opens again, the day changes, or the setting is turned back on. **Get missing rates** still works. Turning the setting off stops an automatic run in progress, and rates are then fetched only when you click **Get missing rates**.
