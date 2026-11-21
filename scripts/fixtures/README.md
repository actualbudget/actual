# CLDR currency audit source

`cldr-currency-data.json` contains the complete currency data from
[CLDR JSON 49.0.0](https://raw.githubusercontent.com/unicode-org/cldr-json/49.0.0/cldr-json/cldr-core/supplemental/currencyData.json).
Its license is in `cldr-LICENSE`.

The audit checks every selectable currency against this file. Its code needs a
regional tender record at the review date in
`packages/loot-core/src/shared/currency-metadata.json`, and its decimal places
must match the ordinary CLDR fraction digits. Cash rounding does not determine
storage precision. CI reads these local files and makes no requests.

To review a new CLDR release, download it from the repository root:

```sh
curl -fsSL https://raw.githubusercontent.com/unicode-org/cldr-json/<release>/cldr-json/cldr-core/supplemental/currencyData.json > scripts/fixtures/cldr-currency-data.json
```

Review the complete diff, then update the source URL, CLDR/Unicode versions,
review date and `sourceJsonSha256` in the metadata file. `sourceJsonSha256` is
SHA-256 of `JSON.stringify(JSON.parse(sourceText))`, so formatting does not
affect it. Run `yarn check:currency-metadata` and `yarn test:currency-metadata`
afterward.

CLDR 49 changes PKR ordinary digits from 0 to 2 while keeping cash digits at 0.
MRU adds cash rounding metadata without changing its ordinary 2dp precision.
