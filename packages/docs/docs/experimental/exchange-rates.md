# Exchange rates

<ExperimentalFeatureWarning />

When multicurrency is on, Settings shows an Exchange rates section on the General page. It lists the rates saved for the budget currency, and it is hidden when multicurrency is off.

A rate is one of three kinds:

- A one-day rate applies to transactions on that UTC day.
- A standing rate applies from its date when no fetched rate is available.
- A fetched rate comes from the sync server. A file import never creates one.

Saving a rate and removing a manual rate stay on this screen. The list loads one page at a time. Choose Load more when another page is available. A page can be empty and still have more rates after it. Some stored rates cannot be shown; the screen counts those instead of listing them.

## File format

Import and export use a UTF-8 comma-separated file.

An import needs a header row with `quote_currency`, `rate`, `kind`, and `date`. A `base_currency` column is allowed only when every value is the budget currency. Any other column is ignored. A row whose kind is `fetched` is skipped. The preview lists the rows that are not new, up to 200 of them, and counts every class of row.

Export writes `base_currency`, `quote_currency`, `rate`, `kind`, `date`, `source`, and `timestamp` for the rates in the current list filter. Rates that cannot be exported are counted and left out. The file is saved as the server produced it.

## Keep and Replace

Keep existing is the default. For an import, Keep leaves a saved manual rate in place. Replace asks you to confirm the number of saved rates that differ, then overwrites those rates. An import is one undo step. If the saved rates change after the preview, or the preview is no longer available, choose the file again. The same preview cannot be imported twice.

For a backfill, Keep counts a date as already saved when a fetched rate for that day exists, and it does not fetch that date. Replace fetches every date in the range. Replacing can restore a fetched rate you removed. Backfill changes cannot be undone.

Removing a fetched rate deletes that saved day. It stays deleted until a backfill with Replace existing brings it back. Keep existing does not restore it. Manual rates still use Remove on the row.

## Backfill limits

Backfill asks the sync server for one currency over an inclusive date range. The range can be at most 366 days and cannot end after today. Check dates shows how many dates are in the range, how many are already saved, and how many would be fetched. Start stays off until that summary matches the currency, dates, and Keep or Replace choice currently on the form.

Changing any of those clears the summary. Start contacts the server only after you confirm a Replace summary, or immediately for Keep. Progress is announced as it advances, and Cancel stops the run. Rates already written stay saved.

Backfill needs a sync server that has an exchange rate provider available. Saving a rate and importing a file work without one.

The sync server includes the fawazahmed0 exchange-api market-data provider; its rates are not official. Check dates contacts only your sync server. Start backfill requests rates from jsDelivr, with Cloudflare as a fallback. These hosts can see the requested currency file code, the snapshot date, and your server's IP. A quote currency file is requested only when a reciprocal rate is needed. The saved date is the snapshot's effective day, not a verified capture time.
