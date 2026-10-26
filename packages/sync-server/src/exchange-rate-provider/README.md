# Built-in exchange rate provider

The sync server includes the [fawazahmed0 exchange-api](https://github.com/fawazahmed0/exchange-api) provider as market data. Its rates are not official rates. The adapter has no credentials or mirror setting. Changing its two hosts requires a source change.

Each requested UTC date and currency file uses `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{date}/v1/currencies/{code}.json`, then `https://{date}.currency-api.pages.dev/v1/currencies/{code}.json` if needed. The adapter checks the base file first. When the direct quote is below one, it checks the quote file and inverts a valid reciprocal rate of at least one, using integer half-even rounding. If that reciprocal is unusable, it keeps the direct value. A lookup makes at most four sequential GETs, with a 3.5 second limit per GET and body read. The sync server's route has a 15 second limit.

Checking backfill dates contacts only the user's sync server. Starting backfill makes the external GETs. The hosts can see the requested currency file code, the snapshot date and the sync server's IP. The quote code is sent only if the reciprocal file is needed. There is no automatic fetch on entry or schedule posting.

The stored effective date is the snapshot's generation day, not a verified source capture time or the time Actual fetched it. [Published files and generator code](https://github.com/fawazahmed0/exchange-api/blob/110a6b9de2d048243a75f3811bdca806ac141728/currscript.js) show this distinction. As observed on 2026-10-17, the earliest verified jsDelivr snapshot was 2024-03-02 and the earliest verified Cloudflare snapshot was 2024-03-06. Earlier availability and coverage for other days remain unverified.

The [repository license](https://github.com/fawazahmed0/exchange-api/blob/110a6b9de2d048243a75f3811bdca806ac141728/LICENSE) is CC0 1.0. The terms of its undisclosed upstream data sources are unknown.
