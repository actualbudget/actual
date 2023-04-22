---
title: Release Notes
---

## 23.4.2

**Docker tag: 23.4.2**

### Actual

Version: 23.4.2

#### Features

- [#885](https://github.com/actualbudget/actual/pull/885) Add template keyword to budget according to named schedules — thanks [pole95]

#### Enhancements

- [#868](https://github.com/actualbudget/actual/pull/868) Improve sidebar auto-floating behavior — thanks [j-f1]

#### Bugfix

- [#915](https://github.com/actualbudget/actual/pull/915) Fix reconciling a budget with a zero value — thanks [j-f1]
- [#926](https://github.com/actualbudget/actual/pull/926) Fix undo keyboard shortcut being ignored — thanks [j-f1]

#### Maintenance

- [#916](https://github.com/actualbudget/actual/pull/916) Remove `@jlongster/lively` dependency; refactor old autocomplete to not use it any more; disable new autocomplete — thanks [MatissJanis]
- [#924](https://github.com/actualbudget/actual/pull/924) Remove `react-select` and the new autocomplete — thanks [MatissJanis]

### Actual Server

Version: 23.4.2

#### Features

- [#186](https://github.com/actualbudget/actual-server/pull/186) Add an `npm run reset-password` script to set or reset the server password. — thanks [j-f1]

#### Enhancements

- [#189](https://github.com/actualbudget/actual-server/pull/189) More clearly report the problem with Nordigen requests that fail with an unexpected status code — thanks [j-f1]

## 23.4.1

**Docker tag: 23.4.1**

The release fixes a issue with creating rules from the transaction list.

### Actual

Version: 23.4.1

#### Enhancements

- [#860](https://github.com/actualbudget/actual/pull/860) Allow goal template 'by' matches to compound — thanks [shall0pass]
- [#887](https://github.com/actualbudget/actual/pull/887) Mobile: unify "settings" page header with the style of "accounts" page — thanks [MatissJanis]
- [#891](https://github.com/actualbudget/actual/pull/891) Goal template can now use single decimal places to define targets — thanks [shall0pass]
- [#895](https://github.com/actualbudget/actual/pull/895) Improve error reporting for goal templates — thanks [shall0pass]
- [#900](https://github.com/actualbudget/actual/pull/900) Add "Daily" option to scheduled transactions — thanks [biohzrddd]

#### Bugfix

- [#865](https://github.com/actualbudget/actual/pull/865) Fix case-insensitive matching of strings for uppercase letters from non-English alphabets — thanks [Jackenmen]
- [#881](https://github.com/actualbudget/actual/pull/881) Autocomplete: do not show "create payee" option if the typed-in payee is an exact match of an existing payee — thanks [MatissJanis]
- [#882](https://github.com/actualbudget/actual/pull/882) Fix rule creation from account page (transaction list) — thanks [MatissJanis]
- [#883](https://github.com/actualbudget/actual/pull/883) Recognize numpad enter key as enter key — thanks [j-f1]
- [#886](https://github.com/actualbudget/actual/pull/886) Fill category field when selecting 'Create rule' from accounts screen — thanks [shall0pass]
- [#902](https://github.com/actualbudget/actual/pull/902) Remove currently viewed account from list of possible transfer accounts — thanks [biohzrddd]

#### Maintenance

- [#864](https://github.com/actualbudget/actual/pull/864) Don’t check for release notes on `release/*` branches — thanks [j-f1]
- [#869](https://github.com/actualbudget/actual/pull/869) Disable ESLint when building in CI (since we have a separate linting job) — thanks [j-f1]
- [#870](https://github.com/actualbudget/actual/pull/870) Remove duplicate migration and default-db.sqlite files — thanks [j-f1]
- [#877](https://github.com/actualbudget/actual/pull/877) Convert most CommonJS imports/exports to ESM — thanks [albertogasparin]
- [#884](https://github.com/actualbudget/actual/pull/884) Update `@typescript-eslint/*` packages to their latest versions — thanks [j-f1]
- [#889](https://github.com/actualbudget/actual/pull/889) Convert few other folders in `loot-core` to Typescript — thanks [albertogasparin]
- [#890](https://github.com/actualbudget/actual/pull/890) Add a CodeQL workflow to automatically scan for potential security issues — thanks [j-f1]
- [#893](https://github.com/actualbudget/actual/pull/893) Remove usage of `realpath` command in build script — thanks [j-f1]

### Actual Server

Version: 23.4.1

#### Features

- [#182](https://github.com/actualbudget/actual-server/pull/182) Add support for armv6l (Alpine-based images only) — thanks [intiplink]

#### Enhancements

- [#187](https://github.com/actualbudget/actual-server/pull/187) Add rate limiting to all server requests — thanks [j-f1]

#### Maintenance

- [#181](https://github.com/actualbudget/actual-server/pull/181) Don’t check for release notes on `release/*` branches — thanks [j-f1]
- [#185](https://github.com/actualbudget/actual-server/pull/185) Use the proper Typescript Babel preset — thanks [albertogasparin]

## 23.4.0

**Docker tag: 23.4.0**

:::info

Actual has now been moved to a stand-alone Docker organization. If you were previously using `jlongster/actual-server` docker image - please update it to `actualbudget/actual-server`.

:::

The release has the following notable features:

- Rules can now optionally be applied when any of their conditions match (in addition to the existing option to apply when all of their conditions match)
- Rules: quick-create option from the transaction table (in the “X selected” menu that shows up after selecting a transaction, choose “Create rule”)
- Ability to hide decimal places for currencies with large numbers (in Settings → Formatting)
- New autocomplete component (please report any bugs [here](https://github.com/actualbudget/actual/issues/773))
- Lots of smaller improvements and bugfixes

### Actual

Version: 23.4.0

#### Features

- [#725](https://github.com/actualbudget/actual/pull/725) A “hide decimal places” option has been added to improve readability for currencies that typically have large values. — thanks [j-f1]
- [#792](https://github.com/actualbudget/actual/pull/792) Improved UX when setting up account links for bank-sync via Nordigen — thanks [MatissJanis]
- [#802](https://github.com/actualbudget/actual/pull/802) Add quick rule creation from transactions table in accounts page — thanks [albertogasparin]
- [#811](https://github.com/actualbudget/actual/pull/811) Allow rules to apply to "all" or "any" of the provided conditions — thanks [albertogasparin]

#### Enhancements

- [#736](https://github.com/actualbudget/actual/pull/736) Save payee name in “imported payee” field during YNAB4/YNAB5 import — thanks [ostat]
- [#756](https://github.com/actualbudget/actual/pull/756) Make goal template keywords case insensitive — thanks [j-f1]
- [#762](https://github.com/actualbudget/actual/pull/762) Change when the welcome screen is shown, add a button to start by importing a file — thanks [j-f1]
- [#768](https://github.com/actualbudget/actual/pull/768) Update wording across the UI to clarify that we don’t own any servers — thanks [j-f1]
- [#774](https://github.com/actualbudget/actual/pull/774) Clarify in the UI that Account Type cannot be changed after creation — thanks [pmamberti]
- [#785](https://github.com/actualbudget/actual/pull/785) Allow importing `.blob` files from actual-server — thanks [Jackenmen]
- [#791](https://github.com/actualbudget/actual/pull/791) Replace straight quotes with curly quotes in user-visible text — thanks [j-f1]
- [#793](https://github.com/actualbudget/actual/pull/793) Slightly improve the layout of the new autocomplete. — thanks [j-f1]
- [#799](https://github.com/actualbudget/actual/pull/799) Improve visual consistency on the settings page — thanks [j-f1]
- [#801](https://github.com/actualbudget/actual/pull/801) Add explicit bank-sync warning disclaimer — thanks [MatissJanis]
- [#808](https://github.com/actualbudget/actual/pull/808) Import transactions with negative amounts represented as `(amount)` — thanks [aharbis]
- [#834](https://github.com/actualbudget/actual/pull/834) Autocomplete: set min-width of the menu — thanks [MatissJanis]
- [#835](https://github.com/actualbudget/actual/pull/835) Force the sidebar to always float when the window is narrow — thanks [j-f1]
- [#848](https://github.com/actualbudget/actual/pull/848) Remove Safari pinned tab icon — thanks [j-f1]
- [#850](https://github.com/actualbudget/actual/pull/850) Autocomplete: turn on new autocomplete by default — thanks [MatissJanis]

#### Bugfix

- [#751](https://github.com/actualbudget/actual/pull/751) Fix `#template 0` causing an error — thanks [j-f1]
- [#754](https://github.com/actualbudget/actual/pull/754) (Nordigen) Use bookingDate as fallback during sync — thanks [waseem-h]
- [#777](https://github.com/actualbudget/actual/pull/777) Fix missing `onHover` prop in `TransactionsTable` — thanks [MatissJanis]
- [#787](https://github.com/actualbudget/actual/pull/787) New autocomplete: making consistent height between multi/single value inputs — thanks [MatissJanis]
- [#797](https://github.com/actualbudget/actual/pull/797) Re-enable goal templates by passing flag values to the budget summary component — thanks [modrzew]
- [#819](https://github.com/actualbudget/actual/pull/819) Fix error when running importTransactions from the API — thanks [j-f1]
- [#836](https://github.com/actualbudget/actual/pull/836) PayeeAutocomplete: fix long delay when clicking on "make transfer" — thanks [MatissJanis]
- [#837](https://github.com/actualbudget/actual/pull/837) PayeeAutocomplete: fix flipping of the menu when it's opened near the bottom of the page — thanks [MatissJanis]
- [#839](https://github.com/actualbudget/actual/pull/839) Autocomplete: remove portalization from usage in transaction table in order to improve the UX — thanks [MatissJanis]
- [#851](https://github.com/actualbudget/actual/pull/851) Fix "no server" link no longer working — thanks [MatissJanis]
- [#853](https://github.com/actualbudget/actual/pull/853) Hide the file list/import screens when loading a budget — thanks [j-f1]
- [#854](https://github.com/actualbudget/actual/pull/854) Dismiss the update notification only after clicking the close button — thanks [MatissJanis]
- [#855](https://github.com/actualbudget/actual/pull/855) Normalize value when single/multi select is changed — thanks [MatissJanis]
- [#856](https://github.com/actualbudget/actual/pull/856) Autocomplete: allow editing previously selected payees — thanks [MatissJanis]
- [#862](https://github.com/actualbudget/actual/pull/862) Autocomplete: styling fixes — thanks [MatissJanis]

#### Maintenance

- [#670](https://github.com/actualbudget/actual/pull/670) `node-libofx`: add transaction_acct_name function — thanks [j-f1]
- [#696](https://github.com/actualbudget/actual/pull/696) Upgrade React to v18 — thanks [MatissJanis]
- [#741](https://github.com/actualbudget/actual/pull/741) Refactored PaymentAutocomplete component to use react-select — thanks [MatissJanis]
- [#746](https://github.com/actualbudget/actual/pull/746) Add support for automatically generating release notes — thanks [j-f1]
- [#750](https://github.com/actualbudget/actual/pull/750) Reduce JavaScript bundle size by 1MB — thanks [j-f1]
- [#755](https://github.com/actualbudget/actual/pull/755) Removing unused `Debugger` component and its dependencies: perf-deets, codemirror — thanks [MatissJanis]
- [#758](https://github.com/actualbudget/actual/pull/758) Fix end-to-end testing workflow — thanks [j-f1]
- [#763](https://github.com/actualbudget/actual/pull/763) Disable ESLint when building in CI — thanks [j-f1]
- [#765](https://github.com/actualbudget/actual/pull/765) Make desktop-client integration tests independent — thanks [MatissJanis]
- [#769](https://github.com/actualbudget/actual/pull/769) Refactor `TransactionsTable` to react-hook component — thanks [MatissJanis]
- [#771](https://github.com/actualbudget/actual/pull/771) Reducing unit test flakiness by removing randomization — thanks [MatissJanis]
- [#772](https://github.com/actualbudget/actual/pull/772) Upgrade `fast-check` dependency to improve unit test speed — thanks [MatissJanis]
- [#775](https://github.com/actualbudget/actual/pull/775) Revert small change to `useTableNavigator` — thanks [MatissJanis]
- [#776](https://github.com/actualbudget/actual/pull/776) Finish React v18 upgrade: react-dom change — thanks [MatissJanis]
- [#778](https://github.com/actualbudget/actual/pull/778) Further autocomplete component refactors: AccountAutocomplete & GenericInput — thanks [MatissJanis]
- [#780](https://github.com/actualbudget/actual/pull/780) Add `waitFor` to a flaky unit test to make it more stable — thanks [MatissJanis]
- [#781](https://github.com/actualbudget/actual/pull/781) Remove unused `tableNavigatorOpts` code-path — thanks [MatissJanis]
- [#783](https://github.com/actualbudget/actual/pull/783) Remove a few unused class components, convert a few components to functions — thanks [j-f1]
- [#784](https://github.com/actualbudget/actual/pull/784) Refactor `Nordigen` and category Autocomplete to the new react-select component — thanks [MatissJanis]
- [#786](https://github.com/actualbudget/actual/pull/786) Refactored all feature flags to use the new `useFeatureFlag` hook — thanks [MatissJanis]
- [#789](https://github.com/actualbudget/actual/pull/789) Enable new autocomplete in dev/preview builds — thanks [MatissJanis]
- [#790](https://github.com/actualbudget/actual/pull/790) Expose demo bank for easy bank-sync testing in dev and preview builds — thanks [MatissJanis]
- [#795](https://github.com/actualbudget/actual/pull/795) Disable flaky unit test steps — thanks [MatissJanis]
- [#800](https://github.com/actualbudget/actual/pull/800) Eliminate the `loot-design` package and move all of its code into `desktop-client` — thanks [j-f1]
- [#803](https://github.com/actualbudget/actual/pull/803) Docs: remove Rich from core contributors — thanks [MatissJanis]
- [#806](https://github.com/actualbudget/actual/pull/806) Retry loading backend script in web-workers (for local dev server) — thanks [MatissJanis]
- [#813](https://github.com/actualbudget/actual/pull/813) Added onboarding and budget e2e tests — thanks [MatissJanis]
- [#816](https://github.com/actualbudget/actual/pull/816) Initial setup to allow Typescript migration — thanks [albertogasparin]
- [#831](https://github.com/actualbudget/actual/pull/831) Moved `NewAutocomplete` component to TypeScript — thanks [MatissJanis]
- [#832](https://github.com/actualbudget/actual/pull/832) Allow `data:` URLs for images in Netlify deploys — thanks [j-f1]
- [#841](https://github.com/actualbudget/actual/pull/841) Initial migration of loot-core to Typescript — thanks [albertogasparin]
- [#845](https://github.com/actualbudget/actual/pull/845) Improve stability of budget e2e test file — thanks [MatissJanis]
- [#849](https://github.com/actualbudget/actual/pull/849) Update to latest stable `date-fns` version — thanks [j-f1]
- [#861](https://github.com/actualbudget/actual/pull/861) Enable linting for all packages — thanks [j-f1]

### Actual Server

Version: 23.4.0

#### Features

- [#178](https://github.com/actualbudget/actual-server/pull/178) Add some optional logging to help troubleshoot configuration issues — thanks [j-f1]

#### Enhancements

- [#141](https://github.com/actualbudget/actual-server/pull/141) Make the official Docker images available for armv7 — thanks [jamesmortensen]
- [#166](https://github.com/actualbudget/actual-server/pull/166) Expose sha256 hashes of account IBANs in Nordigen get-accounts and transactions endpoints — thanks [Jackenmen]
- [#172](https://github.com/actualbudget/actual-server/pull/172) Changed budget file download endpoint to use less memory by using streams — thanks [Jackenmen]

#### Bugfix

- [#167](https://github.com/actualbudget/actual-server/pull/167) Fix config.json in a default location getting silently ignored when it contains syntax errors. — thanks [Jackenmen]

#### Maintenance

- [#150](https://github.com/actualbudget/actual-server/pull/150) Update `docker-compose.yml` to clarify proper usage in production — thanks [j-f1]
- [#165](https://github.com/actualbudget/actual-server/pull/165) Add support for automatically generating release notes — thanks [j-f1]
- [#168](https://github.com/actualbudget/actual-server/pull/168) Expose demo bank that can be used to test Nordigen bank-sync — thanks [MatissJanis]
- [#171](https://github.com/actualbudget/actual-server/pull/171) Fix app-sync.test.js not being ran due to faulty jest configuration — thanks [Jackenmen]
- [#175](https://github.com/actualbudget/actual-server/pull/175) Push Docker images to new `actualbudget` Docker Hub organization. — thanks [trevdor]

## 23.3.2

**Docker tag: 23.3.2**

The release has the following notable features:

- Docker fix: don't make symlink
- Various Nordigen bank-sync bugfixes

### Actual

Version: 23.3.2

#### Bugfix

- [#738](https://github.com/actualbudget/actual/pull/738) Set the filename/filetype before attempting to parse — thanks [j-f1]
- [#744](https://github.com/actualbudget/actual/pull/744) (nordigen) fix detection of -0.00 "debited" transactions — thanks [Jackenmen]
- [#745](https://github.com/actualbudget/actual/pull/745) (nordigen) fallback to array version of remittanceInformationUnstructured if necessary — thanks [Jackenmen]
- [#247](https://github.com/actualbudget/actual/pull/247) Route aggregate queries in transaction grouped mode through the correct layer to remove deleted transactions — thanks [jlongster]
- [#743](https://github.com/actualbudget/actual/pull/743) (nordigen) fallback to bookingDate if valueDate is not set — thanks [MatissJanis]
- [#742](https://github.com/actualbudget/actual/pull/742) (nordigen) check server status before linking accs — thanks [MatissJanis]

#### Maintenance

- [#665](https://github.com/actualbudget/actual/pull/665) Remove year from the LICENSE — thanks [MatissJanis]

### Actual Server

Version: 23.3.2

#### Features

- [#162](https://github.com/actualbudget/actual-server/pull/162) (nordigen) add status endpoint for checking status — thanks [MatissJanis]

#### Bugfix

- [#156](https://github.com/actualbudget/actual-server/pull/156) Re-generate nordigen token — thanks [fstybel]
- [#157](https://github.com/actualbudget/actual-server/pull/157) Don’t make Dockerfile a symlink — thanks [j-f1]
- [#160](https://github.com/actualbudget/actual-server/pull/160) (nordigen) close window when opening /nordigen/link path — thanks [MatissJanis]
- [#163](https://github.com/actualbudget/actual-server/pull/163) (nordigen) add currency to account name — thanks [MatissJanis]

#### Maintenance

- [#161](https://github.com/actualbudget/actual-server/pull/161) Update README.md — thanks [suryaatevellore]
- [#140](https://github.com/actualbudget/actual-server/pull/140) Remove year from the LICENSE — thanks [MatissJanis]

## 23.3.1

**Docker tag: 23.3.1**

### Actual Server

Version: 23.3.1

#### Bugfix

- [#155](https://github.com/actualbudget/actual-server/pull/155) fix nordigen usage in fly.io — thanks [MatissJanis]

## 23.3.0

**Docker tag: 23.3.0**

The release has the following notable features:

- _Experimental_ support for automatically syncing transactions from European bank accounts using Nordigen.
- Filters in the the transaction list can now be edited.
- When connecting to a server for the first time, you no longer need to enter the server URL.
- You’ll now be notified of future updates to Actual.
- Large imports will no longer break in Safari.

### Actual

Version: 23.3.0

#### Features

- [#457](https://github.com/actualbudget/actual/pull/457) Nordigen integration - account sync — thanks [fstybel], [eberureon] & [j-f1]
- [#621](https://github.com/actualbudget/actual/pull/621) Implement outdated version indicator — thanks [vincentscode]
- [#646](https://github.com/actualbudget/actual/pull/646) Allow editing filters — thanks [j-f1]
- [#651](https://github.com/actualbudget/actual/pull/651) Add Toggle for hiding "Cleared" column — thanks [mnsrv]
- [#649](https://github.com/actualbudget/actual/pull/649) Allow the server to auto-configure the server URL for the client — thanks [j-f1]
- [#690](https://github.com/actualbudget/actual/pull/690) Added option to include exchange rate multiplier during import — thanks [carkom] & [MatissJanis]
- [#693](https://github.com/actualbudget/actual/pull/693) Add button and 'esc' shortcut to clear transaction filter — thanks [gsumpster]

#### Enhancements

- [#588](https://github.com/actualbudget/actual/pull/588) Updates to the template/goal feature — thanks [j-f1]
- [#648](https://github.com/actualbudget/actual/pull/648) Block enabling e2e encryption when the crypto API is unavailable — thanks [j-f1]
- [#657](https://github.com/actualbudget/actual/pull/657) Better explain the process for importing an exported file — thanks [j-f1]
- [#675](https://github.com/actualbudget/actual/pull/675) Don’t force user to re-enter password after changing it — thanks [j-f1]
- [#674](https://github.com/actualbudget/actual/pull/674) Make the “Not logged in” warning a button — thanks [j-f1]
- [#464](https://github.com/actualbudget/actual/pull/464) Updates to the @actual-budget/api package — thanks [j-f1]
- [#676](https://github.com/actualbudget/actual/pull/676) Update the Bootstrap page to be more welcoming — thanks [j-f1]
- [#680](https://github.com/actualbudget/actual/pull/680) Intelligently adjust field for newly added action — thanks [j-f1]
- [#692](https://github.com/actualbudget/actual/pull/692) (import) date formats supporting digits without leading zeros — thanks [MatissJanis]
- [#668](https://github.com/actualbudget/actual/pull/668) Adds delay before note is displayed on hover. — thanks [venkata-krishnas]
- [#727](https://github.com/actualbudget/actual/pull/727) (bank-sync) use full bank list + autocomplete — thanks [MatissJanis]

#### Bugfix

- [#660](https://github.com/actualbudget/actual/pull/660) Stop editing when clicking on blank areas of tables — thanks [j-f1]
- [#681](https://github.com/actualbudget/actual/pull/681) Don’t post messages to the worker until it is ready — thanks [j-f1]
- [#705](https://github.com/actualbudget/actual/pull/705) Don’t allow bulk editing to set a field to null — thanks [j-f1]
- [#700](https://github.com/actualbudget/actual/pull/700) Fix notes button not being visible unless hovered — thanks [j-f1]
- [#706](https://github.com/actualbudget/actual/pull/706) Allow rendering a schedule in `<Value />` — thanks [j-f1]
- [#707](https://github.com/actualbudget/actual/pull/707) Fix check for crypto.subtle — thanks [j-f1]
- [#712](https://github.com/actualbudget/actual/pull/712) Add a missing space to the fatal error message — thanks [j-f1]
- [#659](https://github.com/actualbudget/actual/pull/659) Improve handling of the undo/redo shortcuts — thanks [j-f1]
- [#457](https://github.com/actualbudget/actual/pull/457/commits/d868645d40fbc6105fe8b1d1a48e93b03c7a4c27) Fix for syncing large batches of updates in Safari — thanks [j-f1]

#### Maintenance

- [#647](https://github.com/actualbudget/actual/pull/647) (prettier) adding trailing commas — thanks [MatissJanis]
- [#663](https://github.com/actualbudget/actual/pull/663) remove closed-source subscription notification code — thanks [MatissJanis]
- [#671](https://github.com/actualbudget/actual/pull/671) Log more debugging information for an invalid-schema sync error — thanks [j-f1]
- [#678](https://github.com/actualbudget/actual/pull/678) Fix error cases in displaying filters/rules — thanks [j-f1]
- [#683](https://github.com/actualbudget/actual/pull/683) upgrade yarn to v3.4.1 (latest stable) — thanks [MatissJanis]
- [#684](https://github.com/actualbudget/actual/pull/684) add interactive-tools yarn plugin — thanks [MatissJanis]
- [#689](https://github.com/actualbudget/actual/pull/689) Don’t run linting while building in CI — thanks [j-f1]
- [#694](https://github.com/actualbudget/actual/pull/694) (e2e) adding e2e tests for schedules page — thanks [MatissJanis]
- [#695](https://github.com/actualbudget/actual/pull/695) (e2e) adding e2e tests for accounts: creating & closing — thanks [MatissJanis]
- [#697](https://github.com/actualbudget/actual/pull/697) moving back to create-react-app — thanks [MatissJanis]
- [#702](https://github.com/actualbudget/actual/pull/702) Remove/dedupe/upgrade several dependencies — thanks [j-f1]
- [#703](https://github.com/actualbudget/actual/pull/703) removing lively from MonthPicker — thanks [MatissJanis]
- [#704](https://github.com/actualbudget/actual/pull/704) remove unused component library code — thanks [MatissJanis]
- [#708](https://github.com/actualbudget/actual/pull/708) remove dead code: budget-sheets-old — thanks [MatissJanis]
- [#709](https://github.com/actualbudget/actual/pull/709) refactor MonthPicker and remove ElementQuery — thanks [MatissJanis]
- [#710](https://github.com/actualbudget/actual/pull/710) remove more dead code — thanks [MatissJanis]
- [#711](https://github.com/actualbudget/actual/pull/711) upgrade github actions — thanks [MatissJanis]
- [#713](https://github.com/actualbudget/actual/pull/713) removed usage of babel-preset-jwl-app — thanks [MatissJanis]
- [#714](https://github.com/actualbudget/actual/pull/714) Upgrade better-sqlite3 to the latest version — thanks [j-f1]
- [#715](https://github.com/actualbudget/actual/pull/715) re-enable react-hooks/rules-of-hooks eslint rule — thanks [MatissJanis]
- [#717](https://github.com/actualbudget/actual/pull/717) Fix e2e test to not assume it’s been run on Feb 28, 2023 — thanks [j-f1]
- [#718](https://github.com/actualbudget/actual/pull/718) upgrade react-modal to v3.16.1 and remove the patch — thanks [MatissJanis]
- [#720](https://github.com/actualbudget/actual/pull/720) Enable most of the disabled ESLint rules — thanks [j-f1]
- [#721](https://github.com/actualbudget/actual/pull/721) Remove code in loot-core/src/server/spreadsheet that uses escodegen — thanks [j-f1]
- [#729](https://github.com/actualbudget/actual/pull/729) Create an artifact with the built web UI for each commit — thanks [j-f1]
- [#733](https://github.com/actualbudget/actual/pull/733) Remove outdated part of the postinstall script — thanks [j-f1]

### Actual Server

Version: 23.3.0

#### Features

- [#74](https://github.com/actualbudget/actual-server/pull/74) & [#145](https://github.com/actualbudget/actual-server/pull/145) Backend integration with Nordigen - account sync — thanks [fstybel] & [MatissJanis]
- [#135](https://github.com/actualbudget/actual-server/pull/135) Auto-configure the client’s server URL — thanks [j-f1]

#### Bugfix

- [#133](https://github.com/actualbudget/actual-server/pull/133) Replace require with import — thanks [j-f1]

#### Maintenance

- [#121](https://github.com/actualbudget/actual-server/pull/121) Update the :edge images to use the very latest web UI version — thanks [j-f1] & [trevdor]
- [#146](https://github.com/actualbudget/actual-serve/pull/146) upgrade yarn to v3.4.1 and add interactive-tools plugin — thanks [MatissJanis]
- [#147](https://github.com/actualbudget/actual-serve/pull/147) Improve edge image build times — [j-f1]
- [#148](https://github.com/actualbudget/actual-serve/pull/148) adding trailing commas everywhere — [MatissJanis]
- [#149](https://github.com/actualbudget/actual-serve/pull/149) Fix edge image tagging — thanks [j-f1]
- [#153](https://github.com/actualbudget/actual-server/pull/153) Fix Docker actions failing on PRs from forks — thanks [j-f1]

## 23.2.9

**Docker tag: 23.2.9**

:::info

This release allows the user to bypass the SharedArrayBuffer warning that prevented the budget from loading in 23.2.5 when HTTPS was not in place with a certificate

:::

The release has the following improvement.

- Allow bypassing of SharedArrayBuffer warning when not using HTTPS

### Actual

Version: 23.2.9

#### Features

- [#644](https://github.com/actualbudget/actual/pull/644) Allow bypassing SharedArrayBuffer override — thanks [j-f1]

#### Bugfix

- [#640](https://github.com/actualbudget/actual/pull/640) Fix coloring of the “Split Transaction” button in the category picker — thanks [j-f1]
- [#641](https://github.com/actualbudget/actual/pull/641) Fix prop name for button to enable e2ee — thanks [j-f1]

#### Maintenance

- [#638](https://github.com/actualbudget/actual/pull/638) Allow the Netlify frontend to connect to arbitrary servers — thanks [j-f1]
- [#639](https://github.com/actualbudget/actual/pull/639) Move desktop-client deps to devDeps — thanks [j-f1]

### Actual Server

Version: 23.2.9

#### Maintenance

- [#128](https://github.com/actualbudget/actual-server/pull/128) Upgrade to ESM, update to latest dependencies — thanks [j-f1]
- [#131](https://github.com/actualbudget/actual-server/pull/131) Move source code to an src/ directory — thanks [j-f1]

## 23.2.5

**Docker tag: 23.2.5**

:::warning

This release introduces a breaking change, there is now a requirement for Actual to be served over HTTPS when not running on localhost. If you don't have a reverse proxy or certificate Actual will not load your budget.

:::

The release has notable security improvements. Highlights:

- e2e encryption
- login invalidation when changing password
- dependency upgrades to remove potential actual-server security vulnerabilities (although we don’t believe there were any severe issues)

### Actual

Version: 23.2.5

#### Features

- [#355](https://github.com/actualbudget/actual/pull/355) Schedule Editor: Keep payee list open while toggling transfer payees focus — thanks [trevdor]
- [#467](https://github.com/actualbudget/actual/pull/467) Add an “Experimental Features” section in the settings — thanks [j-f1]
- [#475](https://github.com/actualbudget/actual/pull/475) Add support for filtering the rules list — thanks [j-f1]
- [#482](https://github.com/actualbudget/actual/pull/482) Add option to control the "cleared state" in Rules — thanks [shall0pass]
- [#569](https://github.com/actualbudget/actual/pull/569) List of categories in transfer money dialog — thanks [shall0pass]
- [#570](https://github.com/actualbudget/actual/pull/570) Use navigitor.userAgent to determine isMobile — thanks [shall0pass]
- [#573](https://github.com/actualbudget/actual/pull/573) Goal templates — thanks [shall0pass]
- [#579](https://github.com/actualbudget/actual/pull/579) Add 'View on Hover' to Category Notes for #563 — thanks [gsumpster]
- [#580](https://github.com/actualbudget/actual/pull/580) Added date to export file name — thanks [rich-howell]
- [#584](https://github.com/actualbudget/actual/pull/585) Cover Overspending dropdown menu, open on click — thanks [shall0pass]
- [#590](https://github.com/actualbudget/actual/pull/590) Add support for filtering the schedules table — thanks [j-f1]
- [#593](https://github.com/actualbudget/actual/pull/593) Allow creating a payee with a name matching an existing account — thanks [j-f1]
- [#598](https://github.com/actualbudget/actual/pull/595) Allow configuring the server from any page on the management app — thanks [j-f1]
- [#600](https://github.com/actualbudget/actual/pull/600) Add a warning when SharedArrayBuffer is not available — thanks [j-f1]
- [#601](https://github.com/actualbudget/actual/pull/601) Improve handling of schedules that are missing a date — thanks [j-f1]
- [#602](https://github.com/actualbudget/actual/pull/602) Support arbitrary currency symbols in expressions — thanks [j-f1]
- [#617](https://github.com/actualbudget/actual/pull/617) Improve behavior of deleted payees/categories/accounts in rules — thanks [j-f1]

#### Bugfix

- [#88](https://github.com/actualbudget/actual/pull/88) Fix some YNAB4 importer bugs — thanks [rianmcguire]
- [#414](https://github.com/actualbudget/actual/pull/414) Fix condition mapping for payee rule creation from payee modal — thanks [winklevos]
- [#451](https://github.com/actualbudget/actual/pull/451) Fix bug where rules page may not load due to link-schedule payee dependency — thanks [winklevos]
- [#486](https://github.com/actualbudget/actual/pull/486) Fix TypeScript warning about too many files — thanks [j-f1]
- [#489](https://github.com/actualbudget/actual/pull/489) Fix “Repair split transactions” button being missing — thanks [j-f1]
- [#490](https://github.com/actualbudget/actual/pull/490) 🐛 (ynab4) transaction cleared state in imports — thanks [MatissJanis]
- [#574](https://github.com/actualbudget/actual/pull/574) Fix #488 — thanks [MatissJanis]
- [#572](https://github.com/actualbudget/actual/pull/572) fix: typo in reconcilation transaction creation — thanks [MatissJanis]
- [#591](https://github.com/actualbudget/actual/pull/591) Allow libofx to handle decoding imported files — thanks [j-f1]
- [#592](https://github.com/actualbudget/actual/pull/592) Update SelectedBalance to use useSheetValue — thanks [j-f1]
- [#599](https://github.com/actualbudget/actual/pull/599) Don’t crash when loading an invalid account ID — thanks [j-f1]
- [#605](https://github.com/actualbudget/actual/pull/605) Add a suggestion to upload the imported file if reporting an import bug — thanks [j-f1]
- [#620](https://github.com/actualbudget/actual/pull/620) Fixes editing closed account names issue #616 — thanks [n1thun]
- [#629](https://github.com/actualbudget/actual/pull/629) Fix form submission on TransferTooltip when pressing enter — thanks [gsumpster]
- [#630](https://github.com/actualbudget/actual/pull/630) Skip the “Starting Balance” transaction if the balance is 0 — thanks [j-f1]
- [#632](https://github.com/actualbudget/actual/pull/632) Fix default value of “Move to a category” — thanks [j-f1]

#### Maintenance

- [#469](https://github.com/actualbudget/actual/pull/469) 🚨 enabling no-unused-vars eslint rule — thanks [MatissJanis]
- [#472](https://github.com/actualbudget/actual/pull/372) 👷 disable failing electron builds — thanks [MatissJanis]
- [#485](https://github.com/actualbudget/actual/pull/485) Regenerate icons without the .web.js extension — thanks [j-f1]
- [#575](https://github.com/actualbudget/actual/pull/575) Add an issue template for feature requests — thanks [j-f1]
- [#586](https://github.com/actualbudget/actual/pull/586) ⬆️ upgrade caniuse-lite — thanks [MatissJanis]
- [#609](https://github.com/actualbudget/actual/pull/609) ⬆️ upgrade node-fetch to ^2.6.9 — thanks [MatissJanis]
- [#610](https://github.com/actualbudget/actual/pull/610) 🔖 (api) 4.1.6: node-fetch upgrade — thanks [MatissJanis]
- [#624](https://github.com/actualbudget/actual/pull/624) Fatal error dialog update to reflect open source — thanks [rich-howell]
- [#627](https://github.com/actualbudget/actual/pull/627) Remove all references to help@actualbudget.com — thanks [rich-howell]
- [#633](https://github.com/actualbudget/actual/pull/633) Removed reference to blog — thanks [rich-howell]
- [#635](https://github.com/actualbudget/actual/pull/635) Removing dead links [rich-howell]

### Actual Server

Version: 23.2.5

#### Features

- [#115](https://github.com/actualbudget/actual-server/pull/115) Add support for HTTPS — thanks [j-f1]

#### Bugfix

- [#109](https://github.com/actualbudget/actual-server/pull/109) fix: listen also listen on ipv6 addresses — thanks [heilerich]

#### Maintenance

- [#116](https://github.com/actualbudget/actual-server/pull/116) 🔥 remove unused code (plaid, sync-full) — thanks [MatissJanis]
- [#110](https://github.com/actualbudget/actual-server/pull/110) build(deps): bump node-fetch from 2.2.0 to 2.6.7
- [#111](https://github.com/actualbudget/actual-server/pull/111) build(deps): bump minimatch from 3.0.4 to 3.1.2
- [#112](https://github.com/actualbudget/actual-server/pull/112) build(deps): bump moment from 2.29.3 to 2.29.4
- [#117](https://github.com/actualbudget/actual-server/pull/117) build(deps): bump http-cache-semantics from 4.1.0 to 4.1.1
- [#118](https://github.com/actualbudget/actual-server/pull/118) ⬆️ upgrade @actual-app/api to 4.1.6: node-fetch v2 support — thanks [MatissJanis]
- [#119](https://github.com/actualbudget/actual-server/pull/119) ⬆️ upgrade express\*, bcrypt and body-parser — thanks [MatissJanis]

## 23.1.12

**Docker tag: 23.1.12**

The release has notable of improvements of:

- Read-only responsive view, this replaces our mobile apps, it is notable that this is read only only at this stage.
- Improvements to the sidebar design

### Actual

Version: 23.1.12

#### Features

- [#403](https://github.com/actualbudget/actual/pull/403) Replace URLs to point to https://actualbudget.github.io/docs — thanks [shall0pass]
- [#413](https://github.com/actualbudget/actual/pull/413) feat: allow creating test budget in netlify deployments — thanks [MatissJanis]
- [#420](https://github.com/actualbudget/actual/pull/420) feat: creating test budget on the config page — thanks [MatissJanis]
- [#426](https://github.com/actualbudget/actual/pull/426) Move “Find schedules” to a button on the Schedules page [j-f1]
- [#435](https://github.com/actualbudget/actual/pull/435) Read-only Responsive view — thanks [trevdor]
- [#440](https://github.com/actualbudget/actual/pull/440) Further iteration on the sidebar design — thanks [j-f1]

#### Bugfix

- [#423](https://github.com/actualbudget/actual/pull/423) Improve handling of “no server” state — thanks [j-f1]
- [#430](https://github.com/actualbudget/actual/pull/430) fix: select date filtering by month #406 🚑 — thanks [iurynogueira]
- [#441](https://github.com/actualbudget/actual/pull/441) Fix overlap of version info and server URL — thanks [trevdor]

#### Maintenance

- [#401](https://github.com/actualbudget/actual/pull/401) Update git attributes for better End of Line handling — thanks [winklevos]
- [#412](https://github.com/actualbudget/actual/pull/412) test: re-enable skipped unit tests — thanks [MatissJanis]
- [#415](https://github.com/actualbudget/actual/pull/415) chore: fix eslint issues and make warnings CI blocking — thanks [MatissJanis]
- [#418](https://github.com/actualbudget/actual/pull/418) fix: some react warnings — thanks [MatissJanis]
- [#421](https://github.com/actualbudget/actual/pull/421) chore: remove unused variables — thanks [MatissJanis]
- [#425](https://github.com/actualbudget/actual/pull/425) fix: re-disable no-unused-vars eslint rule — thanks [MatissJanis]
- [#428](https://github.com/actualbudget/actual/pull/428) chore: remove more unused variables — thanks [MatissJanis]
- [#429](https://github.com/actualbudget/actual/pull/429) prune: remove unused icons — thanks [MatissJanis]
- [#431](https://github.com/actualbudget/actual/pull/431) prune: remove unused variables — thanks [MatissJanis]
- [#434](https://github.com/actualbudget/actual/pull/434) Split the Settings component into multiple files — thanks [j-f1]
- [#437](https://github.com/actualbudget/actual/pull/437) chore: remove unsed vars & cleanups — thanks [MatissJanis]
- [#439](https://github.com/actualbudget/actual/pull/439) docs: add netlify as sponsors to README — thanks [MatissJanis]
- [#442](https://github.com/actualbudget/actual/pull/442) 🔥 removal of react-native mobile apps — thanks [MatissJanis]
- [#443](https://github.com/actualbudget/actual/pull/443) ⬆️ upgrade prettier and fix new issues — thanks [MatissJanis]

### Actual Server

Version: 23.1.12

No pull requests were merged in this release.

## 22.12.03

**Docker tag: 22.12.9**

:::warning

If you are upgrading from a release older than 22.10.25, read that versions release notes for steps regarding a breaking change.

Using Docker tags 22.12.3 or 22.12.8 have errors. **Use Docker tag 22.12.9**

:::

The release has notable of improvements of:

- Large values are supported
- Fix YNAB 4 and nYnab importers
- Fixed crashes in certain situations
- Accounts can now have notes
- Icon design was changed for more contrast.

A full accounting of the changes are listed below. Thank you to everyone who contributed!

### Actual

Version: 22.12.03

- [#218](https://github.com/actualbudget/actual/pull/218) Fix enter to create accounts — thanks [ezfe])
- [#266](https://github.com/actualbudget/actual/pull/266) RUpdate data-file-index.txt — thanks [j-f1]
- [#272](https://github.com/actualbudget/actual/pull/272) a11y: update cleared state display for clarity — thanks [rickdoesdev]
- [#273](https://github.com/actualbudget/actual/pull/273) Remove the hold for future months button — thanks [shall0pass]
- [#385](https://github.com/actualbudget/actual/pull/385) feat: ability to add notes to accounts — thanks [MatissJanis]
- [#386](https://github.com/actualbudget/actual/pull/386) Always pull in API package from workspace (fixes #378) — thanks [jlongster]
- [#387](https://github.com/actualbudget/actual/pull/387) Remove 32bit limit on amounts — thanks [jlongster]
- [#389](https://github.com/actualbudget/actual/pull/389) Add a help button to the menu — thanks [shall0pass]
- [#394](https://github.com/actualbudget/actual/pull/389) fix(useSheetValue): default value should be null not undefined — thanks [MatissJanis]
- [#396](https://github.com/actualbudget/actual/pull/396) Avoid pulling in the bundled app from API in backend — thanks [jlongster]

### Actual Server

Version : 22.12.09

Builds with Actual 22.12.03 and API 4.1.5.

## 22.10.25

**Docker tag: 22.10.25**

:::warning
This release includes a breaking change to the sync component that requires manual migration ([migration guide](/Getting-Started/migration/simple-sync)). Ensure your budget is [backed up](/Backup-Restore/Backups) before you update to avoid data loss
:::

This release of Actual does not include any of the following

- Actual Electron Desktop Application
- iOS Application
- Android Application

### Actual

Version: 22.10.25

- [#1](https://github.com/actualbudget/actual/pull/1) Add fields to package.json — thanks [coliff]
- [#3](https://github.com/actualbudget/actual/pull/3) Create .editorconfig — thanks [coliff]
- [#7](https://github.com/actualbudget/actual/pull/7) Add missing comma in package.json — thanks [S3B4S]
- [#20](https://github.com/actualbudget/actual/pull/20) add: tsconfig.json — thanks [wmertens]
- [#25](https://github.com/actualbudget/actual/pull/25) Building for Windows — thanks [ejmurra]
- [#46](https://github.com/actualbudget/actual/pull/46) Minor fixes to package.json file formatting — thanks [TomAFrench]
- [#47](https://github.com/actualbudget/actual/pull/47) Add missing comma to jest.config.js — thanks [TomAFrench]
- [#48](https://github.com/actualbudget/actual/pull/48) Remove some unnecessary files + add logs to gitignore — thanks [TomAFrench]
- [#50](https://github.com/actualbudget/actual/pull/50) Migrate to yarn v3 — thanks [TomAFrench]
- [#52](https://github.com/actualbudget/actual/pull/52) Remove unused imports — thanks [TomAFrench]
- [#53](https://github.com/actualbudget/actual/pull/53) Remove unused patch for react-native-safe-area-view — thanks [TomAFrench]
- [#54](https://github.com/actualbudget/actual/pull/54) Update importer packages package.json to point to monorepo — thanks [TomAFrench]
- [#55](https://github.com/actualbudget/actual/pull/55) Lock packages to the versions for which patches have been made — thanks [TomAFrench]
- [#59](https://github.com/actualbudget/actual/pull/59) Fix timestamp test suite — thanks [TomAFrench]
- [#64](https://github.com/actualbudget/actual/pull/64) Group CRDT files into their own directory — thanks [TomAFrench]
- [#65](https://github.com/actualbudget/actual/pull/65) Add documentation on how to build the protobuf — thanks [TomAFrench]
- [#68](https://github.com/actualbudget/actual/pull/68) Route all imports of AQL code through an index.js file — thanks [TomAFrench]
- [#69](https://github.com/actualbudget/actual/pull/69) Enforce sorting of contents of data-file-index.txt — thanks [TomAFrench]
- [#70](https://github.com/actualbudget/actual/pull/70) Add linting job to CI — thanks [TomAFrench]
- [#71](https://github.com/actualbudget/actual/pull/71) Add ability to import Actual files; enable export on desktop — thanks [jlongster]
- [#72](https://github.com/actualbudget/actual/pull/72) Fix some errors caused by using bash syntax with sh shebang — thanks [TomAFrench]
- [#73](https://github.com/actualbudget/actual/pull/73) Add a CI workflow to perform builds of api, web and electron packages — thanks [TomAFrench]
- [#80](https://github.com/actualbudget/actual/pull/80) Improved yarn scripts in desktop-electron package — thanks [TomAFrench]
- [#81](https://github.com/actualbudget/actual/pull/81) Remove unused yarn scripts — thanks [TomAFrench]
- [#94](https://github.com/actualbudget/actual/pull/94) currency-formatter -> Intl.NumberFormat — thanks [trevdor]
- [#95](https://github.com/actualbudget/actual/pull/95) Fix official node version to 16.15.0 — thanks [TomAFrench]
- [#96](https://github.com/actualbudget/actual/pull/96) Fix yaml formatting in CI config — thanks [TomAFrench]
- [#99](https://github.com/actualbudget/actual/pull/99) Dependency cleanup — thanks [TomAFrench]
- [#102](https://github.com/actualbudget/actual/pull/102) Fix test failure due to non-integer weight values — thanks [TomAFrench]
- [#104](https://github.com/actualbudget/actual/pull/104) Delete unused directory browser/build — thanks [TomAFrench]
- [#107](https://github.com/actualbudget/actual/pull/107) Update downshift patch to match installed version — thanks [TomAFrench]
- [#111](https://github.com/actualbudget/actual/pull/111) Remove holiday text from README — thanks [TomAFrench]
- [#112](https://github.com/actualbudget/actual/pull/112) display version on settings page — thanks [PartyLich]
- [#117](https://github.com/actualbudget/actual/pull/117) Fix: parse dates without a delimiter in CSV import — thanks [PartyLich]
- [#124](https://github.com/actualbudget/actual/pull/124) fix: hitting enter after setting password redirects to demo page — thanks [andremralves]
- [#129](https://github.com/actualbudget/actual/pull/129) Add action to mark new issues for triage — thanks [TomAFrench]
- [#130](https://github.com/actualbudget/actual/pull/130) Enforce prettier rules — thanks [TomAFrench]
- [#131](https://github.com/actualbudget/actual/pull/131) Silence warning for missing moment.js install — thanks [TomAFrench]
- [#132](https://github.com/actualbudget/actual/pull/132) Replace jwl-dev-utils with react-dev-utils — thanks [TomAFrench]
- [#135](https://github.com/actualbudget/actual/pull/135) Remove unused dependencies — thanks [TomAFrench]
- [#137](https://github.com/actualbudget/actual/pull/137) Skip failing test suites — thanks [TomAFrench]
- [#139](https://github.com/actualbudget/actual/pull/139) Remove unused rollup config and dependencies — thanks [TomAFrench]
- [#163](https://github.com/actualbudget/actual/pull/163) Force react-error-overlay to 6.0.9 to fix error — thanks [jlongster]
- [#164](https://github.com/actualbudget/actual/pull/164) build on windows — thanks [bdoherty]
- [#202](https://github.com/actualbudget/actual/pull/202) Run tests on github actions — thanks [TomAFrench]
- [#219](https://github.com/actualbudget/actual/pull/219) 199 Adding translation to schedules list — thanks [manuelcanepa]
- [#203](https://github.com/actualbudget/actual/pull/203) Replace babel-jest with ts-jest — thanks [TomAFrench]
- [#204](https://github.com/actualbudget/actual/pull/204) Use workspace ranges for monorepo dependencies — thanks [TomAFrench]
- [#208](https://github.com/actualbudget/actual/pull/208) Bug Report Template & Issues Configuration — thanks [rich-howell]
- [#213](https://github.com/actualbudget/actual/pull/213) Enforce linting in desktop-client — thanks [TomAFrench]
- [#214](https://github.com/actualbudget/actual/pull/214) Fix adm-zip install failure — thanks [trevdor]
- [#217](https://github.com/actualbudget/actual/pull/217) Remove unused imports and sort imports in desktop-client — thanks [TomAFrench]
- [#222](https://github.com/actualbudget/actual/pull/222) Remove patch-package dependency from loot-design — thanks [TomAFrench]
- [#224](https://github.com/actualbudget/actual/pull/224) Adding translation to rule editor and transaction table — thanks [manuelcanepa]
- [#225](https://github.com/actualbudget/actual/pull/225) Implement localization for schedule descriptions — thanks [j-f1]
- [#228](https://github.com/actualbudget/actual/pull/228) Add macOS to list of operating systems in the issue template — thanks [rich-howell]
- [#229](https://github.com/actualbudget/actual/pull/229) Fix handling of -0 in budget summary — thanks [j-f1]
- [#230](https://github.com/actualbudget/actual/pull/230) Revert change to make importers use the api bundle from inside the monorepo — thanks [TomAFrench]
- [#234](https://github.com/actualbudget/actual/pull/234) Allow enter to create new transaction when focused on cleared column — thanks [ezfe]
- [#232](https://github.com/actualbudget/actual/pull/232) Fix linter issues — thanks [TomAFrench]
- [#233](https://github.com/actualbudget/actual/pull/233) Enforce linting in loot-design — thanks [TomAFrench]
- [#237](https://github.com/actualbudget/actual/pull/237) Separate external, monorepo and internal imports — thanks [TomAFrench]
- [#238](https://github.com/actualbudget/actual/pull/238) Sort import in alphabetical order — thanks [TomAFrench]
- [#240](https://github.com/actualbudget/actual/pull/240) Fix CI to an exact node version — thanks [TomAFrench]
- [#244](https://github.com/actualbudget/actual/pull/244) Remove dollar sign from close account modal — thanks [TomAFrench]
- [#262](https://github.com/actualbudget/actual/pull/262) Render a schedule rule with the mapped payee id; fixes crash — thanks [jlongster]

### Actual Server

Version: 22.10.25

- [#1](https://github.com/actualbudget/actual-server/pull/1) - Adjust Dockerfile to build successfully — thanks [Kovah]
- [#2](https://github.com/actualbudget/actual-server/pull/2) - Instructions for running via Docker — thanks [ajtrichards]
- [#6](https://github.com/actualbudget/actual-server/pull/6) - Add hostname binding — thanks [UnexomWid]
- [#7](https://github.com/actualbudget/actual-server/pull/7) - added a basic docker-compose file — thanks [Kk-ships]
- [#11](https://github.com/actualbudget/actual-server/pull/11) - Add Github Actions workflow to automatically build a Docker image — thanks [Kovah]
- [#12](https://github.com/actualbudget/actual-server/pull/12) - Adjust Dockerfile to use multi-stage builds — thanks [Kovah]
- [#13](https://github.com/actualbudget/actual-server/pull/13) - add: tsconfig.json — thanks [wmertens]
- [#14](https://github.com/actualbudget/actual-server/pull/14) - Use Alpine Linux as base image for docker container — thanks [ldotlopez]
- [#19](https://github.com/actualbudget/actual-server/pull/19) - Add GH Action workflow to publish Docker image — thanks [m3nu]
- [#20](https://github.com/actualbudget/actual-server/pull/20) - Add one-click hosting option — thanks [m3nu]
- [#21](https://github.com/actualbudget/actual-server/pull/21) - Health Check Endpoint — thanks [Silvenga]
- [#22](https://github.com/actualbudget/actual-server/pull/22) - Add Dockerfile.alpine for alpine build add tini to debian image — thanks [brtwrst]
- [#28](https://github.com/actualbudget/actual-server/pull/28) Transition to typescript — thanks [PartyLich]
- [#31](https://github.com/actualbudget/actual-server/pull/31) Correct fly template port — thanks [ciwchris]
- [#33](https://github.com/actualbudget/actual-server/pull/33) Add more appropriate linting setup — thanks [TomAFrench]
- [#37](https://github.com/actualbudget/actual-server/pull/37) Add linter checks to CI — thanks [TomAFrench]
- [#41](https://github.com/actualbudget/actual-server/pull/41) Check builds are successful on PRs/master — thanks [TomAFrench]
- [#43](https://github.com/actualbudget/actual-server/pull/43) Enforce prettier rules — thanks [TomAFrench]
- [#46](https://github.com/actualbudget/actual-server/pull/46) fix: error handling middleware signature — thanks [JazzaG]
- [#50](https://github.com/actualbudget/actual-server/pull/50) Fix Cross-Origin issues to enable SharedArrayBuffer — thanks [jlongster]
- [#51](https://github.com/actualbudget/actual-server/pull/51) Bump Actual to 4.1.0 — thanks [jlongster]
- [#52](https://github.com/actualbudget/actual-server/pull/52) Fix 'Out of sync' error — thanks [7brend7]
- [#64](https://github.com/actualbudget/actual-server/pull/64) build: add node GC argument to fly template — thanks [PartyLich]
- [#65](https://github.com/actualbudget/actual-server/pull/65) build: add tini subreaper arg to fly template — thanks [PartyLich]
- [#70](https://github.com/actualbudget/actual-server/pull/70) Update Express to version 4.17 — thanks [rich-howell]
- [#72](https://github.com/actualbudget/actual-server/pull/72) Fix/download only necessary files — thanks [PartyLich]
- [#75](https://github.com/actualbudget/actual-server/pull/75) Switch syncing to simple sync method — thanks [jlongster]
- [#78](https://github.com/actualbudget/actual-server/pull/78) Respect configuration for user-files and don't init the app — thanks [jlongster]
- [#81](https://github.com/actualbudget/actual-server/pull/81) Store user files as blobs instead of unzipping them — thanks [jlongster]
- [#82](https://github.com/actualbudget/actual-server/pull/82) Build docker image on push to master or tag — thanks [trevdor]

[7brend7]: https://github.com/7brend7
[aharbis]: https://github.com/aharbis
[ajtrichards]: https://github.com/ajtrichards
[albertogasparin]: https://github.com/albertogasparin
[andremralves]: https://github.com/andremralves
[bdoherty]: https://github.com/bdoherty
[biohzrddd]: https://github.com/biohzrddd
[brtwrst]: https://github.com/brtwrst
[carkom]: https://github.com/carkom
[ciwchris]: https://github.com/ciwchris
[coliff]: https://github.com/coliff
[eberureon]: https://github.com/eberureon
[ejmurra]: https://github.com/ejmurra
[ezfe]: https://github.com/ezfe
[fstybel]: https://github.com/fstybel
[gsumpster]: https://github.com/gsumpster
[heilerich]: https://github.com/heilerich
[iurynogueira]: https://github.com/iurynogueira
[intiplink]: https://github.com/intiplink
[j-f1]: https://github.com/j-f1
[Jackenmen]: https://github.com/Jackenmen
[jamesmortensen]: https://github.com/jamesmortensen
[JazzaG]: https://github.com/JazzaG
[jlongster]: https://github.com/jlongster
[Kk-ships]: https://github.com/Kk-ships
[Kovah]: https://github.com/Kovah
[ldotlopez]: https://github.com/ldotlopez
[m3nu]: https://github.com/m3nu
[manuelcanepa]: https://github.com/manuelcanepa
[MatissJanis]: https://github.com/MatissJanis
[mnsrv]: https://github.com/mnsrv
[modrzew]: https://github.com/modrzew
[n1thun]: https://github.com/n1thun
[ostat]: https://github.com/ostat
[PartyLich]: https://github.com/PartyLich
[pmamberti]: https://github.com/pmamberti
[pole95]: https://github.com/pole95
[rianmcguire]: https://github.com/rianmcguire
[rich-howell]: https://github.com/rich-howell
[rickdoesdev]: https://github.com/rickdoesdev
[S3B4S]: https://github.com/S3B4S
[shall0pass]: https://github.com/shall0pass
[Silvenga]: https://github.com/Silvenga
[suryaatevellore]: https://github.com/suryaatevellore
[TomAFrench]: https://github.com/TomAFrench
[trevdor]: https://github.com/trevdor
[UnexomWid]: https://github.com/UnexomWid
[venkata-krishnas]: https://github.com/venkata-krishnas
[vincentscode]: https://github.com/vincentscode
[waseem-h]: https://github.com/waseem-h
[winklevos]: https://github.com/winklevos
[wmertens]: https://github.com/wmertens
