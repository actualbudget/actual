# Release Notes

## 24.9.0

The release has the following notable improvements:

- mobile: long-press transactions to reveal more actions
- transactions table: show imported payee on hover of payee column
- filtering: ability to filter by "has tags" conditions
- budgets: highlight current month
- imports: ability to skip heading lines
- experimental: custom report homepage (dashboards)

### Actual

#### Features

- [#2892](https://github.com/actualbudget/actual/pull/2892) Long press transactions in mobile account view to reveal action bar with more actions. — thanks @joel-jeremy
- [#3231](https://github.com/actualbudget/actual/pull/3231) Customizable dashboard for reports page - drag-able and resizable widgets. — thanks @MatissJanis
- [#3234](https://github.com/actualbudget/actual/pull/3234) Added an optional configuration value to skip one or more heading lines (added by some banks, like ING) during the CSV transactions import. — thanks @Horizon0156
- [#3271](https://github.com/actualbudget/actual/pull/3271) Update README to add Weblate project, a crowdsourced translation tool. — thanks @julianwachholz

#### Enhancements

- [#2923](https://github.com/actualbudget/actual/pull/2923) Show split transactions in schedule previews. — thanks @jfdoming
- [#3018](https://github.com/actualbudget/actual/pull/3018) Add imported payee tooltip to transaction tables — thanks @matt-fidd
- [#3036](https://github.com/actualbudget/actual/pull/3036) Introduce i18n framework to prepare for translations. — thanks @julianwachholz
- [#3111](https://github.com/actualbudget/actual/pull/3111) Highlight current month in budgets. — thanks @psybers
- [#3122](https://github.com/actualbudget/actual/pull/3122) Shorten hidden category names imported from YNAB4. — thanks @alcroito
- [#3140](https://github.com/actualbudget/actual/pull/3140) Add `reset-hold` and `hold-for-next-month` methods to the API — thanks @rodriguestiago0
- [#3181](https://github.com/actualbudget/actual/pull/3181) Update option name of experimental Monthly Spending Report — thanks @TimQuelch
- [#3188](https://github.com/actualbudget/actual/pull/3188) Filter by account when linking schedules and add shortcut "S" to link schedule. — thanks @psybers
- [#3203](https://github.com/actualbudget/actual/pull/3203) Identify Payee and Notes fields by name if they exist in CSV import — thanks @spalmurray
- [#3215](https://github.com/actualbudget/actual/pull/3215) Add rule actions to prepend/append to transaction notes. — thanks @psybers
- [#3246](https://github.com/actualbudget/actual/pull/3246) Allow escaping tags with double ##. — thanks @psybers
- [#3270](https://github.com/actualbudget/actual/pull/3270) Support translations in desktop-client/components/filters. — thanks @psybers
- [#3275](https://github.com/actualbudget/actual/pull/3275) Support translations in desktop-client/components/autocomplete. — thanks @psybers
- [#3280](https://github.com/actualbudget/actual/pull/3280) Support translations in desktop-client/components/budget/report. — thanks @psybers
- [#3283](https://github.com/actualbudget/actual/pull/3283) Added feedback links besides the experimental feature flags. — thanks @MatissJanis
- [#3284](https://github.com/actualbudget/actual/pull/3284) Dashboards: ability to rename all the widgets. — thanks @Matissjanis
- [#3290](https://github.com/actualbudget/actual/pull/3290) Add new 'has tag(s)' filter to filter note tags. — thanks @lelemm
- [#3299](https://github.com/actualbudget/actual/pull/3299) Support translations in desktop-client/components/reports/graphs. — thanks @psybers
- [#3302](https://github.com/actualbudget/actual/pull/3302) Support translations in desktop-client/components/sidebar. — thanks @psybers

#### Bugfix

- [#2970](https://github.com/actualbudget/actual/pull/2970) Fix false positives for duplicate filters error when saving a new filter. — thanks @scivarolo
- [#2974](https://github.com/actualbudget/actual/pull/2974) Fix: Automatically focus inputs, or the primary button, in modals. — thanks @psybers
- [#2991](https://github.com/actualbudget/actual/pull/2991) Prevent transaction deduplication for imported transactions — thanks @ttlgeek, @strazto, & @pmoon00
- [#3044](https://github.com/actualbudget/actual/pull/3044) Fix decimal comma parsing for ofx files — thanks @youngcw & @wdpk
- [#3115](https://github.com/actualbudget/actual/pull/3115) Hide the target category from the cover overspending category list — thanks @matt-fidd
- [#3205](https://github.com/actualbudget/actual/pull/3205) Fix typo in error message — thanks @matt-fidd
- [#3206](https://github.com/actualbudget/actual/pull/3206) Fix mobile account status indicators cutting off. — thanks @psybers
- [#3209](https://github.com/actualbudget/actual/pull/3209) Adjusting UI so that spending report works on mobile. — thanks @carkom
- [#3212](https://github.com/actualbudget/actual/pull/3212) Fix gocardless "Linking back account" integration in Desktop app. — thanks @MikesGlitch
- [#3220](https://github.com/actualbudget/actual/pull/3220) Fix electron builds throwing "We had an unknown problem opening file" — thanks @MikesGlitch
- [#3232](https://github.com/actualbudget/actual/pull/3232) Fix import transaction issue introduced by strict id checking feature — thanks @pmoon00
- [#3237](https://github.com/actualbudget/actual/pull/3237) Fix crash when visiting later months — thanks @jfdoming
- [#3239](https://github.com/actualbudget/actual/pull/3239) Fix transfer category in temporary transactions — thanks @jfdoming
- [#3241](https://github.com/actualbudget/actual/pull/3241) Fixed category appearing in last slot when you drag it to the second-to-last slot — thanks @JL102
- [#3242](https://github.com/actualbudget/actual/pull/3242) Fixed translation keys being shown verbatim without interpolation — thanks @julianwachholz
- [#3250](https://github.com/actualbudget/actual/pull/3250) Fix Export on Mac desktop app — thanks @MikesGlitch
- [#3251](https://github.com/actualbudget/actual/pull/3251) Fix issue with importing transactions failing on new accounts (issue #3211). — thanks @eireksten
- [#3257](https://github.com/actualbudget/actual/pull/3257) Fix regression in button color for spending graph. — thanks @carkom
- [#3258](https://github.com/actualbudget/actual/pull/3258) Show category for on-to-off-budget transfers — thanks @jfdoming
- [#3278](https://github.com/actualbudget/actual/pull/3278) Filter fix when alternating all <-> any — thanks @lelemm
- [#3287](https://github.com/actualbudget/actual/pull/3287) Apply regular expression conditions to imported transactions. — thanks @psybers & @jameshurst
- [#3295](https://github.com/actualbudget/actual/pull/3295) Fix incorrect month on spending card — thanks @Crazypkr1099
- [#3318](https://github.com/actualbudget/actual/pull/3318) Fix display of deleted payees in suggested payee list — thanks @qedi-r
- [#3323](https://github.com/actualbudget/actual/pull/3323) Dashboards: add back spending report if dashboards are not enabled — thanks @MatissJanis
- [#3324](https://github.com/actualbudget/actual/pull/3324) Fix "s" hotkey breaking in transaction table. — thanks @MatissJanis
- [#3333](https://github.com/actualbudget/actual/pull/3333) Fix toggleSpentColumn being called on every render on mobile — thanks @tim-smart
- [#3337](https://github.com/actualbudget/actual/pull/3337) Fix schedules modal closing when selecting transactions to link. — thanks @MatissJanis
- [#3338](https://github.com/actualbudget/actual/pull/3338) Fix reconciliation closing on `enter` click. — thanks @MatissJanis
- [#3340](https://github.com/actualbudget/actual/pull/3340) Fix long payee names overflowing in transaction table. — thanks @MatissJanis
- [#3342](https://github.com/actualbudget/actual/pull/3342) Prevent tooltips showing on budget notes when using touch devices — thanks @MikesGlitch

#### Maintenance

- [#2984](https://github.com/actualbudget/actual/pull/2984) Use new react-aria-components based Button on sidebar, notifications, transactions, recurring schedule picker, etc. — thanks @joel-jeremy
- [#3093](https://github.com/actualbudget/actual/pull/3093) Support type-checking on spreadsheet fields (part 1) — thanks @jfdoming
- [#3095](https://github.com/actualbudget/actual/pull/3095) Support type-checking on spreadsheet fields (part 2) — thanks @jfdoming
- [#3097](https://github.com/actualbudget/actual/pull/3097) Support type-checking on spreadsheet fields (part 3) — thanks @jfdoming
- [#3114](https://github.com/actualbudget/actual/pull/3114) Disable typography linter in tests — thanks @jfdoming
- [#3156](https://github.com/actualbudget/actual/pull/3156) Use new react-aria-components based Button on desktop and mobile budget pages. — thanks @joel-jeremy
- [#3159](https://github.com/actualbudget/actual/pull/3159) Use new react-aria-components based Button on reports page. — thanks @joel-jeremy
- [#3166](https://github.com/actualbudget/actual/pull/3166) Tweaking the UI of spending report to make it more consistent with other reports. — thanks @carkom
- [#3178](https://github.com/actualbudget/actual/pull/3178) Custom reports: unify `selectedCategories` and `conditions` data source. — thanks @MatissJanis
- [#3180](https://github.com/actualbudget/actual/pull/3180) TypeScript: make category and rule entities stricter. — thanks @MatissJanis
- [#3183](https://github.com/actualbudget/actual/pull/3183) Add unit tests for the existing goal template types. — thanks @ACWalker
- [#3185](https://github.com/actualbudget/actual/pull/3185) Package Electron app as Appx for use in the Windows Store. — thanks @MikesGlitch
- [#3186](https://github.com/actualbudget/actual/pull/3186) Improve VRT test stability. — thanks @MatissJanis
- [#3198](https://github.com/actualbudget/actual/pull/3198) Reports: improve `useReports` data fetching hook to return the loading state. — thanks @MatissJanis
- [#3200](https://github.com/actualbudget/actual/pull/3200) Reports: add `showTooltip` prop for controlling tooltip visibility. — thanks @MatissJanis
- [#3219](https://github.com/actualbudget/actual/pull/3219) Making Server logs visible in devtools on Electron — thanks @MikesGlitch
- [#3221](https://github.com/actualbudget/actual/pull/3221) Extract, refactor and test note handling logic from `goaltemplates.ts` file. — thanks @ACWalker
- [#3236](https://github.com/actualbudget/actual/pull/3236) Separate `LocalPrefs` interface out into `LocalPrefs` (eventually using local storage), `SyncedPrefs` (eventually using the cross-device database) and `MetadataPrefs` (eventually using the `metadata.json` file). — thanks @Matissjanis
- [#3238](https://github.com/actualbudget/actual/pull/3238) Remove some `any` types from the API — thanks @jfdoming
- [#3262](https://github.com/actualbudget/actual/pull/3262) Cleanup `iterableTopologicalSort` feature flag. — thanks @Matissjanis
- [#3279](https://github.com/actualbudget/actual/pull/3279) Optimise GoCardless sync to reduce API usage by removing balance information when unneeded — thanks @matt-fidd
- [#3285](https://github.com/actualbudget/actual/pull/3285) TypeScript: migrate report cards to TS. — thanks @Matissjanis
- [#3289](https://github.com/actualbudget/actual/pull/3289) Upgrade `TypeScript`, `eslint` and `prettier`. — thanks @MatissJanis
- [#3296](https://github.com/actualbudget/actual/pull/3296) Better debug logs for bank sync errors. — thanks @psybers
- [#3300](https://github.com/actualbudget/actual/pull/3300) Sign the Mac desktop app to resolve damaged file errors — thanks @MikesGlitch
- [#3308](https://github.com/actualbudget/actual/pull/3308) Support servers with self signed certificates in the Desktop app — thanks @MikesGlitch

### Actual Server

#### Enhancements

- [#358](https://github.com/actualbudget/actual-server/pull/358) Add gocardless support for Berliner Sparkasse (Germany) — thanks @Peccadilloz
- [#418](https://github.com/actualbudget/actual-server/pull/418) Add SANTANDER_BSCHESMM to banks with limited history — thanks @sarfios20 & @DanielHaggstrom
- [#441](https://github.com/actualbudget/actual-server/pull/441) Added Nordea Personal DK (NORDEA_NDEADKKK) to BANKS_WITH_LIMITED_HISTORY — thanks @hsk-dk

#### Bugfix

- [#409](https://github.com/actualbudget/actual-server/pull/409) Fix crash when SimpleFIN JSON data is bad. — thanks @psybers & @iffy
- [#410](https://github.com/actualbudget/actual-server/pull/410) Stop server crashing when SimpleFIN is down. — thanks @psybers
- [#412](https://github.com/actualbudget/actual-server/pull/412) Show better error if SimpleFIN account cant be found. — thanks @psybers
- [#413](https://github.com/actualbudget/actual-server/pull/413) Return early from SimpleFIN /transactions if the account needs attention — thanks @jpetso
- [#427](https://github.com/actualbudget/actual-server/pull/427) Fix payee name selection based on the transaction amount — thanks @matt-fidd
- [#428](https://github.com/actualbudget/actual-server/pull/428) Fallback creditorName to remittanceInformationUnstructured in BANKINTER_BKBKESMM — thanks @hostyn
- [#429](https://github.com/actualbudget/actual-server/pull/429) Prevent account fallback if name is defined in formatPayeeName — thanks @hostyn
- [#439](https://github.com/actualbudget/actual-server/pull/439) Fix GoCardless error handling — thanks @matt-fidd
- [#442](https://github.com/actualbudget/actual-server/pull/442) Fix wrong payeeName used for KBC_KREDBEBB — thanks @ArnaudWeyts

#### Maintenance

- [#421](https://github.com/actualbudget/actual-server/pull/421) Improve testing utils and add delete-user-file test — thanks @tcrasset
- [#422](https://github.com/actualbudget/actual-server/pull/422) Refactor user validation into middleware — thanks @tcrasset
- [#423](https://github.com/actualbudget/actual-server/pull/423) Add integration tests for the /sync endpoint — thanks @tcrasset
- [#425](https://github.com/actualbudget/actual-server/pull/425) Add integration tests for remaining app-sync.js endpoints — thanks @tcrasset
- [#430](https://github.com/actualbudget/actual-server/pull/430) CI workflow for pinging PRs that have been in the "WIP" state for a week without an update. — thanks @MatissJanis & @matt-fidd
- [#434](https://github.com/actualbudget/actual-server/pull/434) Add logging middleware — thanks @tcrasset
- [#435](https://github.com/actualbudget/actual-server/pull/435) Optimise GoCardless sync to reduce API usage by removing accountMetadata call — thanks @matt-fidd
- [#436](https://github.com/actualbudget/actual-server/pull/436) Optimise GoCardless sync to reduce API usage by removing balance information — thanks @matt-fidd

## 24.8.0

The release has the following notable improvements:

- ability to favorite payees
- most used and favorite payees appear at the top of the payee autocomplete results
- resizable side navigation
- experimental goal templates: long term goal template support
- experimental spending report: adding last month as an option for the primary graph

### Actual

#### Features

- [#2930](https://github.com/actualbudget/actual/pull/2930) Add getAccountBalance() API. — thanks @psybers
- [#2993](https://github.com/actualbudget/actual/pull/2993) Adds ability to resize sidebar. — thanks @YusefOuda
- [#3033](https://github.com/actualbudget/actual/pull/3033) Add help modal for keyboard shortcuts. — thanks @psybers

#### Enhancements

- [#2717](https://github.com/actualbudget/actual/pull/2717) Explicitly ask when reconciling transactions on manual import — thanks @Wizmaster
- [#2814](https://github.com/actualbudget/actual/pull/2814) Shows favourite and up to the top 5 most frequently used payees in the payee dropdown menu in a section at the top. — thanks @qedi-r
- [#2834](https://github.com/actualbudget/actual/pull/2834) Reapply rules to split transactions when the parent changes — thanks @jfdoming
- [#2928](https://github.com/actualbudget/actual/pull/2928) API: add getBudgets() method to list all local/remote budgets. — thanks @psybers
- [#2980](https://github.com/actualbudget/actual/pull/2980) Add PWA shortcut actions — thanks @julianwachholz
- [#2982](https://github.com/actualbudget/actual/pull/2982) Add apostrophe-dot (Swiss) number format — thanks @julianwachholz
- [#3012](https://github.com/actualbudget/actual/pull/3012) Add long term goal type template — thanks @youngcw
- [#3017](https://github.com/actualbudget/actual/pull/3017) Moved budget type toggle to the settings page — thanks @MatissJanis
- [#3022](https://github.com/actualbudget/actual/pull/3022) Expose bank sync account data ('account_id' and 'official_name') in AQL. — thanks @psybers
- [#3028](https://github.com/actualbudget/actual/pull/3028) Add `mergePayees` method to the API — thanks @matt-fidd
- [#3029](https://github.com/actualbudget/actual/pull/3029) Perform bank sync in same order as accounts shown in sidebar. — thanks @psybers
- [#3032](https://github.com/actualbudget/actual/pull/3032) Dim hidden income category rows. — thanks @psybers
- [#3045](https://github.com/actualbudget/actual/pull/3045) Enhanced Autocomplete sorting, Payees tab filter, and Schedules tab filter for languages with accents / diacritics. — thanks @nullscope
- [#3049](https://github.com/actualbudget/actual/pull/3049) Include more information in payee of split parent — thanks @jfdoming
- [#3056](https://github.com/actualbudget/actual/pull/3056) Add payee auto capitalization when creating on mobile — thanks @JukeboxRhino
- [#3061](https://github.com/actualbudget/actual/pull/3061) Add additional keyboard hotkeys. — thanks @psybers
- [#3100](https://github.com/actualbudget/actual/pull/3100) Added Keyboard Shortcuts Reference to the Electron Help menu — thanks @MikesGlitch
- [#3112](https://github.com/actualbudget/actual/pull/3112) Add a save button to Spending report so you can keep filter settings between sessions — thanks @carkom
- [#3117](https://github.com/actualbudget/actual/pull/3117) Adding a "+1" to custom reports to indicate that the current month toggle is on. — thanks @carkom
- [#3123](https://github.com/actualbudget/actual/pull/3123) Add a goal information tooltip to the balance on the budget table — thanks @matt-fidd
- [#3132](https://github.com/actualbudget/actual/pull/3132) In spending report - adding last month as an option for the primary graph — thanks @carkom

#### Bugfix

- [#2818](https://github.com/actualbudget/actual/pull/2818) Fix Net Worth amounts being clipped when over 5 characters — thanks @sreetamdas
- [#2832](https://github.com/actualbudget/actual/pull/2832) Fix number format preference not being used for graphs — thanks @sreetamdas
- [#2898](https://github.com/actualbudget/actual/pull/2898) Bank sync: fix account with new transactions highlight disappearing if multiple consecutive accounts are synced. — thanks @MatissJanis
- [#2903](https://github.com/actualbudget/actual/pull/2903) Use Unicode-aware database queries for filtering and searching. — thanks @dymanoid
- [#2924](https://github.com/actualbudget/actual/pull/2924) Disable interactivity on preview status icons — thanks @jfdoming
- [#2943](https://github.com/actualbudget/actual/pull/2943) Fix the carryover arrow display for mobile and desktop views. — thanks @dymanoid
- [#2956](https://github.com/actualbudget/actual/pull/2956) Fix: Warning modal was not showing a second time. — thanks @psybers
- [#2960](https://github.com/actualbudget/actual/pull/2960) Fix time display of backup on Electrons "Load Backup" modal — thanks @MikesGlitch
- [#2968](https://github.com/actualbudget/actual/pull/2968) Fix: editing transactions on mobile not going back. — thanks @psybers
- [#2973](https://github.com/actualbudget/actual/pull/2973) Fix exporting split transactions to CSV by including top-line transactions and noting the split. — thanks @wdpk
- [#2981](https://github.com/actualbudget/actual/pull/2981) Fix number parsing with and remove unsupported "space-dot" format — thanks @julianwachholz
- [#2983](https://github.com/actualbudget/actual/pull/2983) Removed broken update functionality and "About" screen for Electron app — thanks @MikesGlitch
- [#2990](https://github.com/actualbudget/actual/pull/2990) Assign schedule to both transactions if schedule is a transfer — thanks @joel-jeremy
- [#3001](https://github.com/actualbudget/actual/pull/3001) Moves "Rename" to first item in Category + Category Group menus. Adds debounce to sidebar animation. — thanks @YusefOuda
- [#3007](https://github.com/actualbudget/actual/pull/3007) Fix alignment of reports — thanks @JukeboxRhino
- [#3008](https://github.com/actualbudget/actual/pull/3008) Fix cover modal title. — thanks @joel-jeremy
- [#3009](https://github.com/actualbudget/actual/pull/3009) Fix datepicker closing when trying to edit a date filter — thanks @MatissJanis
- [#3011](https://github.com/actualbudget/actual/pull/3011) Fix apply template resetting the goals on already set categories — thanks @youngcw
- [#3019](https://github.com/actualbudget/actual/pull/3019) Fix payee creation for long names on narrow screens — thanks @JukeboxRhino
- [#3037](https://github.com/actualbudget/actual/pull/3037) Fix the position of the separator in the operator menu when editing a rule — thanks @ctozlowski
- [#3046](https://github.com/actualbudget/actual/pull/3046) Fixes the alignment of notifications in mobile view — thanks @YusefOuda
- [#3062](https://github.com/actualbudget/actual/pull/3062) Increase the font-weight of the mobile category label to match the value totals — thanks @JukeboxRhino
- [#3073](https://github.com/actualbudget/actual/pull/3073) Fix rules in mobile transaction entry — thanks @joel-jeremy
- [#3080](https://github.com/actualbudget/actual/pull/3080) Update running balances width to display large numbers. — thanks @psybers
- [#3082](https://github.com/actualbudget/actual/pull/3082) Fix running balances thick header. — thanks @psybers
- [#3084](https://github.com/actualbudget/actual/pull/3084) Fix "?" crashing on budget selection page. — thanks @psybers
- [#3086](https://github.com/actualbudget/actual/pull/3086) Fix crash on CAMT.053 imports with missing ValDt — thanks @simonschmidt
- [#3092](https://github.com/actualbudget/actual/pull/3092) Correctly dismiss pop-over when using the copy last month's budget feature — thanks @sleepyfran
- [#3113](https://github.com/actualbudget/actual/pull/3113) Updated Fly.io link in README to point to correct section of documentation. — thanks @reecerunnells
- [#3127](https://github.com/actualbudget/actual/pull/3127) Fix issue with schema in updateReports function that was using insert instead of update — thanks @carkom
- [#3131](https://github.com/actualbudget/actual/pull/3131) Fix menus auto closed when clicked element on top of the menu — thanks @joel-jeremy
- [#3133](https://github.com/actualbudget/actual/pull/3133) Fix the Data Dir Location picker not showing on the Settings page when running in Electron. — thanks @MikesGlitch
- [#3135](https://github.com/actualbudget/actual/pull/3135) Fixes spending card that doesn't show the correct difference number. — thanks @carkom
- [#3142](https://github.com/actualbudget/actual/pull/3142) Add missing `:hover` cursor to the new `Button` component. — thanks @MatissJanis
- [#3143](https://github.com/actualbudget/actual/pull/3143) Add missing underline to links. — thanks @MatissJanis
- [#3146](https://github.com/actualbudget/actual/pull/3146) Fix Button2 isDisabled prop. — thanks @joel-jeremy
- [#3147](https://github.com/actualbudget/actual/pull/3147) Add backdrop for Modal2 component. — thanks @joel-jeremy
- [#3149](https://github.com/actualbudget/actual/pull/3149) Fix missing error handling in rules modal. — thanks @MatissJanis
- [#3151](https://github.com/actualbudget/actual/pull/3151) Fix plain-text SimpleFin link in error message. — thanks @MatissJanis
- [#3153](https://github.com/actualbudget/actual/pull/3153) Fix the "Enter" shortcut not saving on "Cover Overspending" popup — thanks @MikesGlitch
- [#3158](https://github.com/actualbudget/actual/pull/3158) Fix local playwright html reporter config. — thanks @joel-jeremy
- [#3160](https://github.com/actualbudget/actual/pull/3160) Remove focus outline from modals. — thanks @MatissJanis
- [#3161](https://github.com/actualbudget/actual/pull/3161) Allow modal content to be vertically scrollable. — thanks @MatissJanis & @MikesGlitch
- [#3168](https://github.com/actualbudget/actual/pull/3168) Fix input fields overflowing while adding split transactions — thanks @wnklmnn
- [#3169](https://github.com/actualbudget/actual/pull/3169) Fix budget type toggle not working the first time — thanks @YusefOuda

#### Maintenance

- [#2721](https://github.com/actualbudget/actual/pull/2721) Move bank sync payee name normalization from actual to actual-server — thanks @matt-fidd
- [#2828](https://github.com/actualbudget/actual/pull/2828) Migrating native `Tooltip` component to react-aria Tooltip/Popover (vol.10) — thanks @MatissJanis
- [#2880](https://github.com/actualbudget/actual/pull/2880) Refactoring desktop-electron package to use typescript — thanks @MikesGlitch
- [#2904](https://github.com/actualbudget/actual/pull/2904) Use react-aria-components's Button as base of the builtin Button component. — thanks @joel-jeremy
- [#2905](https://github.com/actualbudget/actual/pull/2905) Refactor `Select` component to stop using `@reach/listbox` dependency. — thanks @MatissJanis
- [#2913](https://github.com/actualbudget/actual/pull/2913) Use new react-aria-components based Button on settings and rules page. — thanks @joel-jeremy
- [#2914](https://github.com/actualbudget/actual/pull/2914) Use new react-aria-components based Button on accounts and payees page. — thanks @joel-jeremy
- [#2916](https://github.com/actualbudget/actual/pull/2916) Use new react-aria-components based Button on management components. — thanks @joel-jeremy
- [#2918](https://github.com/actualbudget/actual/pull/2918) Use new react-aria-components based Button on modals. — thanks @joel-jeremy
- [#2942](https://github.com/actualbudget/actual/pull/2942) Remove the broken Trafico pull request review triggers. — thanks @twk3
- [#2946](https://github.com/actualbudget/actual/pull/2946) Port finance modals to react-aria-components Modal. — thanks @joel-jeremy
- [#2978](https://github.com/actualbudget/actual/pull/2978) Update Electron menu to use typescript — thanks @MikesGlitch
- [#2995](https://github.com/actualbudget/actual/pull/2995) Update Electron server file to use typescript — thanks @MikesGlitch
- [#3000](https://github.com/actualbudget/actual/pull/3000) Cleanup desktop app filenames to prep for download page — thanks @youngcw
- [#3014](https://github.com/actualbudget/actual/pull/3014) Remove unused files from Electron app — thanks @MikesGlitch
- [#3015](https://github.com/actualbudget/actual/pull/3015) Improve Electron Mac build to target "Universal" for better performance on Apple Silicon — thanks @MikesGlitch
- [#3023](https://github.com/actualbudget/actual/pull/3023) Remove Trafico workflow in favour of our new GitHub bot — thanks @twk3
- [#3026](https://github.com/actualbudget/actual/pull/3026) Migrate BudgetList to Typescript — thanks @tcrasset
- [#3027](https://github.com/actualbudget/actual/pull/3027) Updated Electron window-state file to use typescript — thanks @MikesGlitch
- [#3058](https://github.com/actualbudget/actual/pull/3058) Add pre-commit hook for improved dev-x. — thanks @MatissJanis
- [#3066](https://github.com/actualbudget/actual/pull/3066) Updated security.js and preload.js to Typescript and fixed Theme not setting correctly when set via dev console — thanks @MikesGlitch
- [#3101](https://github.com/actualbudget/actual/pull/3101) Update README with starting fresh and migration guides. — thanks @joel-jeremy
- [#3104](https://github.com/actualbudget/actual/pull/3104) Delete unused user preferences. — thanks @MatissJanis
- [#3105](https://github.com/actualbudget/actual/pull/3105) Upgrade yarn to v4.3.1 — thanks @MatissJanis
- [#3106](https://github.com/actualbudget/actual/pull/3106) Add repository activity image to README and update some information in the README — thanks @MatissJanis
- [#3107](https://github.com/actualbudget/actual/pull/3107) CI workflow for pinging PRs that have been in the "WIP" state for a week without an update. — thanks @MatissJanis
- [#3144](https://github.com/actualbudget/actual/pull/3144) Unit tests: improve the reliability of unique ids. — thanks @MatissJanis

### Actual Server

#### Enhancements

- [#389](https://github.com/actualbudget/actual-server/pull/389) Add Fortuneo GoCardless Integration — thanks @tcrasset
- [#396](https://github.com/actualbudget/actual-server/pull/396) Add easybank GoCardless Integration — thanks @neuos
- [#401](https://github.com/actualbudget/actual-server/pull/401) Added GoCardless Integration for ING (Romania) — thanks @spideraxal

#### Bugfix

- [#385](https://github.com/actualbudget/actual-server/pull/385) Update URL to log into SimpleFIN. — thanks @psybers & @iffy
- [#388](https://github.com/actualbudget/actual-server/pull/388) Remove obsolete "version" from docker compose statement to prevent WARN message to end user. — thanks @wdpk
- [#391](https://github.com/actualbudget/actual-server/pull/391) Add SEB Card Accounts to bank adapter to flip payment and deposit when importing — thanks @craigmdennis
- [#397](https://github.com/actualbudget/actual-server/pull/397) Fix SimpleFIN blank payee introduced in #353 — thanks @duplaja
- [#405](https://github.com/actualbudget/actual-server/pull/405) Modified GoCardless Integration for ING (Romania) so that the `notes` field will be updated once a transaction gets booked. — thanks @spideraxal
- [#406](https://github.com/actualbudget/actual-server/pull/406) Fix date calculation in Nationwide bank handler — thanks @matt-fidd
- [#407](https://github.com/actualbudget/actual-server/pull/407) Fix mBank Retail (Poland) Integration issue. Changed accessValidForDays from 180 to 179. — thanks @vrozaksen

#### Maintenance

- [#353](https://github.com/actualbudget/actual-server/pull/353) Move bank sync payee name normalization from actual to actual-server — thanks @matt-fidd
- [#386](https://github.com/actualbudget/actual-server/pull/386) Prettify GoCardless Integration documentation — thanks @tcrasset
- [#390](https://github.com/actualbudget/actual-server/pull/390) Remove the Trafico GitHub workflow — thanks @twk3
- [#400](https://github.com/actualbudget/actual-server/pull/400) Fix `verify` script which runs `yarn lint` and `yarn types` — thanks @djm2k
- [#402](https://github.com/actualbudget/actual-server/pull/402) Obfuscate password when login the login header — thanks @rodriguestiago0
- [#403](https://github.com/actualbudget/actual-server/pull/403) Upgrade yarn to v4.3.1 — thanks @MatissJanis

## 24.7.0

The release has the following notable improvements:

- Custom reports are officially released
- Splits in rules are officially released
- Tags support for transactions (use `#tags` in notes)
- Transactions: allow merging/un-merging multiple transactions
- Show account notes in sidebar (on hover)

### Actual

#### Features

- [#2554](https://github.com/actualbudget/actual/pull/2554) Removing custom reports from feature flag "experimental" state. — thanks @carkom
- [#2670](https://github.com/actualbudget/actual/pull/2670) Format notes that starts with # as clickable tags. — thanks @joel-jeremy
- [#2789](https://github.com/actualbudget/actual/pull/2789) Release 'Splits in rules' feature — thanks @jfdoming
- [#2805](https://github.com/actualbudget/actual/pull/2805) Make multiple transactions as a split transaction or separate a split transaction into multiple individual ones. — thanks @joel-jeremy
- [#2806](https://github.com/actualbudget/actual/pull/2806) Add Year Spending Comparison Feature — thanks @Crazypkr1099

#### Enhancements

- [#2566](https://github.com/actualbudget/actual/pull/2566) Use `AmountInput` on rules page to get formatting/sign toggle button — thanks @jfdoming
- [#2642](https://github.com/actualbudget/actual/pull/2642) Mobile budget page revamp. — thanks @joel-jeremy
- [#2684](https://github.com/actualbudget/actual/pull/2684) Option to add/remove current interval to "live" ranges — thanks @carkom
- [#2796](https://github.com/actualbudget/actual/pull/2796) Show account notes in tooltip on sidebar. — thanks @psybers
- [#2821](https://github.com/actualbudget/actual/pull/2821) Auto create two child transactions on mobile instead of one when splitting a transactions. — thanks @joel-jeremy
- [#2831](https://github.com/actualbudget/actual/pull/2831) Add loading indicator on mobile transactions list. — thanks @joel-jeremy
- [#2837](https://github.com/actualbudget/actual/pull/2837) Use AmountInput on mobile balance transfer and hold buffer modals to allow auto insertion of decimals in their amounts. — thanks @joel-jeremy
- [#2842](https://github.com/actualbudget/actual/pull/2842) Enhanced autocomplete for languages with accents like Portuguese. Matches search queries regardless of accents. — thanks @lelemm
- [#2847](https://github.com/actualbudget/actual/pull/2847) Add underline to budgeting category — thanks @Crazypkr
- [#2850](https://github.com/actualbudget/actual/pull/2850) Cover over-budgeted action + make balance movement menus only appear on relevant conditions e.g. transfer to another category menu only when there is a leftover balance. — thanks @joel-jeremy
- [#2861](https://github.com/actualbudget/actual/pull/2861) Add autocomplete to include categories underneath the prioritized subcategory — thanks @Crazypkr
- [#2870](https://github.com/actualbudget/actual/pull/2870) Allow resetting SimpleFIN secrets and unify how bank sync secrets are reset. — thanks @psybers
- [#2871](https://github.com/actualbudget/actual/pull/2871) Custom reports - rework "net" numbers to work more intuitively and allow for greater customization — thanks @carkom
- [#2891](https://github.com/actualbudget/actual/pull/2891) Timeout SimpleFIN sync calls after 60 seconds. — thanks @psybers
- [#2896](https://github.com/actualbudget/actual/pull/2896) Respect the user-defined account sort order in all autocomplete lists. — thanks @dymanoid
- [#2899](https://github.com/actualbudget/actual/pull/2899) Bank Sync: update bank-sync button label to "Bank Sync" to improve discoverability for new users — thanks @MatissJanis

#### Bugfix

- [#2785](https://github.com/actualbudget/actual/pull/2785) Hardens "showActivity" elements of custom reports, switched to "inflow/outflow" filters. Fixes issue with weekly show activity clicks not filtering dates correctly. — thanks @carkom
- [#2790](https://github.com/actualbudget/actual/pull/2790) Fix CSV import not matching category is (nothing) rules — thanks @matt-fidd
- [#2799](https://github.com/actualbudget/actual/pull/2799) Fix amount parsing with 6-9 decimal places — thanks @sreetamdas
- [#2812](https://github.com/actualbudget/actual/pull/2812) Fix amounts over 1 million cutting off. — thanks @psybers
- [#2817](https://github.com/actualbudget/actual/pull/2817) Fixes nynab import issue where you couldn't import a category group called 'Income' — thanks @Marethyu1
- [#2825](https://github.com/actualbudget/actual/pull/2825) Enable compress to avoid minified scripts from throwing SyntaxError in safari16 — thanks @chinalichen
- [#2836](https://github.com/actualbudget/actual/pull/2836) Fix null bank_id for SimpleFIN caused when no org domain is sent. — thanks @duplaja
- [#2838](https://github.com/actualbudget/actual/pull/2838) Don't show account tooltips during VRT. — thanks @psybers
- [#2840](https://github.com/actualbudget/actual/pull/2840) Filters off budget items out of the spending report. — thanks @carkom
- [#2848](https://github.com/actualbudget/actual/pull/2848) Remove recursion from topological sort to prevent stack overflow — thanks @lelemm
- [#2862](https://github.com/actualbudget/actual/pull/2862) For Report Budget, income categories were incorrectly showing as negative when using 'Set budgets to 3 month average'. — thanks @lelemm
- [#2863](https://github.com/actualbudget/actual/pull/2863) Remove negative margins from `<ScheduleLink>` so it does not exceed container — thanks @aaimio
- [#2864](https://github.com/actualbudget/actual/pull/2864) Fix an issue where selected scheduled transactions did not have a correct background colour — thanks @aaimio
- [#2866](https://github.com/actualbudget/actual/pull/2866) Fix: Account names in side nav squashed — thanks @lelemm
- [#2867](https://github.com/actualbudget/actual/pull/2867) Fix: column titles incorrect when resizing window — thanks @lelemm
- [#2875](https://github.com/actualbudget/actual/pull/2875) Fix mobile budgeted and spent column auto sizing on smaller screens. — thanks @joel-jeremy
- [#2878](https://github.com/actualbudget/actual/pull/2878) Fixes a regression that broke the menus for the individual custom report cards. — thanks @carkom
- [#2881](https://github.com/actualbudget/actual/pull/2881) Fix console error due to ; in style paddingBottom. — thanks @Crazypkr1099
- [#2887](https://github.com/actualbudget/actual/pull/2887) Fix budget tooltip showing on hover if the panel is not collapsed (the tooltip should show only if panel is collapsed). — thanks @MatissJanis
- [#2890](https://github.com/actualbudget/actual/pull/2890) Revert scheduled transaction date filter causing weekly scheduled transactions stuck as Paid. — thanks @joel-jeremy
- [#2925](https://github.com/actualbudget/actual/pull/2925) Fixes "Export data" not saving the file in Electron app on Linux — thanks @MikesGlitch
- [#2927](https://github.com/actualbudget/actual/pull/2927) Fix wording of split rule. — thanks @psybers
- [#2929](https://github.com/actualbudget/actual/pull/2929) Fixes regex filtering on the desktop app — thanks @MikesGlitch
- [#2940](https://github.com/actualbudget/actual/pull/2940) Fix mobile budget coloring to show template colors — thanks @youngcw
- [#2941](https://github.com/actualbudget/actual/pull/2941) Fix: Transaction table constantly resizing — thanks @lelemm

#### Maintenance

- [#2771](https://github.com/actualbudget/actual/pull/2771) Migrating native `Tooltip` component to react-aria Tooltip/Popover (vol.6) — thanks @MatissJanis
- [#2822](https://github.com/actualbudget/actual/pull/2822) Migrating native `Tooltip` component to react-aria Tooltip/Popover (vol.8) — thanks @MatissJanis
- [#2826](https://github.com/actualbudget/actual/pull/2826) Migrating native `Tooltip` component to react-aria Tooltip/Popover (vol.9) — thanks @MatissJanis
- [#2853](https://github.com/actualbudget/actual/pull/2853) api: release 6.8.1 — thanks @MatissJanis
- [#2895](https://github.com/actualbudget/actual/pull/2895) Switch to using a Trafico GitHub action to restore review management. — thanks @twk3

### Actual Server

#### Enhancements

- [#359](https://github.com/actualbudget/actual-server/pull/359) Get creditorName and debtorName from remittanceInformationStructured for ABANCA_CAGLESMM — thanks @daca11
- [#360](https://github.com/actualbudget/actual-server/pull/360) Add bank handler for VIRGIN_NRNBGB22 (Virgin Money) for more accurate payees — thanks @matt-fidd
- [#372](https://github.com/actualbudget/actual-server/pull/372) Add bank handler for NATIONWIDE_NAIAGB21 (Nationwide) for more accurate dates and to fix duplicate transaction issues — thanks @matt-fidd
- [#375](https://github.com/actualbudget/actual-server/pull/375) Properly handle errors for SimpleFIN. — thanks @psybers

#### Bugfix

- [#370](https://github.com/actualbudget/actual-server/pull/370) Fix failing GoCardless syncs with a bnp-be-gebabebb account. — thanks @vojeroen

#### Maintenance

- [#362](https://github.com/actualbudget/actual-server/pull/362) Refactor GoCardless bank code to avoid duplication. — thanks @psybers
- [#366](https://github.com/actualbudget/actual-server/pull/366) Ignore coverage folder in the coverage report. — thanks @psybers
- [#367](https://github.com/actualbudget/actual-server/pull/367) Add GoCardless banks to the bank factory test suite. — thanks @psybers
- [#376](https://github.com/actualbudget/actual-server/pull/376) Add Github action for stale PRs. — thanks @MatissJanis
- [#378](https://github.com/actualbudget/actual-server/pull/378) Security: upgrade dependency tree to solve CVE-2023-42282. — thanks @MatissJanis
- [#380](https://github.com/actualbudget/actual-server/pull/380) Switch to using a Trafico GitHub action to restore review management. — thanks @twk3

## 24.6.0

The release has the following notable improvements:

- API: ability to run 3rd party bank-sync (GoCardless, SimpleFin) programmatically
- API: methods for working with rules
- Add option to authenticate with HTTP header - `X-ACTUAL-PASSWORD`
- Add option to import CAMT.053 based XML files
- (Experimental) monthly spending report - please report feedback [here](https://github.com/actualbudget/actual/issues/2820)

### Actual

#### Features

- [#2622](https://github.com/actualbudget/actual/pull/2622) Add a new monthly spending report to track MTD spending compared to previous months. — thanks @carkom
- [#2683](https://github.com/actualbudget/actual/pull/2683) API: ability to run 3rd party bank-sync (GoCardless, SimpleFin) programmatically using `@actual-app/api`. — thanks @MatissJanis
- [#2706](https://github.com/actualbudget/actual/pull/2706) Add option to import CAMT.053 based XML files — thanks @bfritscher

#### Enhancements

- [#2362](https://github.com/actualbudget/actual/pull/2362) Add option to authenticate with HTTP header `X-ACTUAL-PASSWORD` — thanks @joewashear007
- [#2507](https://github.com/actualbudget/actual/pull/2507) Quickly switch to another budget file from the mobile budget page. — thanks @joel-jeremy
- [#2568](https://github.com/actualbudget/actual/pull/2568) Add API for working with rules. — thanks @psybers
- [#2652](https://github.com/actualbudget/actual/pull/2652) Template only the relevant amount in a split-schedule category — thanks @jfdoming
- [#2664](https://github.com/actualbudget/actual/pull/2664) Add schedule name and date to mobile scheduled transaction modal. — thanks @joel-jeremy
- [#2672](https://github.com/actualbudget/actual/pull/2672) Comma and period decimal separator can both be used for number format not using those as thousand separator. — thanks @Wizmaster
- [#2677](https://github.com/actualbudget/actual/pull/2677) Fixing small visual issues with custom reports. — thanks @carkom
- [#2696](https://github.com/actualbudget/actual/pull/2696) Custom Reports - show transactions when table cell is clicked. — thanks @carkom
- [#2700](https://github.com/actualbudget/actual/pull/2700) Fetch cloud file and file info in parallel to speed downloads up — thanks @joel-jeremy
- [#2713](https://github.com/actualbudget/actual/pull/2713) Use budget name as export file name. — thanks @joel-jeremy
- [#2714](https://github.com/actualbudget/actual/pull/2714) revise modal margin — thanks @uniqueeest
- [#2719](https://github.com/actualbudget/actual/pull/2719) Alphabetize the filter list in the dropdown — thanks @dangrous
- [#2730](https://github.com/actualbudget/actual/pull/2730) Smoother budget load/download loading text — thanks @joel-jeremy
- [#2733](https://github.com/actualbudget/actual/pull/2733) Add page headers to various report pages + refactor Page component — thanks @joel-jeremy
- [#2746](https://github.com/actualbudget/actual/pull/2746) Auto insert decimals to mobile split transaction amounts. — thanks @joel-jeremy
- [#2753](https://github.com/actualbudget/actual/pull/2753) Require account in mobile transaction entry + confirm transaction delete. — thanks @joel-jeremy
- [#2786](https://github.com/actualbudget/actual/pull/2786) Match on `amount` when creating a rule from a transaction — thanks @jfdoming
- [#2795](https://github.com/actualbudget/actual/pull/2795) Sort accounts and show their balance in the bank sync modal. — thanks @psybers
- [#2797](https://github.com/actualbudget/actual/pull/2797) Make picking budget months easier to see. — thanks @psybers

#### Bugfix

- [#2643](https://github.com/actualbudget/actual/pull/2643) Fix amount filter to include both incoming and outgoing amounts. — thanks @mirdaki
- [#2648](https://github.com/actualbudget/actual/pull/2648) Don't update transaction date when importing manually — thanks @Wizmaster
- [#2698](https://github.com/actualbudget/actual/pull/2698) Fix API remote-server sync for budget files that are e2e encrypted. — thanks @MatissJanis
- [#2712](https://github.com/actualbudget/actual/pull/2712) Fix preview transactions not detecting schedule as paid when a child transaction is linked. — thanks @joel-jeremy
- [#2725](https://github.com/actualbudget/actual/pull/2725) Do not show loading indicator in net worth report if the budget file is empty — thanks @MatissJanis
- [#2745](https://github.com/actualbudget/actual/pull/2745) Fixes a NaN error in spending report. — thanks @carkom
- [#2754](https://github.com/actualbudget/actual/pull/2754) Do not remember last entered category in mobile transaction entry. — thanks @joel-jeremy
- [#2765](https://github.com/actualbudget/actual/pull/2765) Do not use underlines for emphasis. — thanks @psybers
- [#2768](https://github.com/actualbudget/actual/pull/2768) Creating a callback for the table totals to fix a bug that created duplicate columns while rendering. — thanks @carkom
- [#2769](https://github.com/actualbudget/actual/pull/2769) Updating date range element to catch any incorrectly formated dates. Current state crashes app when dates are invalid. — thanks @carkom
- [#2773](https://github.com/actualbudget/actual/pull/2773) Fix notes icon changing size/position with long category or group names. — thanks @jpelgrom
- [#2774](https://github.com/actualbudget/actual/pull/2774) Move the rollover arrow into view. — thanks @Tigatok
- [#2775](https://github.com/actualbudget/actual/pull/2775) Adds income on left and expense on right always. Hide bar if value is 0. — thanks @Tigatok
- [#2777](https://github.com/actualbudget/actual/pull/2777) On the accounts page - filter balance only adds up transactions that are showing. If your filter has more than one page it won't be added to the balance unless you scroll to the bottom and reveal all transactions. This fixes that. — thanks @carkom
- [#2788](https://github.com/actualbudget/actual/pull/2788) Allow creating a new off-budget account in bank sync modal. — thanks @psybers
- [#2803](https://github.com/actualbudget/actual/pull/2803) Revert amount filter change — thanks @youngcw
- [#2809](https://github.com/actualbudget/actual/pull/2809) Fixes a crashing bug that happens when the current day of the month is greater than 28. — thanks @carkom

#### Maintenance

- [#2559](https://github.com/actualbudget/actual/pull/2559) API: Publish TypeScript types in the package. — thanks @turt2live
- [#2631](https://github.com/actualbudget/actual/pull/2631) Migrating native `Tooltip` component to react-aria Tooltip/Popover (vol.3) — thanks @MatissJanis
- [#2676](https://github.com/actualbudget/actual/pull/2676) Fix some type errors found by the API packaging — thanks @twk3
- [#2707](https://github.com/actualbudget/actual/pull/2707) Custom reports: convert final jsx files to typescript. — thanks @carkom
- [#2715](https://github.com/actualbudget/actual/pull/2715) Desktop: remove code signing for Mac version — thanks @MatissJanis
- [#2716](https://github.com/actualbudget/actual/pull/2716) Create types for the external versions of entities meant for the API` — thanks @twk3
- [#2724](https://github.com/actualbudget/actual/pull/2724) Migrating native `Tooltip` component to react-aria Tooltip/Popover (vol.4) — thanks @MatissJanis
- [#2726](https://github.com/actualbudget/actual/pull/2726) Making files in custom reports to comply with TS strict - stage #1. — thanks @carkom
- [#2727](https://github.com/actualbudget/actual/pull/2727) Making files in custom reports to comply with TS strict - stage #2 — thanks @carkom
- [#2728](https://github.com/actualbudget/actual/pull/2728) Making files in custom reports to comply with TS strict - stage #3. — thanks @carkom
- [#2729](https://github.com/actualbudget/actual/pull/2729) Change filters icon. This is for consistency throughout the app. — thanks @carkom
- [#2738](https://github.com/actualbudget/actual/pull/2738) Include crdt as a dependency in the API to include its types — thanks @twk3
- [#2750](https://github.com/actualbudget/actual/pull/2750) Add Github workflow to publish release to demo.actualbudget.org. — thanks @shall0pass
- [#2762](https://github.com/actualbudget/actual/pull/2762) Add run-vrt script to run VRT inside docker via yarn. — thanks @joel-jeremy
- [#2763](https://github.com/actualbudget/actual/pull/2763) Update Electron to the latest version (31.0.6) — thanks @MikesGlitch
- [#2766](https://github.com/actualbudget/actual/pull/2766) Migrating recurring schedule `Tooltip` component to react-aria Tooltip/Popover (vol.5) — thanks @MatissJanis
- [#2778](https://github.com/actualbudget/actual/pull/2778) Migrating native `Tooltip` component to react-aria Tooltip/Popover (vol.7) — thanks @MatissJanis

### Actual Server

#### Enhancements

- [#312](https://github.com/actualbudget/actual-server/pull/312) Add option to authenticate with HTTP header from Auth Proxy. — thanks @joewashear007
- [#346](https://github.com/actualbudget/actual-server/pull/346) Add gocardless support for Sparkasse Karlsruhe (Germany) — thanks @Nebukadneza
- [#349](https://github.com/actualbudget/actual-server/pull/349) Ensure payee names don't contain transactional information when pulling in transactions from BNP bank with GoCardless. — thanks @vojeroen
- [#350](https://github.com/actualbudget/actual-server/pull/350) Extended bank adapter for SEB to support SEB_KORT_AB_NO_SKHSFI21 — thanks @jakoblover
- [#355](https://github.com/actualbudget/actual-server/pull/355) Add BANKS_WITH_LIMITED_HISTORY constant and Implement BANKINTER_BKBKESMM Bank Adapter — thanks @hostyn

#### Maintenance

- [#357](https://github.com/actualbudget/actual-server/pull/357) Update better-sqlite3 to 9.6.0 — thanks @MikesGlitch

## 24.5.0

The release has the following notable improvements:

- Ability to show/hide reconciled transactions
- Ability to prepend/append notes when bulk editing transactions
- Show remaining balance in the category autocomplete
- OFX, CSV import: ability to disable transaction de-duplication logic
- Mobile: account management functionality
- Mobile: clicking on category allows to see transactions list for the clicked category
- Desktop app release
- (Experimental) custom report improvements - please report your feedback [here](https://github.com/actualbudget/actual/issues/1918)

### Actual

Version: v24.5.0

#### Features

- [#2468](https://github.com/actualbudget/actual/pull/2468) Add options to prepend or append text to a transaction note using the bulk edit dialog. — thanks @shall0pass
- [#2531](https://github.com/actualbudget/actual/pull/2531) Drill down category transactions by clicking on spent amount in mobile budget page. — thanks @joel-jeremy
- [#2542](https://github.com/actualbudget/actual/pull/2542) Adding menu item to show/hide reconciled transactions in the account view. — thanks @davidkus
- [#2551](https://github.com/actualbudget/actual/pull/2551) Display category balances in category autocomplete. — thanks @joel-jeremy & @MatissJanis
- [#2560](https://github.com/actualbudget/actual/pull/2560) Show sync indicator in account header. — thanks @psybers
- [#2564](https://github.com/actualbudget/actual/pull/2564) Add options to disable reconciliation when importing OFX files. — thanks @keriati
- [#2585](https://github.com/actualbudget/actual/pull/2585) Add checkbox to disable reconciliation when importing CSV files. — thanks @keriati
- [#2610](https://github.com/actualbudget/actual/pull/2610) Add month notes and budget/template action menus for mobile. — thanks @joel-jeremy
- [#2611](https://github.com/actualbudget/actual/pull/2611) Collapsible budget groups in mobile. — thanks @joel-jeremy

#### Enhancements

- [#2466](https://github.com/actualbudget/actual/pull/2466) Enable "yearly" interval to custom reports. Also sets-up groundwork for adding weekly/daily in the near future — thanks @carkom
- [#2472](https://github.com/actualbudget/actual/pull/2472) Add more modals in mobile for account, scheduled transactions, budget summary, and balance actions. — thanks @joel-jeremy
- [#2480](https://github.com/actualbudget/actual/pull/2480) Add category groups to end of month cleanup templates. — thanks @shall0pass
- [#2483](https://github.com/actualbudget/actual/pull/2483) Add daily and weekly to custom reports interval list. — thanks @carkom
- [#2491](https://github.com/actualbudget/actual/pull/2491) Add + button to add a group on mobile budget page and a budget related menu. — thanks @joel-jeremy
- [#2501](https://github.com/actualbudget/actual/pull/2501) Mobile budget menu modal to set budget amounts. — thanks @joel-jeremy
- [#2506](https://github.com/actualbudget/actual/pull/2506) Add line chart option for displaying budget amounts over time — thanks @qedi-r
- [#2518](https://github.com/actualbudget/actual/pull/2518) Bump GoCardless access validity from 30 to 90 days. — thanks @kyrias
- [#2521](https://github.com/actualbudget/actual/pull/2521) A simple delete confirmation for custom reports. — thanks @carkom
- [#2522](https://github.com/actualbudget/actual/pull/2522) Custom reports so transactions activity on accounts page for graphs when clicked. — thanks @carkom
- [#2523](https://github.com/actualbudget/actual/pull/2523) Using any math operator on an input will begin a calculation starting with the existing value. — thanks @JazzyJosh
- [#2536](https://github.com/actualbudget/actual/pull/2536) When adding a mobile view transaction, format the edit field according to the currency and add an automatic/fixed position decimal when applicable. — thanks @ilar
- [#2544](https://github.com/actualbudget/actual/pull/2544) Change default theme from light to the system's default theme — thanks @adam-rozen
- [#2569](https://github.com/actualbudget/actual/pull/2569) Support creating rules from split transactions on the accounts page — thanks @jfdoming
- [#2582](https://github.com/actualbudget/actual/pull/2582) Dim categories in the budget view if hidden by their category group. — thanks @psybers
- [#2583](https://github.com/actualbudget/actual/pull/2583) Enables the ability to show transactions when donut graph is clicked. — thanks @carkom
- [#2598](https://github.com/actualbudget/actual/pull/2598) Update balance menu modal title and add balance amount in the modal. — thanks @joel-jeremy
- [#2601](https://github.com/actualbudget/actual/pull/2601) Improved fatal-error handling in case backend failed loading: show error message. — thanks @MatissJanis
- [#2606](https://github.com/actualbudget/actual/pull/2606) Enables the ability to show transactions when StackedBarGraph is clicked. — thanks @carkom
- [#2607](https://github.com/actualbudget/actual/pull/2607) Use decimal input mode for transfer and hold buffer modal inputs. — thanks @joel-jeremy
- [#2608](https://github.com/actualbudget/actual/pull/2608) Allow posting/skipping scheduled transactions in mobile view. — thanks @joel-jeremy
- [#2612](https://github.com/actualbudget/actual/pull/2612) Fixing some of the sessionStorage issues plus adding filters to sessionStorage. — thanks @carkom
- [#2613](https://github.com/actualbudget/actual/pull/2613) Honor the budget.startMonth pref to open the last month the user was working on before closing the app. — thanks @joel-jeremy
- [#2617](https://github.com/actualbudget/actual/pull/2617) Include flatpak in the electron build list — thanks @youngcw
- [#2624](https://github.com/actualbudget/actual/pull/2624) Add mobile reports page. — thanks @carkom
- [#2627](https://github.com/actualbudget/actual/pull/2627) Mobile - make labels sentence case and update budget and balance modals with Budget and Balance labels respectively. — thanks @joel-jeremy
- [#2628](https://github.com/actualbudget/actual/pull/2628) Add negative/positive colors to mobile transaction amount input — thanks @joel-jeremy
- [#2632](https://github.com/actualbudget/actual/pull/2632) Add desktop apps to the release assets — thanks @youngcw
- [#2636](https://github.com/actualbudget/actual/pull/2636) Enables the ability to show transactions when LineGraph is clicked. Also adds missing formatting to lineGraph. — thanks @carkom
- [#2637](https://github.com/actualbudget/actual/pull/2637) Fixing typescript issues with firstDayOfWeek. Also fixes bug with TableGraph report card. — thanks @carkom
- [#2639](https://github.com/actualbudget/actual/pull/2639) Added app-loading stage description texts; also added exponential backoff in case a lazy-loaded module fails loading — thanks @MatissJanis
- [#2651](https://github.com/actualbudget/actual/pull/2651) Make the 'Apply to all' section (formerly known as 'Before split') of rule splits more intuitive — thanks @jfdoming
- [#2653](https://github.com/actualbudget/actual/pull/2653) Ignore transactions with empty date & amount — thanks @kyangk
- [#2657](https://github.com/actualbudget/actual/pull/2657) Add custom error message if lazy-loading a module fails. — thanks @MatissJanis
- [#2665](https://github.com/actualbudget/actual/pull/2665) Add amount colors to mobile accounts and transaction list. — thanks @joel-jeremy
- [#2667](https://github.com/actualbudget/actual/pull/2667) Check schedule name when using the check templates function — thanks @youngcw
- [#2671](https://github.com/actualbudget/actual/pull/2671) Hide theme selector from the top of the page - it is now only available in the settings page. — thanks @MatissJanis
- [#2688](https://github.com/actualbudget/actual/pull/2688) Goals: Add template to budget X months average spending. Matches the function of the existing budget page button. — thanks @youngcw
- [#2689](https://github.com/actualbudget/actual/pull/2689) Goals: Enable decimals for percentage templates. — thanks @shall0pass

#### Bugfix

- [#2502](https://github.com/actualbudget/actual/pull/2502) Fix reconciling split translations from nYNAB import creates orphan transfers — thanks @Wizmaster
- [#2535](https://github.com/actualbudget/actual/pull/2535) Goal templates: Allow budgeting to a full category balance when using 'up to' and a negative category rollover balance. — thanks @shall0pass
- [#2538](https://github.com/actualbudget/actual/pull/2538) Improve contrast in Payee autocomplete's "Create payee" and Category autocomplete's "Split transaction" buttons — thanks @Jenna59
- [#2543](https://github.com/actualbudget/actual/pull/2543) When importing reconciled split transaction, the resulting sub-transactions is also marked as reconciled. — thanks @davidkus
- [#2553](https://github.com/actualbudget/actual/pull/2553) This fixes a regression that broke toggle menu items. — thanks @carkom
- [#2556](https://github.com/actualbudget/actual/pull/2556) Custom Reports: Fix bug where month endDate is saving as a non-date variable. — thanks @carkom
- [#2557](https://github.com/actualbudget/actual/pull/2557) Fixes live date range not updating with new month (interval). — thanks @carkom
- [#2570](https://github.com/actualbudget/actual/pull/2570) Mobile: Remove menu item for income category group, which resulted in crash. — thanks @shall0pass
- [#2572](https://github.com/actualbudget/actual/pull/2572) Close modal after transferring / covering balance in mobile budget page — thanks @joel-jeremy
- [#2573](https://github.com/actualbudget/actual/pull/2573) Fix mobile report budget bug where you can't click on an income category's budgeted input. — thanks @joel-jeremy
- [#2577](https://github.com/actualbudget/actual/pull/2577) Use desktop colors for mobile autocomplete modals. — thanks @joel-jeremy
- [#2580](https://github.com/actualbudget/actual/pull/2580) Fix "Load backup" functionality in Electron - no longer throwing fatal error — thanks @mikesglitch
- [#2581](https://github.com/actualbudget/actual/pull/2581) Do not allow hiding the income category group. — thanks @psybers
- [#2588](https://github.com/actualbudget/actual/pull/2588) Allow 5 decimal places in csv files without matching on 3 or 4 — thanks @youngcw
- [#2589](https://github.com/actualbudget/actual/pull/2589) Force transaction cleared checkboxes to show on reconcile view — thanks @matt-fidd
- [#2594](https://github.com/actualbudget/actual/pull/2594) Hide Y axis values of net worth graph when privacy mode is enabled. — thanks @ttlgeek
- [#2597](https://github.com/actualbudget/actual/pull/2597) Stop cash flow card labels from getting cutting off if bar height is too low — thanks @ttlgeek
- [#2599](https://github.com/actualbudget/actual/pull/2599) Fix account notes not retrieving correctly in mobile. — thanks @joel-jeremy
- [#2614](https://github.com/actualbudget/actual/pull/2614) Fix notes tooltip content going out of bounds. — thanks @MatissJanis
- [#2633](https://github.com/actualbudget/actual/pull/2633) Fix encryption modals for mobile. — thanks @joel-jeremy
- [#2635](https://github.com/actualbudget/actual/pull/2635) Add To Be Budgeted category to cover and transfer modal — thanks @joel-jeremy
- [#2638](https://github.com/actualbudget/actual/pull/2638) Fix low contrast accent colors in dark and midnight themes — thanks @matt-fidd
- [#2641](https://github.com/actualbudget/actual/pull/2641) Make /login show descriptive error when an incorrect password is submitted — thanks @mattfidd
- [#2649](https://github.com/actualbudget/actual/pull/2649) Do not show "delete remote file" option for local budget files. — thanks @MatissJanis
- [#2650](https://github.com/actualbudget/actual/pull/2650) Fix scroll bars always showing on tooltips — thanks @youngcw
- [#2663](https://github.com/actualbudget/actual/pull/2663) Fix app loading screen not showing when opening a budget file. — thanks @joel-jeremy
- [#2690](https://github.com/actualbudget/actual/pull/2690) Fix mobile notes modal not retrieving correct notes — thanks @joel-jeremy
- [#2692](https://github.com/actualbudget/actual/pull/2692) Fix budget list / management app flashing on page init. — thanks @joel-jeremy

#### Maintenance

- [#2493](https://github.com/actualbudget/actual/pull/2493) Refactor `Tooltip` component for notes button - use react-aria component. — thanks @MatissJanis
- [#2509](https://github.com/actualbudget/actual/pull/2509) Uninstall react-merge-refs package and replace mergeRefs with useMergedRefs hook. — thanks @joel-jeremy
- [#2511](https://github.com/actualbudget/actual/pull/2511) Split menu components to separate files for reusability. — thanks @joel-jeremy
- [#2534](https://github.com/actualbudget/actual/pull/2534) Removing code duplication in bank-sync logic — thanks @MatissJanis
- [#2548](https://github.com/actualbudget/actual/pull/2548) Update the github issues template — thanks @MatissJanis
- [#2555](https://github.com/actualbudget/actual/pull/2555) Update TransactionEdit component onEdit function to use serialized transactions. — thanks @joel-jeremy
- [#2558](https://github.com/actualbudget/actual/pull/2558) Consolidates AnchorLink, ButtonLink and LinkButton to use existing props (Link and Button - with type). — thanks @carkom
- [#2567](https://github.com/actualbudget/actual/pull/2567) Improve API output types. — thanks @twk3
- [#2571](https://github.com/actualbudget/actual/pull/2571) Use consistent padding in modals — thanks @joel-jeremy
- [#2586](https://github.com/actualbudget/actual/pull/2586) Remove left behind editableTitle prop. — thanks @joel-jeremy
- [#2593](https://github.com/actualbudget/actual/pull/2593) Migrating native `Tooltip` component to react-aria Tooltip/Popover (vol.2) — thanks @MatissJanis
- [#2604](https://github.com/actualbudget/actual/pull/2604) Adds integration test for experimental split rules functionality — thanks @marethyu1
- [#2609](https://github.com/actualbudget/actual/pull/2609) Add key prop to all modals. — thanks @joel-jeremy
- [#2616](https://github.com/actualbudget/actual/pull/2616) Delete old Plaid integration that is no longer working. — thanks @MatissJanis
- [#2619](https://github.com/actualbudget/actual/pull/2619) Add midnight theme VRT screenshots. — thanks @joel-jeremy
- [#2620](https://github.com/actualbudget/actual/pull/2620) Rename electron master workflow to be different than the electron pr workflow — thanks @youngcw
- [#2623](https://github.com/actualbudget/actual/pull/2623) Organize .gitignore and remove duplicated lines — thanks @adam-rozen
- [#2634](https://github.com/actualbudget/actual/pull/2634) Fix slow VRT test - reduced number of iterations to speed up test — thanks @joel-jeremy
- [#2658](https://github.com/actualbudget/actual/pull/2658) Fix electron builds on OSX — thanks @twk3
- [#2659](https://github.com/actualbudget/actual/pull/2659) Some slight adjustments to tidy up the code and make it work better. Some TS updates as well. — thanks @carkom

### Actual Server

Version: v24.5.0

#### Enhancements

- [#333](https://github.com/actualbudget/actual-server/pull/333) Add ACTUAL_PORT environment variable to docker-compose.yml — thanks @psybers
- [#334](https://github.com/actualbudget/actual-server/pull/334) Add support for setting the access validity time per GoCardless bank integration and get the max historical days from the API — thanks @kyrias

#### Bugfix

- [#341](https://github.com/actualbudget/actual-server/pull/341) Make running app.js cwd agnostic and extend config options to allow changing dataDir — thanks @matt-fidd
- [#342](https://github.com/actualbudget/actual-server/pull/342) Make /admin/login return a descriptive error when no password is provided — thanks @matt-fidd
- [#345](https://github.com/actualbudget/actual-server/pull/345) Add backup date field for GoCardless transactions with bank BNP_BE_GEBABEBB — thanks @matt-fidd

#### Maintenance

- [#343](https://github.com/actualbudget/actual-server/pull/343) Refactor to add strict type comparisons and remove unnecessary else blocks — thanks @matt-fidd

## 24.4.0

The release has the following notable improvements:

- Stability improvements and various edge-case bug fixes
- (Experimental) custom report improvements - please report your feedback [here](https://github.com/actualbudget/actual/issues/1918)

### Actual

Version: v24.4.0

#### Features

- [#2398](https://github.com/actualbudget/actual/pull/2398) Add option to make a transfer from two selected transactions. — thanks @twk3

#### Enhancements

- [#2408](https://github.com/actualbudget/actual/pull/2408) Updating the way the "budget" page links to the "accounts" page when clicking on the "spent" column items to use the filters functionality — thanks @carkom
- [#2410](https://github.com/actualbudget/actual/pull/2410) Create a list where disabled items can be easily managed for custom reports. — thanks @carkom
- [#2416](https://github.com/actualbudget/actual/pull/2416) Bank sync quality of life improvements: show "pending" status on accounts, progressively import new transactions instead of waiting for all account sync to finish before adding them to the ledger. — thanks @MatissJanis
- [#2429](https://github.com/actualbudget/actual/pull/2429) Hide hidden categories on the Category AutoComplete. Allow a prop for showing (with indication). — thanks @Shazib & @carkom
- [#2441](https://github.com/actualbudget/actual/pull/2441) Show a modal to confirm unlinking accounts. — thanks @psybers
- [#2446](https://github.com/actualbudget/actual/pull/2446) Provide "api/category-groups-get" API endpoint — thanks @psybers
- [#2476](https://github.com/actualbudget/actual/pull/2476) Show account sync indicators when viewing accounts on mobile. — thanks @psybers
- [#2505](https://github.com/actualbudget/actual/pull/2505) Change custom reports overview cards to use live data. Also, stops saving data query in saved report db table. — thanks @carkom
- [#2526](https://github.com/actualbudget/actual/pull/2526) Adding new icon to better match the area graph type — thanks @carkom

#### Bugfix

- [#2404](https://github.com/actualbudget/actual/pull/2404) [Goals] If no sinking funds are used, apply existing category balance to simple schedules to 'top off' the category. — thanks @shall0pass
- [#2409](https://github.com/actualbudget/actual/pull/2409) End of month cleanup - revert logic introduced in 2295. Ignore rollover categories. — thanks @shall0pass
- [#2419](https://github.com/actualbudget/actual/pull/2419) Implemented a "pill gesture" icon on navigation bar for better mobile UX — thanks @CampaniaGuy
- [#2421](https://github.com/actualbudget/actual/pull/2421) Fix OFX import amount when more than 2 decimal places are provided — thanks @keriati
- [#2422](https://github.com/actualbudget/actual/pull/2422) Fix colors for the budget name and category name in the accounts view on mobile. — thanks @shall0pass
- [#2434](https://github.com/actualbudget/actual/pull/2434) Fix flaky transfer e2e test. — thanks @twk3
- [#2447](https://github.com/actualbudget/actual/pull/2447) Show scheduled transactions when viewing "All accounts" — thanks @psybers
- [#2452](https://github.com/actualbudget/actual/pull/2452) Fix budget key tab navigation. — thanks @twk3
- [#2455](https://github.com/actualbudget/actual/pull/2455) Import reconciled transactions from ynab4 — thanks @youngcw
- [#2460](https://github.com/actualbudget/actual/pull/2460) Fix background color on bulk edit dialogs in Midnight theme. — thanks @shall0pass
- [#2461](https://github.com/actualbudget/actual/pull/2461) Fix midnight theme autocomplete hover color. — thanks @joel-jeremy
- [#2462](https://github.com/actualbudget/actual/pull/2462) Fix header column overlap when cleared is selected. — thanks @dangrous
- [#2464](https://github.com/actualbudget/actual/pull/2464) Fix csv/ofx import sometimes importing duplicate transactions — thanks @MatissJanis
- [#2474](https://github.com/actualbudget/actual/pull/2474) Import reconciled transactions from nYNAB — thanks @Wizmaster
- [#2475](https://github.com/actualbudget/actual/pull/2475) Fix error when viewing uncategorized transactions when there are upcoming scheduled transactions. — thanks @psybers
- [#2485](https://github.com/actualbudget/actual/pull/2485) Do not include off-budget transfers in the expenses calculation for cash-flow card (align it with the cash-flow reports page). — thanks @MatissJanis
- [#2487](https://github.com/actualbudget/actual/pull/2487) Fix mobile accounts page pull to refresh functionality — thanks @joel-jeremy
- [#2489](https://github.com/actualbudget/actual/pull/2489) Fix hotkeys sometimes stopping to work. — thanks @MatissJanis
- [#2492](https://github.com/actualbudget/actual/pull/2492) Error catch for reports overview page. — thanks @carkom
- [#2494](https://github.com/actualbudget/actual/pull/2494) Fix: disallow importing with invalid transaction amounts (that would result in the app crashing without a way to recover). — thanks @MatissJanis
- [#2504](https://github.com/actualbudget/actual/pull/2504) Fix mobile account transactions page not loading more transactions when reaching end of page. — thanks @joel-jeremy
- [#2528](https://github.com/actualbudget/actual/pull/2528) Fix custom report page cold-reload crash. — thanks @qedi-r
- [#2530](https://github.com/actualbudget/actual/pull/2530) Fix mobile autocomplete colors. — thanks @joel-jeremy

#### Maintenance

- [#2381](https://github.com/actualbudget/actual/pull/2381) Update Input onChangeValue and onUpdate prop naming for consistency. — thanks @joel-jeremy
- [#2388](https://github.com/actualbudget/actual/pull/2388) Update shared transaction module to strict typescript. — thanks @twk3
- [#2403](https://github.com/actualbudget/actual/pull/2403) Move some TypeScript files to strict mode — thanks @MatissJanis
- [#2417](https://github.com/actualbudget/actual/pull/2417) Delete experimental sankey feature - development abandoned. — thanks @MatissJanis
- [#2425](https://github.com/actualbudget/actual/pull/2425) Reorganize mobile components. — thanks @joel-jeremy
- [#2443](https://github.com/actualbudget/actual/pull/2443) Add WIP to new pull request titles — thanks @carkom & @twk3
- [#2453](https://github.com/actualbudget/actual/pull/2453) Enabled strict TypeScript in rollover budget components. — thanks @MatissJanis
- [#2459](https://github.com/actualbudget/actual/pull/2459) Convert BudgetTable component to a functional component. — thanks @joel-jeremy
- [#2479](https://github.com/actualbudget/actual/pull/2479) Changing custom reports variable naming from "months" to "interval" so it's less confusing when adding new intervals — thanks @carkom
- [#2481](https://github.com/actualbudget/actual/pull/2481) Convert most common components to strict TypeScript — thanks @MatissJanis
- [#2500](https://github.com/actualbudget/actual/pull/2500) Autocomplete changes related to mobile modals. — thanks @joel-jeremy
- [#2529](https://github.com/actualbudget/actual/pull/2529) Adding extra `console.log` lines to the bank-sync operation to improve troubleshooting — thanks @MatissJanis

### Actual Server

Version: v24.4.0

#### Features

- [#316](https://github.com/actualbudget/actual-server/pull/316) Add SEB Private Bank integration to gocardless. Handle that SEB is sending the creditor name in additionalInfo. — thanks @myhrmans
- [#325](https://github.com/actualbudget/actual-server/pull/325) Add custom bank adapter for 'SEB Kort Bank AB' to properly sync credit card transactions. — thanks @walleb

## 24.3.0

The release has the following notable improvements:

- Transaction list sortable by cleared status
- Offline PWA support
- Creating schedules from existing transactions
- (Experimental) custom report saving - please report your feedback [here](https://github.com/actualbudget/actual/issues/1918)

### Actual

Version: v24.3.0

#### Features

- [#2059](https://github.com/actualbudget/actual/pull/2059) Support automatically splitting transactions with rules — thanks @jfdoming
- [#2222](https://github.com/actualbudget/actual/pull/2222) Add ability to create schedules from existing transactions — thanks @xentara1
- [#2262](https://github.com/actualbudget/actual/pull/2262) Don't allow duplicate category groups — thanks @dhruvramdev
- [#2344](https://github.com/actualbudget/actual/pull/2344) Remove category spending report which has been superseded by the custom reports feature. — thanks @kyrias
- [#2369](https://github.com/actualbudget/actual/pull/2369) Add offline support to PWA — thanks @jfdoming

#### Enhancements

- [#1994](https://github.com/actualbudget/actual/pull/1994) Make transaction list sortable by cleared status — thanks @jaarasys-henria
- [#2121](https://github.com/actualbudget/actual/pull/2121) Change the hover background color of the month picker range to match other buttons in the UI. — thanks @pprimor
- [#2257](https://github.com/actualbudget/actual/pull/2257) Expanding the menu for saving reports and adding hooks and logic. — thanks @carkom
- [#2285](https://github.com/actualbudget/actual/pull/2285) Web manifest additions — thanks @youngcw
- [#2300](https://github.com/actualbudget/actual/pull/2300) Change look back and look forward time range when fuzzy matching — thanks @yoyotogblo
- [#2302](https://github.com/actualbudget/actual/pull/2302) In custom reports: separating "show offbudget" filter to split out hidden categories from offbudget. — thanks @carkom
- [#2309](https://github.com/actualbudget/actual/pull/2309) Consider child transactions when fuzzy matching imported transactions. — thanks @joel-jeremy
- [#2312](https://github.com/actualbudget/actual/pull/2312) Theme: Add Midnight theme — thanks @shall0pass
- [#2322](https://github.com/actualbudget/actual/pull/2322) Added `show/hide balance` button to the cash flow report — thanks @MatissJanis
- [#2326](https://github.com/actualbudget/actual/pull/2326) Allow running DB queries against the local database outside of dev-mode. Read more in [AQL docs](https://actualbudget.org/docs/api/actual-ql/) — thanks @MatissJanis
- [#2335](https://github.com/actualbudget/actual/pull/2335) Allows for saving custom reports. Also changes reports dashboard to display saved reports. — thanks @carkom
- [#2346](https://github.com/actualbudget/actual/pull/2346) Dynamically changing graph margins for large budgets with Y axis max > 1,000,000. — thanks @carkom
- [#2350](https://github.com/actualbudget/actual/pull/2350) Creating an autocomplete for custom reports so they can be recalled without switching back to the dashboard. — thanks @carkom
- [#2358](https://github.com/actualbudget/actual/pull/2358) Allow to post transaction(s) from schedule(s) at any time. — thanks @radtriste
- [#2368](https://github.com/actualbudget/actual/pull/2368) Show rules with splits on rules overview page — thanks @jfdoming
- [#2386](https://github.com/actualbudget/actual/pull/2386) Enable dashboard card "rename" menu. Change default custom report card to just show a button. Adjust time filters. Fix category order. — thanks @carkom
- [#2389](https://github.com/actualbudget/actual/pull/2389) Adding an interval menu to custom reports — thanks @carkom

#### Bugfix

- [#2123](https://github.com/actualbudget/actual/pull/2123) Add Primary Button hover background colors for light and Dark theme — thanks @Ife-Ody
- [#2286](https://github.com/actualbudget/actual/pull/2286) Fix margin when editing account name on desktop — thanks @dhruvramdev
- [#2313](https://github.com/actualbudget/actual/pull/2313) Fix collapsed budget header colors — thanks @youngcw
- [#2317](https://github.com/actualbudget/actual/pull/2317) Fix variable name misspelling in Dark theme — thanks @shall0pass
- [#2325](https://github.com/actualbudget/actual/pull/2325) Re-open autocomplete dropdown on change — thanks @jfdoming
- [#2327](https://github.com/actualbudget/actual/pull/2327) Save budget/account name fields on blur — thanks @jfdoming
- [#2342](https://github.com/actualbudget/actual/pull/2342) Fix parse errors with OFX data with no transactions — thanks @twk3
- [#2352](https://github.com/actualbudget/actual/pull/2352) Fix overlapping mobile nav bar. — thanks @skymaiden
- [#2360](https://github.com/actualbudget/actual/pull/2360) Change default schedule amount so that the amount sign can be changed first and not be locked to "-" — thanks @youngcw
- [#2364](https://github.com/actualbudget/actual/pull/2364) Convert html special characters in OFX imports to plaintext. — thanks @twk3
- [#2383](https://github.com/actualbudget/actual/pull/2383) Fix ability to rename budget in the UI. — thanks @twk3
- [#2399](https://github.com/actualbudget/actual/pull/2399) Only match 2 decimal places when parsing amounts for file import — thanks @youngcw
- [#2401](https://github.com/actualbudget/actual/pull/2401) Fix bug in create schedule from transaction — thanks @youngcw
- [#2411](https://github.com/actualbudget/actual/pull/2411) Fix crash in the BarGraph for Net/Interval. — thanks @carkom

#### Maintenance

- [#2231](https://github.com/actualbudget/actual/pull/2231) Split out large file FiltersMenu.jsx into separate elements and converted them all to Typescript. — thanks @carkom
- [#2270](https://github.com/actualbudget/actual/pull/2270) Update desktop-client dependency versions. — thanks @joel-jeremy
- [#2274](https://github.com/actualbudget/actual/pull/2274) Updating and organizing code in preparation for saved custom reports menu. — thanks @carkom
- [#2280](https://github.com/actualbudget/actual/pull/2280) Update loot-core dependencies — thanks @joel-jeremy
- [#2283](https://github.com/actualbudget/actual/pull/2283) Update yarn to 4.0.2 — thanks @joel-jeremy
- [#2293](https://github.com/actualbudget/actual/pull/2293) Add hooks for frequently-made operations in the codebase. — thanks @joel-jeremy
- [#2295](https://github.com/actualbudget/actual/pull/2295) Monthly cleanup tool: Adjust behavior with category roll-over and allow partial fills — thanks @shall0pass
- [#2298](https://github.com/actualbudget/actual/pull/2298) Remove modals.d.ts file — thanks @joel-jeremy
- [#2304](https://github.com/actualbudget/actual/pull/2304) Don't launch browser in docker development. — thanks @twk3
- [#2316](https://github.com/actualbudget/actual/pull/2316) Enable passing HTTPS env variable flag to dev container for easy HTTPS enabling. — thanks @jaarasys-henria
- [#2319](https://github.com/actualbudget/actual/pull/2319) Upgrade deprecated github CI actions — thanks @MatissJanis
- [#2320](https://github.com/actualbudget/actual/pull/2320) Split out large file SavedFilters.jsx into separate elements and converted them all to Typescript. — thanks @carkom
- [#2328](https://github.com/actualbudget/actual/pull/2328) Removing unused old code paths — thanks @MatissJanis
- [#2334](https://github.com/actualbudget/actual/pull/2334) Define more of the returns types in api-handlers. — thanks @twk3
- [#2343](https://github.com/actualbudget/actual/pull/2343) Patching an incorrect TypeScript type definition used for `sendCatch` method return value. — thanks @MatissJanis
- [#2345](https://github.com/actualbudget/actual/pull/2345) Changing graph styles so that they can be used for cards on Reports Dashboard. Also updating Entities and create/update calls for saved reports. — thanks @carkom
- [#2349](https://github.com/actualbudget/actual/pull/2349) Organizing and splitting filters Autocomplete. Splitting out headers function that was duplicated in all autocomplete elements. — thanks @carkom
- [#2356](https://github.com/actualbudget/actual/pull/2356) Removed `victory` dependency in favor of `recharts` — thanks @MatissJanis
- [#2357](https://github.com/actualbudget/actual/pull/2357) eslint: re-enable some rules to enforce better code quality — thanks @MatissJanis
- [#2380](https://github.com/actualbudget/actual/pull/2380) Excludes folders in tsconfig to fix VS Code "Configure Excludes" warning. — thanks @joel-jeremy
- [#2385](https://github.com/actualbudget/actual/pull/2385) Midnight theme updates — thanks @shall0pass
- [#2394](https://github.com/actualbudget/actual/pull/2394) Midnight theme updates, round 2 — thanks @shall0pass

### Actual Server

Version: v24.3.0

#### Enhancements

- [#305](https://github.com/actualbudget/actual-server/pull/305) Add GoCardless integration for Andelskassen Fælleskassen — thanks @circle3451
- [#315](https://github.com/actualbudget/actual-server/pull/315) Add pending transaction import and handling, where supported, to SimpleFIN integration. — thanks @duplaja

#### Bugfix

- [#310](https://github.com/actualbudget/actual-server/pull/310) Switch from using deprecated gocardless endpoints. — thanks @twk3
- [#311](https://github.com/actualbudget/actual-server/pull/311) Fix the redirect for gocardless link so the page closes when complete. — thanks @twk3

#### Maintenance

- [#307](https://github.com/actualbudget/actual-server/pull/307) Upgrade deprecated github actions — thanks @MatissJanis

## 24.2.0

The release has the following notable improvements:

- Reconciled transaction improvements:
  - ability to filter by the status
  - ask for confirmation if editing date
  - allow un-reconciling by clicking on the lock icon
- Split transactions now have a "distribute" button that fills the remaining amount among the sub-transactions with no amount
- (Experimental) SimpleFIN bank-sync support for US banks - please report your feedback [here](https://github.com/actualbudget/actual/issues/2272)

### Actual

Version: v24.2.0

#### Features

- [#2151](https://github.com/actualbudget/actual/pull/2151) Add "Distribute" button to distribute remaining split amount across empty splits. — thanks @NikxDa

#### Enhancements

- [#2056](https://github.com/actualbudget/actual/pull/2056) Added cleared and uncleared Balances to Account Mobile View — thanks @HansiWursti
- [#2108](https://github.com/actualbudget/actual/pull/2108) Adding filter for reconciled transactions. — thanks @davidkus
- [#2124](https://github.com/actualbudget/actual/pull/2124) Enabling and formatting "viewLabels" button for custom reports page — thanks @carkom
- [#2134](https://github.com/actualbudget/actual/pull/2134) Ask for confirmation when editing date of a locked transaction — thanks @Jackenmen
- [#2138](https://github.com/actualbudget/actual/pull/2138) Add cleared column in csv export — thanks @kstockk
- [#2163](https://github.com/actualbudget/actual/pull/2163) Add ability to import categories from CSV — thanks @ScottFries, @blakegearin, & @carkom
- [#2174](https://github.com/actualbudget/actual/pull/2174) Hide "show ..." checkboxes within menu for custom reports page. Introduce toggle switches. — thanks @carkom
- [#2176](https://github.com/actualbudget/actual/pull/2176) Update sync.ts with additionalInformation as last resort fallback to prevent Payee being empty — thanks @rjwonder
- [#2188](https://github.com/actualbudget/actual/pull/2188) Add option to link an account with SimpleFIN for syncing transactions. — thanks @zachwhelchel, @duplaja, @lancepick, & @latetedemelon
- [#2202](https://github.com/actualbudget/actual/pull/2202) Fix site.webmanifest to make Actual install-able as a Chromium PWA — thanks @subnut
- [#2206](https://github.com/actualbudget/actual/pull/2206) Add crossorigin assignment to use credentials for PWA with authentication — thanks @shall0pass
- [#2245](https://github.com/actualbudget/actual/pull/2245) Adding compact identifier to all of the graphs and cleaning them up. Plus other staging bits for saving custom reports. — thanks @carkom
- [#2246](https://github.com/actualbudget/actual/pull/2246) Add schema and backend functionality for custom reports. This is to enable saving reports in a future PR. — thanks @carkom
- [#2252](https://github.com/actualbudget/actual/pull/2252) Allow un-reconcile (unlock) transactions by clicking on the lock icon — thanks @MatissJanis
- [#2282](https://github.com/actualbudget/actual/pull/2282) Cleanup utility: Update goal target after end of month cleanup tool is activated for 'source' categories — thanks @shall0pass
- [#2284](https://github.com/actualbudget/actual/pull/2284) Add Off Budget category label to mobile transactions page — thanks @joel-jeremy

#### Bugfix

- [#2132](https://github.com/actualbudget/actual/pull/2132) Fix net worth graph to show more detail in compact card view — thanks @jasonmichalski
- [#2144](https://github.com/actualbudget/actual/pull/2144) Fix when pressing Enter adds an extra split transaction when no split remains — thanks @jasonmichalski
- [#2191](https://github.com/actualbudget/actual/pull/2191) Allow case insensitive ynab5 import for special 'starting balance' payee — thanks @Marethyu1
- [#2195](https://github.com/actualbudget/actual/pull/2195) Add missing borders in report budget table — thanks @youngcw
- [#2196](https://github.com/actualbudget/actual/pull/2196) Improve report budget pie chart colors — thanks @youngcw
- [#2199](https://github.com/actualbudget/actual/pull/2199) rules: add 'no rules' message and always show the rules table (even if no rules exist) — thanks @MatissJanis
- [#2204](https://github.com/actualbudget/actual/pull/2204) Re implemented the mobile Account Error Page introduced in #2114 and reverted in #2186 — thanks @HansiWursti
- [#2207](https://github.com/actualbudget/actual/pull/2207) Fix multi-autocomplete in rules page causing crashes — thanks @MatissJanis
- [#2214](https://github.com/actualbudget/actual/pull/2214) Mobile - Disable Save Button while editing Transaction Fields - Fixes #2203 — thanks @HansiWursti
- [#2217](https://github.com/actualbudget/actual/pull/2217) vite hosting regression fix. adds hosting on network back onto vite. — thanks @carkom
- [#2233](https://github.com/actualbudget/actual/pull/2233) Restore ability to use console.log in vite — thanks @twk3
- [#2238](https://github.com/actualbudget/actual/pull/2238) GoCardless: fix sync not working if `additionalInformation` fallback field is null — thanks @MatissJanis
- [#2249](https://github.com/actualbudget/actual/pull/2249) Fixing a bug where custom reports table graph crashes due to a type mismatch error. — thanks @carkom
- [#2251](https://github.com/actualbudget/actual/pull/2251) Fix 'delete file' button always deleting the cloud file. — thanks @MatissJanis
- [#2261](https://github.com/actualbudget/actual/pull/2261) Fix color in schedule before/after weekend selection — thanks @youngcw
- [#2273](https://github.com/actualbudget/actual/pull/2273) Fix 'uncategorized transactions' flashing in the header on page load — thanks @MatissJanis
- [#2276](https://github.com/actualbudget/actual/pull/2276) Fix link for registering with GoCardless — thanks @edleeman17
- [#2277](https://github.com/actualbudget/actual/pull/2277) Fix a missing ref param warning for forwardRef — thanks @twk3
- [#2278](https://github.com/actualbudget/actual/pull/2278) Fix 'false' passed as title in import transactions modal — thanks @twk3
- [#2279](https://github.com/actualbudget/actual/pull/2279) Fix same account sort_order when creating a demo budget — thanks @youngcw
- [#2281](https://github.com/actualbudget/actual/pull/2281) Fix database entry when applying goal templates — thanks @shall0pass
- [#2308](https://github.com/actualbudget/actual/pull/2308) Fix GoCardless bank sync breaking after a flaky SimpleFin db migration. — thanks @MatissJanis

#### Maintenance

- [#2053](https://github.com/actualbudget/actual/pull/2053) Bundle loot-core types into the API — thanks @twk3
- [#2072](https://github.com/actualbudget/actual/pull/2072) Fixing TypeScript issues when enabling `strictFunctionTypes` (pt.5). — thanks @MatissJanis
- [#2081](https://github.com/actualbudget/actual/pull/2081) Refactored MobileBudget component to TypeScript — thanks @joel-jeremy
- [#2084](https://github.com/actualbudget/actual/pull/2084) Switch desktop-client to the Vite JS framework. — thanks @twk3
- [#2102](https://github.com/actualbudget/actual/pull/2102) Goals: Refactor schedules file into functions and improve the readability of the code. — thanks @shall0pass
- [#2115](https://github.com/actualbudget/actual/pull/2115) eslint: no default exports — thanks @joel-jeremy
- [#2116](https://github.com/actualbudget/actual/pull/2116) eslint: no default exports - part 2 — thanks @joel-jeremy
- [#2117](https://github.com/actualbudget/actual/pull/2117) eslint: no default exports - part 3 — thanks @joel-jeremy
- [#2118](https://github.com/actualbudget/actual/pull/2118) eslint: no default exports - part 4 — thanks @joel-jeremy
- [#2119](https://github.com/actualbudget/actual/pull/2119) eslint: no default exports - part 5 — thanks @joel-jeremy
- [#2120](https://github.com/actualbudget/actual/pull/2120) eslint: no default exports - part 6 — thanks @joel-jeremy
- [#2136](https://github.com/actualbudget/actual/pull/2136) TypeScript: Add proper types to runHandler — thanks @twk3
- [#2142](https://github.com/actualbudget/actual/pull/2142) Fixing TypeScript issues when enabling `strictFunctionTypes` (pt.4). — thanks @MatissJanis
- [#2153](https://github.com/actualbudget/actual/pull/2153) Reorganize tableGraph files for custom reports. — thanks @carkom
- [#2168](https://github.com/actualbudget/actual/pull/2168) Add api tests for payees and transactions — thanks @twk3
- [#2169](https://github.com/actualbudget/actual/pull/2169) eslint: no default exports - part 7 — thanks @joel-jeremy
- [#2170](https://github.com/actualbudget/actual/pull/2170) eslint: no default exports - part 8 — thanks @joel-jeremy
- [#2171](https://github.com/actualbudget/actual/pull/2171) eslint: no default exports - part 9 — thanks @joel-jeremy
- [#2172](https://github.com/actualbudget/actual/pull/2172) eslint: no default exports - part 10 — thanks @joel-jeremy
- [#2173](https://github.com/actualbudget/actual/pull/2173) eslint: no default exports - part 11 — thanks @joel-jeremy
- [#2181](https://github.com/actualbudget/actual/pull/2181) migration: rename `nordigen_*` secrets to `gocardless_*` — thanks @MatissJanis
- [#2182](https://github.com/actualbudget/actual/pull/2182) Electron-app app store (OSX) release — thanks @MatissJanis
- [#2184](https://github.com/actualbudget/actual/pull/2184) eslint: no default exports - part 12 — thanks @joel-jeremy
- [#2185](https://github.com/actualbudget/actual/pull/2185) eslint: no default exports - part 13 — thanks @joel-jeremy
- [#2186](https://github.com/actualbudget/actual/pull/2186) Revert to fix master: Add error Page for special accounts in Mobile — thanks @twk3
- [#2190](https://github.com/actualbudget/actual/pull/2190) electron: move back from WebSockets to IPC for internal communications. This should improve the stability of the desktop app. — thanks @MatissJanis
- [#2192](https://github.com/actualbudget/actual/pull/2192) Fix table graph rendering issue for custom reports. — thanks @carkom
- [#2208](https://github.com/actualbudget/actual/pull/2208) ESLint to enforce Actual's useNavigate hook — thanks @joel-jeremy
- [#2209](https://github.com/actualbudget/actual/pull/2209) electron: split the build script in 2x parts to fix it failing when no code signing cert is provided (PRs from forks). — thanks @MatissJanis
- [#2212](https://github.com/actualbudget/actual/pull/2212) TypeScript: fix some `strictNullChecks: true` issues — thanks @MatissJanis
- [#2215](https://github.com/actualbudget/actual/pull/2215) removing old OFX parser code in favor of the new one — thanks @MatissJanis
- [#2224](https://github.com/actualbudget/actual/pull/2224) Change the vite chunk filename hash to closely match our webpack syntax — thanks @twk3
- [#2228](https://github.com/actualbudget/actual/pull/2228) TypeScript: fix some `strictNullChecks: true` issues (pt.2) — thanks @MatissJanis
- [#2230](https://github.com/actualbudget/actual/pull/2230) typescript: enable strict mode in most files; disable it in files that still need to be fixed — thanks @MatissJanis
- [#2244](https://github.com/actualbudget/actual/pull/2244) Moving entities and updating existing for custom reports. Also creating a new entity for the custom report data. — thanks @carkom
- [#2247](https://github.com/actualbudget/actual/pull/2247) TypeScript: making some files comply with strict TS. — thanks @MatissJanis
- [#2250](https://github.com/actualbudget/actual/pull/2250) Updated Github issues template to direct bug reports to the support channel (Discord) — thanks @MatissJanis
- [#2253](https://github.com/actualbudget/actual/pull/2253) Upgrading prettier, fixing the issues and enabling it for jsx files too — thanks @MatissJanis
- [#2254](https://github.com/actualbudget/actual/pull/2254) Making custom reports code more compact and efficient. — thanks @carkom
- [#2255](https://github.com/actualbudget/actual/pull/2255) Code clean-up: removing unused variables — thanks @MatissJanis
- [#2256](https://github.com/actualbudget/actual/pull/2256) Code clean-up: removing unused variables (pt.2) — thanks @MatissJanis
- [#2258](https://github.com/actualbudget/actual/pull/2258) Adding compact elements to custom reports. — thanks @carkom
- [#2260](https://github.com/actualbudget/actual/pull/2260) Refactored cash flow report from `victory` to `recharts` — thanks @MatissJanis
- [#2263](https://github.com/actualbudget/actual/pull/2263) Use useSingleActiveEditForm hook in mobile budget table — thanks @joel-jeremy
- [#2268](https://github.com/actualbudget/actual/pull/2268) Update vite / swc / ts versions. — thanks @joel-jeremy
- [#2287](https://github.com/actualbudget/actual/pull/2287) Update VRT instructions — thanks @youngcw

### Actual Server

Version: v24.2.0

#### Enhancements

- [#294](https://github.com/actualbudget/actual-server/pull/294) Add GoCardless integration for ING (Germany). — thanks @t4cmyk
- [#296](https://github.com/actualbudget/actual-server/pull/296) Add option to link an account to SimpleFIN for syncing transactions. — thanks @zachwhelchel, @duplaja, @lancepick, & @latetedemelon
- [#297](https://github.com/actualbudget/actual-server/pull/297) Add GoCardless bank integration for Sparkasse Marburg-Biedenkopf (Germany). — thanks @visurel
- [#298](https://github.com/actualbudget/actual-server/pull/298) Add GoCardless integration for Lægernes Bank DK — thanks @Waseh

#### Maintenance

- [#284](https://github.com/actualbudget/actual-server/pull/284) Remove obsolete `fly.template.toml` — thanks @albertchae
- [#293](https://github.com/actualbudget/actual-server/pull/293) migration: rename `nordigen_*` secrets to `gocardless_*` — thanks @MatissJanis
- [#300](https://github.com/actualbudget/actual-server/pull/300) Optional non-root user for Docker — thanks @hkiang01
- [#302](https://github.com/actualbudget/actual-server/pull/302) Reduce docker build failures on 32bit platforms — thanks @twk3
- [#303](https://github.com/actualbudget/actual-server/pull/303) Fixed a broken link in the README! — thanks @BoKKeR

## 24.1.0

The release has the following notable improvements:

- Mobile split transactions
- Ability to set max occurrences (or end date) for schedules
- (Experimental) custom report enhancements (please report bugs/feedback [here](https://github.com/actualbudget/actual/issues/1918))

### Actual

Version: v24.1.0

#### Features

- [#1899](https://github.com/actualbudget/actual/pull/1899) Add end date/max occurrences field to schedules, useful for things like installments — thanks @jfdoming
- [#2068](https://github.com/actualbudget/actual/pull/2068) Mobile split transactions — thanks @joel-jeremy

#### Enhancements

- [#1906](https://github.com/actualbudget/actual/pull/1906) Add support for automatic theme switching based on system theme — thanks @spezzino
- [#1964](https://github.com/actualbudget/actual/pull/1964) Category and group menu/modal in the mobile budget page to manage categories/groups and their notes. — thanks @joel-jeremy
- [#1988](https://github.com/actualbudget/actual/pull/1988) Data loading performance improvements for custom reports — thanks @carkom
- [#2046](https://github.com/actualbudget/actual/pull/2046) Adding typescript to custom report files and small functional changes. — thanks @carkom
- [#2062](https://github.com/actualbudget/actual/pull/2062) Adds a property to the returned items in the API for category and categoryGroup to inform if it is hidden. — thanks @iOSLife
- [#2067](https://github.com/actualbudget/actual/pull/2067) Adding types for future typescript changes. — thanks @carkom
- [#2069](https://github.com/actualbudget/actual/pull/2069) Updating variable naming for custom reports page. — thanks @carkom
- [#2073](https://github.com/actualbudget/actual/pull/2073) Migrate tooltips.js to typescript — thanks @IzStriker
- [#2078](https://github.com/actualbudget/actual/pull/2078) Enable Legend for custom reports. — thanks @carkom
- [#2080](https://github.com/actualbudget/actual/pull/2080) Add live/static choice for date filters. — thanks @carkom
- [#2082](https://github.com/actualbudget/actual/pull/2082) Add left and right margin to modals. — thanks @joel-jeremy
- [#2094](https://github.com/actualbudget/actual/pull/2094) Custom reports: Convert the view options (legend/summary/labels) to global preferences that apply to all graphs. — thanks @carkom
- [#2098](https://github.com/actualbudget/actual/pull/2098) Changing the view and functions for donut graph in custom reports. — thanks @carkom

#### Bugfix

- [#2002](https://github.com/actualbudget/actual/pull/2002) Prevent deleted categories blocking creation of new categories with the same name. — thanks @kymckay
- [#2008](https://github.com/actualbudget/actual/pull/2008) Fix filter Amount formatting issue — thanks @vishnukaushik
- [#2031](https://github.com/actualbudget/actual/pull/2031) Fix bulk edit field modal in desktop — thanks @joel-jeremy
- [#2085](https://github.com/actualbudget/actual/pull/2085) Realign and fix header/totals row for table graph in custom reports — thanks @carkom
- [#2092](https://github.com/actualbudget/actual/pull/2092) Fix background color when pinning sidebar (Issue [#2089](https://github.com/actualbudget/actual/issues/2089)) — thanks @HansiWursti
- [#2093](https://github.com/actualbudget/actual/pull/2093) Fix missing divider bar issue [#1878](https://github.com/actualbudget/actual/issues/1878) — thanks @HansiWursti
- [#2096](https://github.com/actualbudget/actual/pull/2096) Fix category spending report (experimental) not loading [#1981](https://github.com/actualbudget/actual/issues/1981) — thanks @MatissJanis
- [#2099](https://github.com/actualbudget/actual/pull/2099) [Goals]: Fix over budget condition with using apply instead of overwrite — thanks @youngcw
- [#2100](https://github.com/actualbudget/actual/pull/2100) Goals: Don't run templates on non-hidden categories inside of hidden groups — thanks @youngcw
- [#2125](https://github.com/actualbudget/actual/pull/2125) Goals: Negate schedule amount to budget if income — thanks @mk-french
- [#2127](https://github.com/actualbudget/actual/pull/2127) Fix update transaction API bug — thanks @mk-french
- [#2140](https://github.com/actualbudget/actual/pull/2140) Fix imported transactions overriding reconciled (locked) transaction data — thanks @MatissJanis
- [#2141](https://github.com/actualbudget/actual/pull/2141) Fix filtering in rules page: apply the filter on the full data set instead of the limited (paginated) data set. — thanks @MatissJanis & @jasonmichalski
- [#2166](https://github.com/actualbudget/actual/pull/2166) Fix mobile transaction page amount input bug on iOS. — thanks @joel-jeremy

#### Maintenance

- [#1991](https://github.com/actualbudget/actual/pull/1991) Add some initial api tests for budgets and accounts — thanks @twk3
- [#1993](https://github.com/actualbudget/actual/pull/1993) Use Page component for mobile pages — thanks @joel-jeremy
- [#2004](https://github.com/actualbudget/actual/pull/2004) Convert BudgetTotals, GoCardlessLink, Import, WelcomeScreen components to Typescript. — thanks @MikesGlitch
- [#2005](https://github.com/actualbudget/actual/pull/2005) Maintenance: Update CashFlow.js to use typescript — thanks @lucasboebel
- [#2007](https://github.com/actualbudget/actual/pull/2007) Migrating the DateRange and UseReport files to typescript — thanks @ameekSinghUniversityAcc
- [#2009](https://github.com/actualbudget/actual/pull/2009) Migrating the util.js and chartTheme.js files to typescript — thanks @ghosetuhin
- [#2022](https://github.com/actualbudget/actual/pull/2022) Refactored `FixedSizeList` to TypeScript — thanks @MatissJanis
- [#2023](https://github.com/actualbudget/actual/pull/2023) Added more strict typings to `utils.ts` and some of its dependencies — thanks @MatissJanis
- [#2025](https://github.com/actualbudget/actual/pull/2025) Adding aria-labels to some buttons for greater accessibility — thanks @MikesGlitch
- [#2029](https://github.com/actualbudget/actual/pull/2029) Enable `react/no-children-prop` rule and fix the issues — thanks @MatissJanis
- [#2032](https://github.com/actualbudget/actual/pull/2032) Apply eslint prefer-const rule to loot-core server files. — thanks @joel-jeremy
- [#2033](https://github.com/actualbudget/actual/pull/2033) Apply ESLint prefer-const on components folder part 1 — thanks @joel-jeremy
- [#2034](https://github.com/actualbudget/actual/pull/2034) Apply ESLint prefer-const on components folder part 2 — thanks @joel-jeremy
- [#2036](https://github.com/actualbudget/actual/pull/2036) Add api tests for categories and category groups — thanks @twk3
- [#2048](https://github.com/actualbudget/actual/pull/2048) Fixes and updates to dark theme colors. — thanks @carkom
- [#2064](https://github.com/actualbudget/actual/pull/2064) Cleanup older unused version of react-router — thanks @twk3
- [#2065](https://github.com/actualbudget/actual/pull/2065) Fixing TypeScript issues when enabling `strictFunctionTypes`. — thanks @MatissJanis
- [#2066](https://github.com/actualbudget/actual/pull/2066) Fixing TypeScript issues when enabling `strictFunctionTypes` (pt.2). — thanks @MatissJanis
- [#2070](https://github.com/actualbudget/actual/pull/2070) Fixing TypeScript issues when enabling `strictFunctionTypes` (pt.3). — thanks @MatissJanis
- [#2074](https://github.com/actualbudget/actual/pull/2074) ci: add helpful bot comments if CI jobs fail. — thanks @MatissJanis
- [#2101](https://github.com/actualbudget/actual/pull/2101) Apply eslint filename extensions for jsx. — thanks @twk3
- [#2111](https://github.com/actualbudget/actual/pull/2111) eslint: disallow unnecessary curly braces — thanks @MatissJanis
- [#2112](https://github.com/actualbudget/actual/pull/2112) TypeScript: moving `DeleteFile` component to TS — thanks @MatissJanis
- [#2113](https://github.com/actualbudget/actual/pull/2113) Enable prefer-const ESLint rule project-wide — thanks @joel-jeremy

### Actual Server

Version: 24.1.0

#### Maintenance

- [#292](https://github.com/actualbudget/actual-server/pull/292) docs: updated the GoCardless integration instructions — thanks @MatissJanis

## 23.12.1

This release does not have any UI changes or feature improvements. It features only `actual-server` fix for Synology NAS users.

Bug report: https://github.com/actualbudget/actual/issues/2011

### Actual Server

Version: 23.12.1

#### Bugfix

- [#289](https://github.com/actualbudget/actual-server/pull/289) Store the migrations statestore in the datadir instead of the application root. — thanks @bjw-s

## 23.12.0

The release has the following notable improvements:

- Dark theme is complete and no longer an experimental feature
- Transactions are now locked after reconciling
- Mobile: account creation
- Mobile: pull-down-to-sync available in the budget page
- Mobile: swipe up in the footer menu to reveal more pages

We are also proud to announce two new experimental features:

- Custom reports (please report bugs/feedback [here](https://github.com/actualbudget/actual/issues/1918))
- Sankey report (please report bugs/feedback [here](https://github.com/actualbudget/actual/issues/1919))

### Actual

Version: 23.12.0

#### Features

- [#1739](https://github.com/actualbudget/actual/pull/1739) Added a Sankey chart report as an experimental feature. — thanks @shaankhosla
- [#1789](https://github.com/actualbudget/actual/pull/1789) Lock transactions after reconciliation. — thanks @zachwhelchel
- [#1791](https://github.com/actualbudget/actual/pull/1791) Create and implement a customizable charts page. Currently hidden under feature flag (experimental). To include ability to save charts and show tiles on Overview page (future PR) — thanks @carkom
- [#1925](https://github.com/actualbudget/actual/pull/1925) Dark theme is live!! — thanks @carkom

#### Enhancements

- [#1758](https://github.com/actualbudget/actual/pull/1758) Swipe up mobile navbar to reveal more menus. — thanks @joel-jeremy
- [#1780](https://github.com/actualbudget/actual/pull/1780) Goals: Add indicator of goal status. Add db entries for saving the goal, and for the template json. — thanks @shall0pass & @youngcw
- [#1788](https://github.com/actualbudget/actual/pull/1788) Added option to select in/out field during import. — thanks @Jessseee
- [#1798](https://github.com/actualbudget/actual/pull/1798) Consolidating and making more consistent the warning and upcoming colors. Also includes some dark mode fixes. — thanks @carkom
- [#1833](https://github.com/actualbudget/actual/pull/1833) Not allowed duplicated Category names in Category Groups — thanks @Shazib
- [#1853](https://github.com/actualbudget/actual/pull/1853) Mobile create account. — thanks @joel-jeremy
- [#1858](https://github.com/actualbudget/actual/pull/1858) Mobile budget pull down to sync. — thanks @joel-jeremy
- [#1862](https://github.com/actualbudget/actual/pull/1862) Allow month names and abbreviations in dates (e.g. "December 24 2020") when importing — thanks @jamescostian
- [#1874](https://github.com/actualbudget/actual/pull/1874) Standardizes mobile colors so that the mobile view feels much more unified. — thanks @carkom
- [#1876](https://github.com/actualbudget/actual/pull/1876) Support import of OFX transactions of type INVSTMTMSGSRSV1 — thanks @joel-jeremy
- [#1880](https://github.com/actualbudget/actual/pull/1880) Mobile report budget — thanks @joel-jeremy
- [#1887](https://github.com/actualbudget/actual/pull/1887) Updates dark theme sidebar color and clean up theme files. — thanks @carkom
- [#1900](https://github.com/actualbudget/actual/pull/1900) Larger mobile autocomplete component fonts and paddings. — thanks @joel-jeremy
- [#1944](https://github.com/actualbudget/actual/pull/1944) Create category rules during ynab imports — thanks @twk3
- [#1980](https://github.com/actualbudget/actual/pull/1980) Validates minimum node version to 18.12.0 for @actual-app/api npm package — thanks @Marethyu1

#### Bugfix

- [#1765](https://github.com/actualbudget/actual/pull/1765) Dark mode - darker tint for pageTextLink. — thanks @Evomatic
- [#1820](https://github.com/actualbudget/actual/pull/1820) Fix styling of transaction page on mobile. — thanks @KaiBelmo
- [#1836](https://github.com/actualbudget/actual/pull/1836) UPDATES NYNAB import to support importing transactions that contain sub transactions that are account transfers — thanks @Marethyu1
- [#1840](https://github.com/actualbudget/actual/pull/1840) Schedule creation modal notify user of weekend skip option — thanks @sethgillett
- [#1864](https://github.com/actualbudget/actual/pull/1864) Make Select All respect filters and splits — thanks @jamescostian
- [#1867](https://github.com/actualbudget/actual/pull/1867) Fix account filter for budgeted and offbudget accounts, fixes #1577 — thanks @sreetamdas
- [#1885](https://github.com/actualbudget/actual/pull/1885) Fix crash when hitting undo after applying a rule to some transactions — thanks @jfdoming
- [#1911](https://github.com/actualbudget/actual/pull/1911) Fixing duplicate color issue. — thanks @carkom
- [#1916](https://github.com/actualbudget/actual/pull/1916) Fix mobile accounts page padding regression. — thanks @joel-jeremy
- [#1917](https://github.com/actualbudget/actual/pull/1917) Goals: Fix infinite loop situation with Schedule keyword — thanks @shall0pass
- [#1921](https://github.com/actualbudget/actual/pull/1921) Experimental OFX parser: Support multiple months in OFX file — thanks @joel-jeremy
- [#1926](https://github.com/actualbudget/actual/pull/1926) Fix issue with electron builds being stuck on a blank screen. — thanks @Shazib
- [#1929](https://github.com/actualbudget/actual/pull/1929) Fix flickering scroll bar that may appear when interacting with the new transaction input amount. — thanks @miqh
- [#1930](https://github.com/actualbudget/actual/pull/1930) Bug fixes for custom reports. — thanks @carkom
- [#1933](https://github.com/actualbudget/actual/pull/1933) Fix switching budget from rollover budget to report budget and immediately back does not work — thanks @paulsukow
- [#1934](https://github.com/actualbudget/actual/pull/1934) Sets minimum node version to 18.12.0 for @actual-app/api npm package — thanks @Marethyu1
- [#1938](https://github.com/actualbudget/actual/pull/1938) Fix space-comma format for newer NodeJS versions (18.18, and 21.x), fixes #1937 — thanks @twk3
- [#1951](https://github.com/actualbudget/actual/pull/1951) Consistent button sizes in budget title bar — thanks @joel-jeremy
- [#1955](https://github.com/actualbudget/actual/pull/1955) "Transfer" and "Off Budget" categories in mobile transaction page — thanks @joel-jeremy
- [#1962](https://github.com/actualbudget/actual/pull/1962) Fix broken modals. Unlock transactions moved to another account. — thanks @zachwhelchel
- [#1965](https://github.com/actualbudget/actual/pull/1965) Fix mobile budget cell save issue — thanks @joel-jeremy
- [#1970](https://github.com/actualbudget/actual/pull/1970) Style: change GoCardless success button color — thanks @MatissJanis
- [#1975](https://github.com/actualbudget/actual/pull/1975) Bug fixes for cancel add category group. — thanks @williamk19
- [#1976](https://github.com/actualbudget/actual/pull/1976) Fix bug in rule transaction apply preventing amount overrides — thanks @jfdoming
- [#1984](https://github.com/actualbudget/actual/pull/1984) Goals: Fix Schedule over-budget condition — thanks @shall0pass
- [#1987](https://github.com/actualbudget/actual/pull/1987) Fix rule ranker in API. — thanks @carkom
- [#1992](https://github.com/actualbudget/actual/pull/1992) Fix locked amount sign in schedule editor — thanks @youngcw
- [#2000](https://github.com/actualbudget/actual/pull/2000) Goals: Fix priority sorting — thanks @youngcw

#### Maintenance

- [#1834](https://github.com/actualbudget/actual/pull/1834) Convert Titlebar, BudgetPageHeader, DynamicBudgetTable, Tooltips components to Typescript. — thanks @MikesGlitch
- [#1860](https://github.com/actualbudget/actual/pull/1860) Added darkmode VRT (screenshot) tests — thanks @MatissJanis
- [#1868](https://github.com/actualbudget/actual/pull/1868) Consolidating colors so they are more consistent across the app from one page to the next — thanks @carkom
- [#1871](https://github.com/actualbudget/actual/pull/1871) Consolidating colors so they are more consistent across the app from one page to the next. — thanks @carkom
- [#1875](https://github.com/actualbudget/actual/pull/1875) Removing the last of the static colors and replacing with theme colors. — thanks @carkom
- [#1879](https://github.com/actualbudget/actual/pull/1879) Convert BudgetSummaries, MonthPicker, SidebarCategory components to Typescript. — thanks @MikesGlitch
- [#1888](https://github.com/actualbudget/actual/pull/1888) Goals: Move goal target calculations to individual files. — thanks @shall0pass
- [#1893](https://github.com/actualbudget/actual/pull/1893) Enabled `react/no-unstable-nested-components` eslint rule. — thanks @MatissJanis
- [#1895](https://github.com/actualbudget/actual/pull/1895) Add budget tables to AQL schema — thanks @youngcw
- [#1897](https://github.com/actualbudget/actual/pull/1897) Convert ExpenseGroup, ExpenseCategory, IncomeCategory components to Typescript. — thanks @MikesGlitch
- [#1902](https://github.com/actualbudget/actual/pull/1902) Upgrade `yarn` to v4 and better-sqlite3 to v9.1.1. — thanks @MatissJanis
- [#1909](https://github.com/actualbudget/actual/pull/1909) Type hardening action operator in rules.tsx — thanks @Marethyu1
- [#1923](https://github.com/actualbudget/actual/pull/1923) Convert CloseAccount, AccountAutocomplete, SavedFilterAutocomplete, PayeeAutocomplete components to Typescript. — thanks @MikesGlitch
- [#1936](https://github.com/actualbudget/actual/pull/1936) Refactor AmountInput component to TypeScript. — thanks @kymckay
- [#1941](https://github.com/actualbudget/actual/pull/1941) Ported `gocardless` file to TypeScript — thanks @MatissJanis
- [#1942](https://github.com/actualbudget/actual/pull/1942) Ported `global-events` to TypeScript — thanks @MatissJanis
- [#1946](https://github.com/actualbudget/actual/pull/1946) Refactor DiscoverSchedules component to tsx and enrich types for schedules discover endpoint. — thanks @muhsinkamil
- [#1948](https://github.com/actualbudget/actual/pull/1948) Refactor Payee table to TypeScript and harden generic `Table` component typing. — thanks @kymckay
- [#1949](https://github.com/actualbudget/actual/pull/1949) eslint: disallow using 'var': no-var rule — thanks @MatissJanis
- [#1950](https://github.com/actualbudget/actual/pull/1950) Split up large payee management components file. — thanks @kymckay
- [#1956](https://github.com/actualbudget/actual/pull/1956) ESLint prefer-const rule — thanks @joel-jeremy
- [#1958](https://github.com/actualbudget/actual/pull/1958) ESLint prefer-const rule — thanks @joel-jeremy
- [#1959](https://github.com/actualbudget/actual/pull/1959) Eslint: enable object-shorthand:properties eslint rule — thanks @MatissJanis
- [#1960](https://github.com/actualbudget/actual/pull/1960) Make screenshot comparisons more strict to improve reliability — thanks @MatissJanis
- [#1972](https://github.com/actualbudget/actual/pull/1972) Update ConfirmCategoryDelete, GoCardlessExternalMsg, ManageRulesModal to tsx — thanks @MikesGlitch

### Actual Server

Version: 23.12.0

#### Enhancements

- [#267](https://github.com/actualbudget/actual-server/pull/267) Ability to add and run database/fs migrations — thanks @MatissJanis
- [#282](https://github.com/actualbudget/actual-server/pull/282) Improved error handling of GoCardless issues — thanks @MatissJanis

#### Bugfix

- [#274](https://github.com/actualbudget/actual-server/pull/274) Add "docker.io/" registry prefix to docker compose image — thanks @Valloric
- [#275](https://github.com/actualbudget/actual-server/pull/275) Fix: add missing migrations folder for docker — thanks @MatissJanis
- [#278](https://github.com/actualbudget/actual-server/pull/278) Fix: GoCardless bank sync not working as expected after last migration PR merge — thanks @MatissJanis
- [#281](https://github.com/actualbudget/actual-server/pull/281) Fix: `ERR_UNSUPPORTED_ESM_URL_SCHEME` by upgrading node-migrate to v2.0.1 — thanks @MikesGlitch & @MatissJanis
- [#283](https://github.com/actualbudget/actual-server/pull/283) Fix: non-unique transactionId values for Belfius bank causing missing data. — thanks @Nudded
- [#285](https://github.com/actualbudget/actual-server/pull/285) Fix: add fixes for BNP Paribas Fortis and Hello Bank — thanks @feliciaan

#### Maintenance

- [#277](https://github.com/actualbudget/actual-server/pull/277) Upgrade `yarn` to v4 and `better-sqlite3` to v9.1.1 — thanks @MatissJanis

## 23.11.0

The release has the following notable improvements:

- Mobile: budget management - editing amounts, renaming names, etc.
- Mobile: hide navbar when scrolling down
- Web: sync when clicking "ctrl+s" or "cmd+s"
- Desktop app: stability improvements

### Actual

Version: 23.11.0

#### Enhancements

- [#1662](https://github.com/actualbudget/actual/pull/1662) Editable mobile budget cells — thanks @joel-jeremy & @dmlazaro
- [#1720](https://github.com/actualbudget/actual/pull/1720) Goals: speedup by only run the requested priority levels, skip others — thanks @youngcw
- [#1724](https://github.com/actualbudget/actual/pull/1724) Consolidate notice colors. — thanks @carkom
- [#1737](https://github.com/actualbudget/actual/pull/1737) Various mobile category and group functionalities. — thanks @joel-jeremy
- [#1740](https://github.com/actualbudget/actual/pull/1740) Update the NetWorth graph to use the Recharts library. — thanks @shaankhosla
- [#1745](https://github.com/actualbudget/actual/pull/1745) Hide mobile nav bar when scrolling — thanks @joel-jeremy & @MatissJanis
- [#1756](https://github.com/actualbudget/actual/pull/1756) Consolidating and making consistent error colors across all pages in the app. — thanks @carkom
- [#1759](https://github.com/actualbudget/actual/pull/1759) Allow linked child transactions. — thanks @joel-jeremy
- [#1770](https://github.com/actualbudget/actual/pull/1770) Sync on Ctrl+S — thanks @Compositr & @shaankhosla
- [#1781](https://github.com/actualbudget/actual/pull/1781) Inline mobile edits. — thanks @joel-jeremy
- [#1795](https://github.com/actualbudget/actual/pull/1795) Dark Theme: add theming to budget table where it was missing — thanks @youngcw
- [#1799](https://github.com/actualbudget/actual/pull/1799) Consolidating and making consistent page colors — thanks @carkom
- [#1800](https://github.com/actualbudget/actual/pull/1800) Fixes dark mode issues: server status color, and upcoming pill on schedules page — thanks @carkom
- [#1802](https://github.com/actualbudget/actual/pull/1802) Mobile balance cover/transfer/rollover overspending — thanks @joel-jeremy

#### Bugfix

- [#1694](https://github.com/actualbudget/actual/pull/1694) Desktop: reconnect to web-sockets if connection lost or server restarted — thanks @MatissJanis
- [#1750](https://github.com/actualbudget/actual/pull/1750) End of month cleanup - fixed condition that caused an error with null carryover value — thanks @shall0pass
- [#1751](https://github.com/actualbudget/actual/pull/1751) Prevent parent transaction being added to transfer account when splitting an existing transaction. — thanks @joel-jeremy
- [#1753](https://github.com/actualbudget/actual/pull/1753) Goals - Fix schedules 'in between' calculation — thanks @shall0pass
- [#1774](https://github.com/actualbudget/actual/pull/1774) Fix selecting delimiters in CSV options when uploading a CSV; it will apply to parsing. Also added a new delimiter '|'. — thanks @KaiBelmo
- [#1783](https://github.com/actualbudget/actual/pull/1783) Fix alignment of mobile budget header elements. — thanks @joel-jeremy
- [#1797](https://github.com/actualbudget/actual/pull/1797) Adjust casing of theme options for consistent presentation. — thanks @miqh
- [#1808](https://github.com/actualbudget/actual/pull/1808) Fix flaky mobile back button on account transactions. — thanks @joel-jeremy
- [#1819](https://github.com/actualbudget/actual/pull/1819) Fix styling on cash-flow graph. — thanks @shaankhosla
- [#1824](https://github.com/actualbudget/actual/pull/1824) Allow categorise transfer to off budget accounts on mobile — thanks @Kit-p
- [#1844](https://github.com/actualbudget/actual/pull/1844) Mobile: Fix mobile budget click handlers — thanks @joel-jeremy
- [#1855](https://github.com/actualbudget/actual/pull/1855) Fix: add missing top border for menu popover in budget page — thanks @MatissJanis
- [#1856](https://github.com/actualbudget/actual/pull/1856) Fix: bring back rollover arrows in budget page — thanks @MatissJanis

#### Maintenance

- [#1743](https://github.com/actualbudget/actual/pull/1743) refactor the following to tsx: IncomeGroup, IncomeHeader, MonthsContext, RenderMonths, SidebarGroup. — thanks @Jod929
- [#1755](https://github.com/actualbudget/actual/pull/1755) Convert CreateAccount and CreateEncryptionKey components to TypeScript. — thanks @MikesGlitch
- [#1768](https://github.com/actualbudget/actual/pull/1768) Convert BudgetSummary modal(mobile) and CreateLocalAccounts components to TypeScript. — thanks @MikesGlitch
- [#1776](https://github.com/actualbudget/actual/pull/1776) Convert DateSelect component to TypeScript and update category query type. — thanks @MikesGlitch
- [#1784](https://github.com/actualbudget/actual/pull/1784) Convert FixEncryptionKey, Loading, AnimatedLoading components to TypeScript and update get-payee query type. — thanks @MikesGlitch
- [#1785](https://github.com/actualbudget/actual/pull/1785) Update generated icons to typescript — thanks @MikesGlitch
- [#1814](https://github.com/actualbudget/actual/pull/1814) Added 2 new VRT tests for reports. — thanks @shaankhosla
- [#1823](https://github.com/actualbudget/actual/pull/1823) Convert Sort Utils, DisplayId, PlaidExternalMsg components to Typescript — thanks @MikesGlitch

### Actual Server

Version: 23.11.0

#### Maintenance

- [#260](https://github.com/actualbudget/actual-server/pull/260) Removing deprecated `jlongster/actual-server` — thanks @MatissJanis
- [#262](https://github.com/actualbudget/actual-server/pull/262) Add github issue templates — thanks @MatissJanis
- [#268](https://github.com/actualbudget/actual-server/pull/268) Upgrade `better-sqlite3` to v8.6.0 to align with the version used in frontend — thanks @MatissJanis

## 23.10.0

### Actual

Version: 23.10.0

#### Features

- [#1651](https://github.com/actualbudget/actual/pull/1651) Add spent column to mobile view — thanks @Crazypkr1099
- [#1663](https://github.com/actualbudget/actual/pull/1663) Mobile: pull down to trigger a bank-sync — thanks @MatissJanis

#### Enhancements

- [#1487](https://github.com/actualbudget/actual/pull/1487) Phase three of dark theme, to include schedules/payees/sidebar — thanks @biohzrddd & @carkom
- [#1503](https://github.com/actualbudget/actual/pull/1503) Phase four of dark theme, to include manager/modals — thanks @biohzrddd & @carkom
- [#1512](https://github.com/actualbudget/actual/pull/1512) Phase five of dark theme, to include Reports/settings — thanks @biohzrddd & @carkom
- [#1513](https://github.com/actualbudget/actual/pull/1513) Last phase of dark theme, to include budget and global files — thanks @biohzrddd & @carkom
- [#1587](https://github.com/actualbudget/actual/pull/1587) Support markdown in notes — thanks @OlegWock
- [#1592](https://github.com/actualbudget/actual/pull/1592) Make reports more responsive. — thanks @OlegWock
- [#1639](https://github.com/actualbudget/actual/pull/1639) Update `BUDGETED` labels in mobile accounts page to `FOR BUDGET` to be consistent with desktop labels. — thanks @joel-jeremy
- [#1648](https://github.com/actualbudget/actual/pull/1648) Fix mobile pages "back" behaviors. — thanks @joel-jeremy
- [#1709](https://github.com/actualbudget/actual/pull/1709) Enhance Y-Axis Scaling on Net Worth Graph — thanks @Crazypkr1099
- [#1723](https://github.com/actualbudget/actual/pull/1723) Changed the default number of months shown in the Cash Flow report from 30 to 5. — thanks @shaankhosla

#### Bugfix

- [#1634](https://github.com/actualbudget/actual/pull/1634) Fix pressing Enter on Encryption Key cancels entry instead of update the key — thanks @syukronrm
- [#1645](https://github.com/actualbudget/actual/pull/1645) Fix navigateToSchedule prop. — thanks @joel-jeremy
- [#1646](https://github.com/actualbudget/actual/pull/1646) Fix blur performance issue in Safari. — thanks @joel-jeremy
- [#1649](https://github.com/actualbudget/actual/pull/1649) Fix qfx import issues reported in v23.9.0. — thanks @joel-jeremy
- [#1654](https://github.com/actualbudget/actual/pull/1654) Don't show hidden groups on mobile — thanks @youngcw
- [#1656](https://github.com/actualbudget/actual/pull/1656) Don't show hidden income categories on mobile — thanks @youngcw
- [#1657](https://github.com/actualbudget/actual/pull/1657) Fix signup page not allowing to use domains without protocol — thanks @MatissJanis
- [#1665](https://github.com/actualbudget/actual/pull/1665) Mobile: fix sync button design — thanks @MatissJanis
- [#1669](https://github.com/actualbudget/actual/pull/1669) Mobile: fix schedule status label positioning — thanks @MatissJanis
- [#1678](https://github.com/actualbudget/actual/pull/1678) Fixes the reconciliation tooltip to use the cleared balance instead of the balance from all transactions — thanks @shaankhosla
- [#1679](https://github.com/actualbudget/actual/pull/1679) Mobile: Show true name of income group — thanks @youngcw
- [#1681](https://github.com/actualbudget/actual/pull/1681) Category autocomplete doesn't include unselectable category groups now — thanks @shaankhosla
- [#1687](https://github.com/actualbudget/actual/pull/1687) Fix a checkbox label sometimes appearing in multiple lines in the schedules modal — thanks @MatissJanis
- [#1698](https://github.com/actualbudget/actual/pull/1698) Mobile account transaction list: Restore sticky date section headers — thanks @trevdor
- [#1703](https://github.com/actualbudget/actual/pull/1703) fixing a darkTheme regression in sidebar account sync status — thanks @carkom
- [#1706](https://github.com/actualbudget/actual/pull/1706) Mobile: fix transaction list scrolling requiring a previous interaction before scroll happens — thanks @MatissJanis
- [#1708](https://github.com/actualbudget/actual/pull/1708) fixing filter transaction to show empty note instead of showing error "Value cannot be empty" — thanks @syukronrm
- [#1718](https://github.com/actualbudget/actual/pull/1718) Goals: fix bug in report budget templates, and add a speedup — thanks @youngcw
- [#1721](https://github.com/actualbudget/actual/pull/1721) Redirect back to budget page if non-existing pages accessed — thanks @MatissJanis
- [#1728](https://github.com/actualbudget/actual/pull/1728) Keep schedule name after completion or recreation — thanks @shaankhosla
- [#1729](https://github.com/actualbudget/actual/pull/1729) Fix bug that makes the schedule search bar shrink when there's many schedules. — thanks @shaankhosla
- [#1738](https://github.com/actualbudget/actual/pull/1738) Goals - Fixed an overbudgeting condition — thanks @shall0pass
- [#1752](https://github.com/actualbudget/actual/pull/1752) couple small regression fixes — thanks @carkom

#### Maintenance

- [#1542](https://github.com/actualbudget/actual/pull/1542) Remove usage of glamor CSSProperties — thanks @joel-jeremy
- [#1566](https://github.com/actualbudget/actual/pull/1566) Convert budget page component from class component to functional — thanks @MatissJanis
- [#1584](https://github.com/actualbudget/actual/pull/1584) Break apart budget/misc.js — thanks @joel-jeremy
- [#1597](https://github.com/actualbudget/actual/pull/1597) Use `useCategories` hook everywhere categories are accessed. — thanks @MatissJanis
- [#1599](https://github.com/actualbudget/actual/pull/1599) Convert eslint rules from "error" to "warn" to improve dev-experience; CI jobs treat warnings as errors, so we still have the same level of protection, but the local-dev experience is slightly improved — thanks @MatissJanis
- [#1600](https://github.com/actualbudget/actual/pull/1600) Experimental OFX parser meant to replace node-libofx — thanks @joel-jeremy
- [#1614](https://github.com/actualbudget/actual/pull/1614) Rename CategorySelect to CategoryAutocomplete — thanks @joel-jeremy
- [#1630](https://github.com/actualbudget/actual/pull/1630) Replace usage of format with useFormat hook — thanks @joel-jeremy
- [#1632](https://github.com/actualbudget/actual/pull/1632) Upgraded `absurd-sql` and removed `patch-package` dependency — thanks @MatissJanis
- [#1637](https://github.com/actualbudget/actual/pull/1637) Remove glamor ...css syntax. — thanks @joel-jeremy
- [#1641](https://github.com/actualbudget/actual/pull/1641) VRT: set a static version and unmask more regions for the tests — thanks @MatissJanis
- [#1643](https://github.com/actualbudget/actual/pull/1643) Upgraded `better-sqlite3` to 8.6.0 in order to fix electron-app data export crash — thanks @MatissJanis
- [#1644](https://github.com/actualbudget/actual/pull/1644) Refactor Schedules to tsx. — thanks @muhsinkamil
- [#1650](https://github.com/actualbudget/actual/pull/1650) Use swc-loader. — thanks @joel-jeremy
- [#1658](https://github.com/actualbudget/actual/pull/1658) Electron: improving operating system detection — thanks @MatissJanis
- [#1659](https://github.com/actualbudget/actual/pull/1659) Enable SWC sourceMaps. — thanks @joel-jeremy
- [#1660](https://github.com/actualbudget/actual/pull/1660) Migrate some components to TypeScript. — thanks @doggan
- [#1668](https://github.com/actualbudget/actual/pull/1668) Cleanup glamor style properties left behind as result of merge resolution. — thanks @joel-jeremy
- [#1670](https://github.com/actualbudget/actual/pull/1670) Refactor budget/IncomeHeader to tsx — thanks @Jod929
- [#1672](https://github.com/actualbudget/actual/pull/1672) Added mock schedules to the test budget to improve reliability and testing experience — thanks @MatissJanis
- [#1674](https://github.com/actualbudget/actual/pull/1674) Upgrade electron dependencies — thanks @MatissJanis
- [#1677](https://github.com/actualbudget/actual/pull/1677) Moving 'rules' server action handlers into a separate file — thanks @MatissJanis
- [#1680](https://github.com/actualbudget/actual/pull/1680) Typescript: hardening data entity types — thanks @MatissJanis
- [#1688](https://github.com/actualbudget/actual/pull/1688) Remove `privacyMode` feature flag as this feature is GA — thanks @MatissJanis
- [#1691](https://github.com/actualbudget/actual/pull/1691) Refactor SchedulesTable and its components to tsx. — thanks @muhsinkamil
- [#1692](https://github.com/actualbudget/actual/pull/1692) CI: do not cancel active Github jobs on master branch — thanks @MatissJanis
- [#1701](https://github.com/actualbudget/actual/pull/1701) Add a common component for AnchorLink and ButtonLink — thanks @th3c0d3br34ker
- [#1705](https://github.com/actualbudget/actual/pull/1705) Updating mobile icon to have no white border — thanks @MatissJanis
- [#1707](https://github.com/actualbudget/actual/pull/1707) Remove unnecessary react-error-overlay manual resolution — thanks @MatissJanis
- [#1722](https://github.com/actualbudget/actual/pull/1722) Refactor budget/BudgetMonthCountContext to tsx. — thanks @Jod929
- [#1725](https://github.com/actualbudget/actual/pull/1725) Add support for type 'link' in Button component. — thanks @th3c0d3br34ker
- [#1733](https://github.com/actualbudget/actual/pull/1733) Consolidate useMergedRefs hook and convert it to TypeScript. — thanks @MikesGlitch

### Actual Server

Version: 23.10.0

#### Features

- [#245](https://github.com/actualbudget/actual-server/pull/245) Make upload limits configurable via env vars to allow for larger files to be uploaded. — thanks @DistroByte

#### Enhancements

- [#257](https://github.com/actualbudget/actual-server/pull/257) Add GoCardless integration for Spar Nord DK — thanks @Aarup

#### Maintenance

- [#265](https://github.com/actualbudget/actual-server/pull/265) Make edge builds fetch master builds from correct repository. — thanks @kyrias

## 23.9.0

**Docker tag: 23.9.0**

### Actual

Version: 23.9.0

#### Features

- [#1340](https://github.com/actualbudget/actual/pull/1340) Add editing / adding transactions on mobile devices (via an initial port of the old React Native UI) — thanks @Cldfire
- [#1382](https://github.com/actualbudget/actual/pull/1382) Add category spending report — thanks @kyrias & @ovbm
- [#1623](https://github.com/actualbudget/actual/pull/1623) Releasing privacy mode as a supported feature — thanks @joel-jeremy & @MatissJanis

#### Enhancements

- [#1436](https://github.com/actualbudget/actual/pull/1436) Phase one of dark theme, to include filters/rules/transaction tables — thanks @biohzrddd & @carkom
- [#1455](https://github.com/actualbudget/actual/pull/1455) Show projected balance when creating a new transaction — thanks @joel-jeremy
- [#1468](https://github.com/actualbudget/actual/pull/1468) Improved error handling for export functionality — thanks @MatissJanis
- [#1480](https://github.com/actualbudget/actual/pull/1480) Update Accounts files with dark theme changes — thanks @biohzrddd & @carkom
- [#1482](https://github.com/actualbudget/actual/pull/1482) eslint rule for capturing colors/themes — thanks @carkom
- [#1484](https://github.com/actualbudget/actual/pull/1484) Fetch GoCardless transactions from the last 90 days or since first transaction — thanks @kyrias
- [#1491](https://github.com/actualbudget/actual/pull/1491) Add loading indicators to reports page — thanks @MatissJanis
- [#1493](https://github.com/actualbudget/actual/pull/1493) Stop setting `endDate` when fetching GoCardless transactions — thanks @kyrias
- [#1499](https://github.com/actualbudget/actual/pull/1499) Rely on date determined by server for GoCardless transactions — thanks @kyrias
- [#1505](https://github.com/actualbudget/actual/pull/1505) Allow schedules to skip weekends, and automatically reschedule to before or after the weekend — thanks @pole95
- [#1515](https://github.com/actualbudget/actual/pull/1515) Import category notes from YNAB4 exports — thanks @kyrias
- [#1545](https://github.com/actualbudget/actual/pull/1545) Mobile: add transaction creation button in the footer — thanks @MatissJanis
- [#1548](https://github.com/actualbudget/actual/pull/1548) Category spending: improving the visual style of the side-nav — thanks @MatissJanis
- [#1549](https://github.com/actualbudget/actual/pull/1549) Trigger a sync when the user returns to Actual in order to present fresh data — thanks @Cldfire
- [#1559](https://github.com/actualbudget/actual/pull/1559) Don't update transaction date when syncing from GoCardless — thanks @kyrias
- [#1573](https://github.com/actualbudget/actual/pull/1573) Show all payees by default for child transactions — thanks @kyrias
- [#1580](https://github.com/actualbudget/actual/pull/1580) Schedule page privacy filter — thanks @joel-jeremy
- [#1631](https://github.com/actualbudget/actual/pull/1631) Imports: ability to toggle on/off the fallback logic for payee field (OFX imports) — thanks @MatissJanis

#### Bugfix

- [#1402](https://github.com/actualbudget/actual/pull/1402) Fix bug where all Account Transaction rows would be re-rendered on hover of a single Transaction row — thanks @biohzrddd
- [#1465](https://github.com/actualbudget/actual/pull/1465) Fixed clearing split transactions when importing matched transactions — thanks @kstockk
- [#1481](https://github.com/actualbudget/actual/pull/1481) Goals: Ignore hidden categories when applying templates — thanks @shall0pass
- [#1486](https://github.com/actualbudget/actual/pull/1486) Fix mobile account view — thanks @Cldfire
- [#1494](https://github.com/actualbudget/actual/pull/1494) Fix transactions button background color — thanks @Cldfire
- [#1501](https://github.com/actualbudget/actual/pull/1501) Fix collapsed schedules table in Link Schedule modal — thanks @trevdor
- [#1508](https://github.com/actualbudget/actual/pull/1508) Show all available transaction icons - transfer & schedule — thanks @MatissJanis
- [#1518](https://github.com/actualbudget/actual/pull/1518) Fix incorrect cashflow balance — thanks @martinfrench92
- [#1526](https://github.com/actualbudget/actual/pull/1526) Show the correct payee of scheduled transactions on "For budget" account page — thanks @kyrias
- [#1529](https://github.com/actualbudget/actual/pull/1529) Fix nYNAB importer when fractional budget amounts are used — thanks @MatissJanis
- [#1530](https://github.com/actualbudget/actual/pull/1530) Fix lightmode regressions introduced with experimental darkmode changes — thanks @MatissJanis
- [#1531](https://github.com/actualbudget/actual/pull/1531) Fix transaction table hover effects — thanks @MatissJanis
- [#1533](https://github.com/actualbudget/actual/pull/1533) Fix schedule colors in transaction table — thanks @MatissJanis
- [#1539](https://github.com/actualbudget/actual/pull/1539) Mobile: Don't show hidden categories — thanks @shall0pass
- [#1540](https://github.com/actualbudget/actual/pull/1540) Mobile: Show the correct To Budget amount on Budget Summary — thanks @shall0pass
- [#1541](https://github.com/actualbudget/actual/pull/1541) Fix more darkmode regressions - transaction table, csv import modal — thanks @MatissJanis
- [#1546](https://github.com/actualbudget/actual/pull/1546) Mobile: hide sync button when sync is not active — thanks @MatissJanis
- [#1547](https://github.com/actualbudget/actual/pull/1547) Reset reconciliation bar when switching accounts — thanks @MatissJanis
- [#1550](https://github.com/actualbudget/actual/pull/1550) Fixed expanding mobile header, aligned elements center — thanks @zigamacele
- [#1551](https://github.com/actualbudget/actual/pull/1551) Mobile: transaction entry screen should apply the same negative/positive logic to Amount whether or not it is focused for editing at the time Add Transaction is pressed — thanks @trevdor
- [#1552](https://github.com/actualbudget/actual/pull/1552) Unified fatal error design — thanks @zigamacele
- [#1563](https://github.com/actualbudget/actual/pull/1563) Fix Link Schedules modal list of schedules growing too long — thanks @trevdor
- [#1571](https://github.com/actualbudget/actual/pull/1571) Fix collapsed linked transactions table in Schedule editor modal — thanks @trevdor
- [#1579](https://github.com/actualbudget/actual/pull/1579) Goals: Fix percentage goals overwriting any previous goal values — thanks @youngcw
- [#1581](https://github.com/actualbudget/actual/pull/1581) Fix split transaction deposits parent transaction amount to off-budget account instead of the child transaction amount — thanks @joel-jeremy
- [#1583](https://github.com/actualbudget/actual/pull/1583) Fix to open transaction date picker when clicked while it's focused — thanks @joel-jeremy
- [#1604](https://github.com/actualbudget/actual/pull/1604) Mobile: fix regression of Accounts page theme — thanks @trevdor
- [#1607](https://github.com/actualbudget/actual/pull/1607) Mobile: Fix text color in account autocomplete dialog — thanks @shall0pass
- [#1613](https://github.com/actualbudget/actual/pull/1613) Close open modals when navigating to a different URL — thanks @joel-jeremy
- [#1622](https://github.com/actualbudget/actual/pull/1622) Fix filtering in transaction table not working — thanks @MatissJanis
- [#1625](https://github.com/actualbudget/actual/pull/1625) Mobile: Fix bug where tapping a date heading in an account transaction list scrolls the list to the top — thanks @trevdor

#### Maintenance

- [#1270](https://github.com/actualbudget/actual/pull/1270) Remove second modal implementation — thanks @j-f1
- [#1469](https://github.com/actualbudget/actual/pull/1469) add development theme to list of theme options — thanks @carkom & @biohzrddd
- [#1477](https://github.com/actualbudget/actual/pull/1477) Update product screenshot in README.md — thanks @adamkelly86
- [#1479](https://github.com/actualbudget/actual/pull/1479) Migrate hooks from native JS to TypeScript — thanks @MatissJanis
- [#1492](https://github.com/actualbudget/actual/pull/1492) Add `plugin:react/recommended` eslint config and fix some issues — thanks @MatissJanis
- [#1517](https://github.com/actualbudget/actual/pull/1517) Extract rules components into individual files — thanks @MatissJanis
- [#1521](https://github.com/actualbudget/actual/pull/1521) Add e2e tests for mobile views — thanks @MatissJanis
- [#1532](https://github.com/actualbudget/actual/pull/1532) Migration some components to typescript — thanks @joel-jeremy
- [#1535](https://github.com/actualbudget/actual/pull/1535) Port App to functional component — thanks @joel-jeremy
- [#1553](https://github.com/actualbudget/actual/pull/1553) Add visual regression tests — thanks @MatissJanis
- [#1565](https://github.com/actualbudget/actual/pull/1565) Refactor MonthCountSelector to tsx. — thanks @Jod929
- [#1590](https://github.com/actualbudget/actual/pull/1590) Improving e2e test stability by forcing a specific date — thanks @MatissJanis
- [#1591](https://github.com/actualbudget/actual/pull/1591) Mark inactive PRs as stale and auto-close after 30 days — thanks @MatissJanis
- [#1602](https://github.com/actualbudget/actual/pull/1602) Refactor MobileTable to tsx. — thanks @Jod929
- [#1605](https://github.com/actualbudget/actual/pull/1605) VRT: increasing strictness and adding datepicker test — thanks @MatissJanis

### Actual Server

Version: 23.9.0

#### Enhancements

- [#237](https://github.com/actualbudget/actual-server/pull/237) Add all integration for all Bank Norwegian branches to the GoCardless support — thanks @kyrias
- [#239](https://github.com/actualbudget/actual-server/pull/239) Add American Express AESUDEF1 GoCardless bank integration — thanks @kyrias
- [#241](https://github.com/actualbudget/actual-server/pull/241) Make `endDate` field optional when downloading GoCardless transactions — thanks @kyrias
- [#242](https://github.com/actualbudget/actual-server/pull/242) Add GoCardless integration for Fintro BE to use additional transaction information — thanks @CharlieMK
- [#243](https://github.com/actualbudget/actual-server/pull/243) Decide on transaction date during GoCardless transaction normalization — thanks @kyrias
- [#244](https://github.com/actualbudget/actual-server/pull/244) Add GoCardless integration for Danske Bank Private NO — thanks @LudvigHz
- [#248](https://github.com/actualbudget/actual-server/pull/248) Disable the Express "Powered By" HTTP header for enhanced security — thanks @dylmye

#### Bugfix

- [#249](https://github.com/actualbudget/actual-server/pull/249) Fix config file not being loaded from the project root by default — thanks @UnexomWid

## 23.8.1

**Docker tag: 23.8.1**

### Actual

Version: 23.8.1

#### Enhancements

- [#1446](https://github.com/actualbudget/actual/pull/1446) Sentence case in menus — thanks @joel-jeremy
- [#1447](https://github.com/actualbudget/actual/pull/1447) Reports privacy filter — thanks @joel-jeremy
- [#1451](https://github.com/actualbudget/actual/pull/1451) Add option on import transactions screen to mark the transactions as cleared/uncleared — thanks @kstockk

#### Bugfix

- [#1448](https://github.com/actualbudget/actual/pull/1448) Goals: Fix 'up to' calculation to include current month spending — thanks @shall0pass
- [#1450](https://github.com/actualbudget/actual/pull/1450) fix Eye.js to change color dynamically based on style element passed to it. — thanks @carkom
- [#1452](https://github.com/actualbudget/actual/pull/1452) Goals: Schedules allow filling for future months — thanks @shall0pass
- [#1456](https://github.com/actualbudget/actual/pull/1456) Fix the mobile footer color back to the previous version — thanks @aleetsaiya
- [#1458](https://github.com/actualbudget/actual/pull/1458) In some situations the text in the Select component will be too big, which will make the inner vertical scrollbar appear. This PR is to hide the vertical scrollbar. — thanks @aleetsaiya
- [#1460](https://github.com/actualbudget/actual/pull/1460) Fix transparent background on titlebar. — thanks @carkom
- [#1461](https://github.com/actualbudget/actual/pull/1461) crdt: making the package fully TypeScript strict — thanks @MatissJanis
- [#1462](https://github.com/actualbudget/actual/pull/1462) Fix import from nYNAB and error-handling of other importers — thanks @MatissJanis
- [#1463](https://github.com/actualbudget/actual/pull/1463) Fix creating a new schedule with the same name as a deleted schedule — thanks @MatissJanis
- [#1464](https://github.com/actualbudget/actual/pull/1464) Goals: Applying templates would zero non-templated categories — thanks @shall0pass
- [#1473](https://github.com/actualbudget/actual/pull/1473) Fix approximate schedule values showing in balance pill when selected — thanks @MatissJanis
- [#1473](https://github.com/actualbudget/actual/pull/1473) Fix approximate schedule values showing in balance pill when selected — thanks @MatissJanis

#### Maintenance

- [#1431](https://github.com/actualbudget/actual/pull/1431) Move big input component into Input.js, port some of the manager app to TS — thanks @j-f1
- [#1437](https://github.com/actualbudget/actual/pull/1437) `crdt`: make typings more strict — thanks @MatissJanis
- [#1438](https://github.com/actualbudget/actual/pull/1438) crdt: upgrade murmurhash dependency — thanks @MatissJanis
- [#1449](https://github.com/actualbudget/actual/pull/1449) Update link in README for release notes — thanks @shall0pass

### Actual Server

Version: 23.8.1

No changes from the previous version.

## 23.8.0

**Docker tag: 23.8.0**

### Actual

Version: 23.8.0

#### Features

- [#1272](https://github.com/actualbudget/actual/pull/1272) Privacy mode: ability to mask sensitive information — thanks @joel-jeremy
- [#1367](https://github.com/actualbudget/actual/pull/1367) Add an initial feature flag and infrastructure for building out dark and custom themes. — thanks @biohzrddd & @j-f1

#### Enhancements

- [#1232](https://github.com/actualbudget/actual/pull/1232) Added transaction sorting on the Account page. Uses current action as well as previous action to sort. Also adjusted the functionality and interactions of filters and searches with the sorting. — thanks @carkom
- [#1235](https://github.com/actualbudget/actual/pull/1235) Reworked the budget month picker — thanks @Miodec
- [#1237](https://github.com/actualbudget/actual/pull/1237) Remembering the currently selected month in user prefs — thanks @Miodec
- [#1240](https://github.com/actualbudget/actual/pull/1240) Avoid downloading code for the desktop UI on mobile and vice versa — thanks @j-f1
- [#1287](https://github.com/actualbudget/actual/pull/1287) Added a negate options to the filters that are string based fields. This was added to Accounts page filters as well as the rules modal. — thanks @carkom
- [#1329](https://github.com/actualbudget/actual/pull/1329) Goals: Enable goal templates in Report Budget — thanks @shall0pass
- [#1334](https://github.com/actualbudget/actual/pull/1334) Square off the bottom corners of the payee list on the “Payees” page — thanks @j-f1
- [#1335](https://github.com/actualbudget/actual/pull/1335) Hide the “Show unused payees” button unless it is relevant — thanks @j-f1
- [#1344](https://github.com/actualbudget/actual/pull/1344) Goals: Use setZero function within goal templates for speed improvement — thanks @shall0pass
- [#1350](https://github.com/actualbudget/actual/pull/1350) Add ability to apply budget prefill calculations to a single category. Includes Goal template support. — thanks @shall0pass & @kyrias
- [#1354](https://github.com/actualbudget/actual/pull/1354) Scheduled transactions for the month to show up in Account's running balance — thanks @joel-jeremy
- [#1371](https://github.com/actualbudget/actual/pull/1371) Improve clarity of informational message in “merge unused payees” modal — thanks @j-f1
- [#1372](https://github.com/actualbudget/actual/pull/1372) Add support for parsing TSV files using the existing CSV parser — thanks @j-f1
- [#1373](https://github.com/actualbudget/actual/pull/1373) Allow importing the first row of a CSV file that does not contain a header row — thanks @j-f1
- [#1391](https://github.com/actualbudget/actual/pull/1391) Begin porting some parts of the UI to look different in light mode — thanks @biohzrddd & @j-f1
- [#1396](https://github.com/actualbudget/actual/pull/1396) Improve error messaging when the API package fails to download a file — thanks @j-f1
- [#1403](https://github.com/actualbudget/actual/pull/1403) Goals: add "prev" flag to percent goal to use previous month income. — thanks @youngcw
- [#1408](https://github.com/actualbudget/actual/pull/1408) Improving Search Bar for all pages. — thanks @carkom
- [#1412](https://github.com/actualbudget/actual/pull/1412) Add Indian numbering format (lakh, crore) — thanks @sidvishnoi
- [#1429](https://github.com/actualbudget/actual/pull/1429) Include the schedule name when filtering schedules. — thanks @kyrias

#### Bugfix

- [#1288](https://github.com/actualbudget/actual/pull/1288) Goals: Improved calculation when 'remainder' keyword is used with other keywords in the same category. — thanks @shall0pass
- [#1311](https://github.com/actualbudget/actual/pull/1311) The cashflow report filters out transfers which makes the ending balance inaccurate (and variable depending on when the transfers land). I've added transfers into the report and split them out from the totals. — thanks @carkom
- [#1312](https://github.com/actualbudget/actual/pull/1312) Goals: Fix calculated fill when using multiple 'up to' statements in different priority levels — thanks @shall0pass
- [#1316](https://github.com/actualbudget/actual/pull/1316) Fix clicking enter will create empty transaction issue. — thanks @aleetsaiya
- [#1325](https://github.com/actualbudget/actual/pull/1325) Fix the CashFlow report crash because of the new CustomSelect — thanks @aleetsaiya
- [#1349](https://github.com/actualbudget/actual/pull/1349) Fix bug causing transaction import in Safari to be unreliable — thanks @Cldfire
- [#1351](https://github.com/actualbudget/actual/pull/1351) Fix a bug that user can transfer budget to the category (or group) which user want to delete — thanks @aleetsaiya
- [#1353](https://github.com/actualbudget/actual/pull/1353) Prevent the “This is a demo build of Actual” bar from shrinking on small screen sizes — thanks @j-f1
- [#1363](https://github.com/actualbudget/actual/pull/1363) Fixed spelling errors in the "Repair split transactions" section of the settings page. — thanks @migillett
- [#1366](https://github.com/actualbudget/actual/pull/1366) Fix React warning in the console — thanks @j-f1
- [#1380](https://github.com/actualbudget/actual/pull/1380) Correct the width of the cleared/uncleared column in the transaction list — thanks @j-f1
- [#1385](https://github.com/actualbudget/actual/pull/1385) Remove double scrollbar while the viewport is big enough and remove the horizontal scrollbar under the transaction table. — thanks @aleetsaiya
- [#1389](https://github.com/actualbudget/actual/pull/1389) Remove non-functional “is between” filter operator — thanks @j-f1
- [#1397](https://github.com/actualbudget/actual/pull/1397) Update the API’s `node-fetch` dependency to fix a bug where connections could unexpectedly fail — thanks @j-f1
- [#1400](https://github.com/actualbudget/actual/pull/1400) Goals: Fix leftover $0.01 when using remainder goal — thanks @youngcw
- [#1406](https://github.com/actualbudget/actual/pull/1406) Fix missed lines from previous merge that broke sorting. — thanks @carkom
- [#1410](https://github.com/actualbudget/actual/pull/1410) Goals: Fix tracking of remaining funds when using priorities — thanks @youngcw
- [#1417](https://github.com/actualbudget/actual/pull/1417) Always show title bar to fix electron side-nav issues — thanks @MatissJanis
- [#1421](https://github.com/actualbudget/actual/pull/1421) Fix collapse/pin icon color in the side-nav — thanks @MatissJanis
- [#1423](https://github.com/actualbudget/actual/pull/1423) Fix number formatting setting not affecting side-nav — thanks @MatissJanis
- [#1433](https://github.com/actualbudget/actual/pull/1433) Fix incorrect state slice path used in top server status pill — thanks @MatissJanis
- [#1434](https://github.com/actualbudget/actual/pull/1434) `crdt`: export `Clock` as a type - fix a console warning — thanks @MatissJanis

#### Maintenance

- [#1186](https://github.com/actualbudget/actual/pull/1186) Improve TypeScript types in `loot-core` — thanks @TomAFrench
- [#1208](https://github.com/actualbudget/actual/pull/1208) Move YNAB4/5 import code into loot-core — thanks @j-f1
- [#1269](https://github.com/actualbudget/actual/pull/1269) Add TypeScript typings to most of the Redux-related functionality — thanks @j-f1
- [#1277](https://github.com/actualbudget/actual/pull/1277) Refactor some usages of `Select` component to `CustomSelect` — thanks @aleetsaiya
- [#1281](https://github.com/actualbudget/actual/pull/1281) Updated author information for Desktop (electron) App — thanks @Shazib
- [#1298](https://github.com/actualbudget/actual/pull/1298) Sort saved filters by alphabetical order — thanks @aleetsaiya
- [#1342](https://github.com/actualbudget/actual/pull/1342) Remove table navigator from rules page — thanks @aleetsaiya
- [#1343](https://github.com/actualbudget/actual/pull/1343) Remove legacy Select and NativeCategorySelect Component — thanks @aleetsaiya
- [#1348](https://github.com/actualbudget/actual/pull/1348) Rename `CustomSelect` component to `Select` — thanks @j-f1
- [#1355](https://github.com/actualbudget/actual/pull/1355) Add a couple of ESLint rules to increase code consistency — thanks @j-f1
- [#1359](https://github.com/actualbudget/actual/pull/1359) Port the modal infrastructure to TypeScript — thanks @j-f1
- [#1361](https://github.com/actualbudget/actual/pull/1361) Rename Nordigen to GoCardless — thanks @MatissJanis
- [#1362](https://github.com/actualbudget/actual/pull/1362) Fix onExpose is not a function error — thanks @joel-jeremy
- [#1368](https://github.com/actualbudget/actual/pull/1368) Update to the latest SVGR version & re-generate all icons — thanks @j-f1
- [#1374](https://github.com/actualbudget/actual/pull/1374) Update the text of the comment posted when closing feature requests — thanks @j-f1
- [#1378](https://github.com/actualbudget/actual/pull/1378) Fix the color of the newly added icons — thanks @j-f1
- [#1390](https://github.com/actualbudget/actual/pull/1390) Consistency improvements for `<AnimatedLoading>` — thanks @j-f1
- [#1395](https://github.com/actualbudget/actual/pull/1395) Refactor the button component a bit and enable dark mode for it — thanks @j-f1
- [#1404](https://github.com/actualbudget/actual/pull/1404) Improve TypeScript compatibility with Redux-related code — thanks @j-f1
- [#1405](https://github.com/actualbudget/actual/pull/1405) Port the settings-related code to TypeScript — thanks @j-f1
- [#1411](https://github.com/actualbudget/actual/pull/1411) Fix typo in `handle-feature-requests.js` — thanks @j-f1
- [#1413](https://github.com/actualbudget/actual/pull/1413) Moving `P` (`Paragraph`), `AnchorLink` and `useStableCallback` to a separate files — thanks @MatissJanis
- [#1418](https://github.com/actualbudget/actual/pull/1418) Moving away from barrel `common` imports to more specific per-component imports (part 1) — thanks @MatissJanis
- [#1419](https://github.com/actualbudget/actual/pull/1419) Moving away from barrel `common` imports to more specific per-component imports (part 2) — thanks @MatissJanis
- [#1420](https://github.com/actualbudget/actual/pull/1420) Moving away from barrel `common` imports to more specific per-component imports (part 3) — thanks @MatissJanis
- [#1422](https://github.com/actualbudget/actual/pull/1422) Moving away from barrel `common` imports to more specific per-component imports (part 4) — thanks @MatissJanis
- [#1430](https://github.com/actualbudget/actual/pull/1430) Remove no-op `applyFilter` call — thanks @j-f1
- [#1432](https://github.com/actualbudget/actual/pull/1432) Remove unused `budgetMonth` state slice usage — thanks @MatissJanis
- [#1435](https://github.com/actualbudget/actual/pull/1435) Update the GitHub action used to compare bundle sizes — thanks @j-f1

### Actual Server

Version: 23.8.0

#### Enhancements

- [#229](https://github.com/actualbudget/actual-server/pull/229) Upgrade `nordigen-node` to v1.2.6 — thanks @MatissJanis

#### Maintenance

- [#231](https://github.com/actualbudget/actual-server/pull/231) Rename Nordigen to GoCardless — thanks @MatissJanis
- [#235](https://github.com/actualbudget/actual-server/pull/235) Remove legacy env var/config file usage for nordigen secrets — thanks @MatissJanis

## 23.7.2

**Docker tag: 23.7.2**

### Actual

Version: 23.7.2

#### Bugfix

- [#1305](https://github.com/actualbudget/actual/pull/1305) Close the "add transaction" entry mode when switching between accounts — thanks @MatissJanis
- [#1306](https://github.com/actualbudget/actual/pull/1306) Revert category sorting on touch devices — thanks @MatissJanis
- [#1308](https://github.com/actualbudget/actual/pull/1308) Fix budget showing "--0.00" values sometimes — thanks @MatissJanis
- [#1309](https://github.com/actualbudget/actual/pull/1309) Handle upgrading from some recent `edge` versions to newer versions of Actual — thanks @j-f1
- [#1314](https://github.com/actualbudget/actual/pull/1314) Fix Custom Select unnecessary disabled scrollbar — thanks @aleetsaiya
- [#1317](https://github.com/actualbudget/actual/pull/1317) Fix sync: add back account type column — thanks @MatissJanis

#### Maintenance

- [#1297](https://github.com/actualbudget/actual/pull/1297) Fix a link will direct user to page not found. — thanks @aleetsaiya
- [#1302](https://github.com/actualbudget/actual/pull/1302) Improved error logs for `invalid-schema` issues — thanks @MatissJanis
- [#1307](https://github.com/actualbudget/actual/pull/1307) Improve CI check that catches backdated migrations — thanks @j-f1

### Actual Server

Version: 23.7.2

## 23.7.1

**Docker tag: 23.7.1**

### Actual

Version: 23.7.1

#### Bugfix

- [#1289](https://github.com/actualbudget/actual/pull/1289) Fix Nordigen sync issue; fix sorting of budget categories - thanks @MatissJanis
- [#1291](https://github.com/actualbudget/actual/pull/1291) Fix new budget files not syncing correctly - thanks @MatissJanis
- [#1294](https://github.com/actualbudget/actual/pull/1294) Fix month picker responsiveness in reports page and make the select boxes scrollable - thanks @MatissJanis & @aleetsaiya

### Actual Server

Version: 23.7.1

## 23.7.0

:::warning

Please **do not install this release**. It has multiple severe bugs. The fixes are available in v23.7.1

:::

**Docker tag: 23.7.0**

### Actual

Version: 23.7.0

#### Features

- [#1135](https://github.com/actualbudget/actual/pull/1135) Nordigen: release as a stable feature — thanks @MatissJanis

#### Enhancements

- [#948](https://github.com/actualbudget/actual/pull/948) Remove support for storing account types on the account (they didn’t do anything in the budget) — thanks @j-f1
- [#1075](https://github.com/actualbudget/actual/pull/1075) Add a new `sync` method to the API, also sync before shutting down. — thanks @j-f1
- [#1101](https://github.com/actualbudget/actual/pull/1101) Goals: Add remainder option to budget all extra funds automatically. — thanks @youngcw
- [#1104](https://github.com/actualbudget/actual/pull/1104) Disable “Reset sync” button when sync is disabled — thanks @j-f1
- [#1108](https://github.com/actualbudget/actual/pull/1108) Add action in month drop down to check template lines for proper formatting — thanks @youncw
- [#1121](https://github.com/actualbudget/actual/pull/1121) Improve error reporting when using the API — thanks @j-f1
- [#1122](https://github.com/actualbudget/actual/pull/1122) Added ability to save/update/delete filters within accounts page. — thanks @carkom
- [#1137](https://github.com/actualbudget/actual/pull/1137) Nordigen: Update design of the “create account” flow — thanks @j-f1
- [#1141](https://github.com/actualbudget/actual/pull/1141) Make the behavior of the “Server” button in the top-right corner more consistent — thanks @j-f1
- [#1143](https://github.com/actualbudget/actual/pull/1143) Expand / collapse all categories — thanks @joel-jeremy
- [#1161](https://github.com/actualbudget/actual/pull/1161) Log more details when migrations are out of sync — thanks @j-f1
- [#1176](https://github.com/actualbudget/actual/pull/1176) Automatically set category when adding a transaction to the budget category transaction list — thanks @joel-jeremy
- [#1193](https://github.com/actualbudget/actual/pull/1193) Goals: Schedule keyword supports daily or weekly recurring schedules — thanks @shall0pass
- [#1228](https://github.com/actualbudget/actual/pull/1228) Show schedule page when clicking on the calendar icon/recurring icon and the account page when clicking on the arrow icon in transaction list's Payee column — thanks @joel-jeremy
- [#1254](https://github.com/actualbudget/actual/pull/1254) Goals: Add 'available funds' option to the percentage goal — thanks @youngcw
- [#1268](https://github.com/actualbudget/actual/pull/1268) OFX Import support using 'memo' entries as payee if 'name' is unavailable — thanks @Shazib

#### Bugfix

- [#984](https://github.com/actualbudget/actual/pull/984) Stop frontend from attempting to connect to an invalid server when no server is configured — thanks @j-f1
- [#1095](https://github.com/actualbudget/actual/pull/1095) Fixes an error when 'sink' and 'source' are in the same category. — thanks @shall0pass
- [#1099](https://github.com/actualbudget/actual/pull/1099) Fix reloading issues, external url handling, and tidy up menus in the electron app. — thanks @Shazib
- [#1105](https://github.com/actualbudget/actual/pull/1105) Fix error in console when `hideFraction` pref is missing — thanks @j-f1
- [#1107](https://github.com/actualbudget/actual/pull/1107) Corrected an issue where toggling the "Show unused payees"/"Show all payees" button would raise a compilation error. — thanks @SudoCerb
- [#1109](https://github.com/actualbudget/actual/pull/1109) Fix ID for newly added migration — thanks @j-f1
- [#1127](https://github.com/actualbudget/actual/pull/1127) Nordigen: do not perform status check if server is offline — thanks @MatissJanis
- [#1128](https://github.com/actualbudget/actual/pull/1128) Nordigen: fix first-time setup flow when started in the accounts page — thanks @MatissJanis
- [#1133](https://github.com/actualbudget/actual/pull/1133) Nordigen: fix bank-sync expiry functionality — thanks @MatissJanis
- [#1136](https://github.com/actualbudget/actual/pull/1136) Fix "find schedules" page crashing if interaction is made before loading data finishes — thanks @MatissJanis
- [#1139](https://github.com/actualbudget/actual/pull/1139) Remove redundant usage of 'export' keyword — thanks @Shazib
- [#1140](https://github.com/actualbudget/actual/pull/1140) Automatically remove a trailing slash from server URLs before saving them — thanks @j-f1
- [#1144](https://github.com/actualbudget/actual/pull/1144) Revert “Make number parsing agnostic to decimal and thousands separators” because it produced undesirable behavior — thanks @j-f1
- [#1170](https://github.com/actualbudget/actual/pull/1170) Fix “delete file” modal layout — thanks @j-f1
- [#1171](https://github.com/actualbudget/actual/pull/1171) Fix transaction list page being blank on mobile — thanks @j-f1
- [#1178](https://github.com/actualbudget/actual/pull/1178) A couple patches for the React Router 6 upgrade. — thanks @trevdor
- [#1182](https://github.com/actualbudget/actual/pull/1182) Fix navigating to the per-category per-month page — thanks @j-f1
- [#1204](https://github.com/actualbudget/actual/pull/1204) Fix drag and drop on touch devices — thanks @joel-jeremy
- [#1219](https://github.com/actualbudget/actual/pull/1219) Auto-close the local/nordigen picker modal after creating an account — thanks @j-f1
- [#1224](https://github.com/actualbudget/actual/pull/1224) Imports from YNAB4/nYNAB will now link transfer transactions correctly — thanks @j-f1
- [#1234](https://github.com/actualbudget/actual/pull/1234) Stop page from refreshing when undoing — thanks @j-f1
- [#1242](https://github.com/actualbudget/actual/pull/1242) Fixed exporting data from Desktop (Electron) app. — thanks @Shazib
- [#1247](https://github.com/actualbudget/actual/pull/1247) Mobile: reduce the height of account cards — thanks @MatissJanis
- [#1250](https://github.com/actualbudget/actual/pull/1250) Fix `link schedule` option in transaction table — thanks @MatissJanis
- [#1252](https://github.com/actualbudget/actual/pull/1252) Fix toggling of balances in all-accounts view — thanks @MatissJanis
- [#1260](https://github.com/actualbudget/actual/pull/1260) Fix transaction list scrolling behavior — thanks @j-f1
- [#1262](https://github.com/actualbudget/actual/pull/1262) Fix tables appearing to have a blank area in tall-but-narrow windows — thanks @j-f1
- [#1267](https://github.com/actualbudget/actual/pull/1267) Fix the “Change server” button being invisible on Netlify deploy previews — thanks @j-f1

#### Maintenance

- [#1066](https://github.com/actualbudget/actual/pull/1066) Upgrade to react-router v6 and adopt v6 routing conventions. — thanks @trevdor & @j-f1
- [#1073](https://github.com/actualbudget/actual/pull/1073) Add a clear error to the API when no budget is open, but you attempted to perform an action that requires a budget to be open. — thanks @j-f1
- [#1076](https://github.com/actualbudget/actual/pull/1076) Add types to `crdt` directory — thanks @TomAFrench
- [#1077](https://github.com/actualbudget/actual/pull/1077) Enforce proper types in server sync code — thanks @TomAFrench
- [#1082](https://github.com/actualbudget/actual/pull/1082) Goals: Use shared 'months' functions throughout goals — thanks @shall0pass
- [#1106](https://github.com/actualbudget/actual/pull/1106) Align `cross-env` versions in all packages; add it to `desktop-electron` — thanks @MatissJanis
- [#1111](https://github.com/actualbudget/actual/pull/1111) Remove new OFX parser in favor of the old. — thanks @Sinistersnare
- [#1114](https://github.com/actualbudget/actual/pull/1114) Stop mixing platform-specific code — thanks @j-f1
- [#1115](https://github.com/actualbudget/actual/pull/1115) Update `loot-core` to be built with webpack 5, matching the other packages. — thanks @j-f1
- [#1117](https://github.com/actualbudget/actual/pull/1117) Recommend that the frontend be developed on using Node 18, correct Electron target version — thanks @j-f1
- [#1118](https://github.com/actualbudget/actual/pull/1118) Partition GitHub Actions cache based on Node version — thanks @j-f1
- [#1129](https://github.com/actualbudget/actual/pull/1129) Update all links in the codebase to point to the new documentation site — thanks @j-f1
- [#1145](https://github.com/actualbudget/actual/pull/1145) Remove unused functions from source — thanks @Shazib
- [#1146](https://github.com/actualbudget/actual/pull/1146) Remove all legacy 'Tutorial' code — thanks @Shazib
- [#1147](https://github.com/actualbudget/actual/pull/1147) Remove redundant usage of 'export' keyword — thanks @Shazib
- [#1150](https://github.com/actualbudget/actual/pull/1150) Extracting CRDT functionality out to `@actual-app/crdt` package — thanks @MatissJanis
- [#1155](https://github.com/actualbudget/actual/pull/1155) Remove misleading 'we have been notified' error messages — thanks @MatissJanis
- [#1156](https://github.com/actualbudget/actual/pull/1156) Remove unused code for notifying about major new features when updating — thanks @j-f1
- [#1157](https://github.com/actualbudget/actual/pull/1157) Remove 'needs triage' github label — thanks @MatissJanis
- [#1158](https://github.com/actualbudget/actual/pull/1158) Remove unused/legacy code from codebase — thanks @Shazib
- [#1173](https://github.com/actualbudget/actual/pull/1173) Add additional linter rules for checking imports — thanks @Shazib
- [#1174](https://github.com/actualbudget/actual/pull/1174) Remove legacy tutorial code from loot-core. — thanks @Shazib
- [#1180](https://github.com/actualbudget/actual/pull/1180) Improve TypeScript types in `loot-core` — thanks @j-f1
- [#1183](https://github.com/actualbudget/actual/pull/1183) Fix automatic comment on completed feature requests — thanks @j-f1
- [#1184](https://github.com/actualbudget/actual/pull/1184) Consistently use `<ExternalLink />` — thanks @j-f1
- [#1187](https://github.com/actualbudget/actual/pull/1187) Clean up the public/ folder — thanks @j-f1
- [#1189](https://github.com/actualbudget/actual/pull/1189) Remove unused scripts and `IS_BETA` env var — thanks @MatissJanis
- [#1190](https://github.com/actualbudget/actual/pull/1190) Upgrade `@reach/listbox` dependency from v0.11.2 to v0.18.0 and remove monkeypatch — thanks @MatissJanis
- [#1192](https://github.com/actualbudget/actual/pull/1192) Upgrade `react-dnd` dependency from v10.0.2 to v16.0.1 and remove monkeypatch — thanks @MatissJanis
- [#1195](https://github.com/actualbudget/actual/pull/1195) Upgrade `hotkeys-js` and remove monkeypatch — thanks @MatissJanis
- [#1199](https://github.com/actualbudget/actual/pull/1199) Add `public/data` to `.eslintignore` in `desktop-client` — thanks @j-f1
- [#1200](https://github.com/actualbudget/actual/pull/1200) Remove unused dependencies from `desktop-client` — thanks @j-f1
- [#1202](https://github.com/actualbudget/actual/pull/1202) Run ESLint at the top level once, instead of once per sub-package. — thanks @j-f1
- [#1203](https://github.com/actualbudget/actual/pull/1203) Remove `pikaday` monkeypatch — thanks @MatissJanis
- [#1205](https://github.com/actualbudget/actual/pull/1205) Display bundle size changes in comments on opened PRs — thanks @j-f1
- [#1210](https://github.com/actualbudget/actual/pull/1210) Move the report pages to a separate Webpack chunk to reduce the size of the main bundle by 25%. — thanks @j-f1
- [#1212](https://github.com/actualbudget/actual/pull/1212) Remove usage of Formik — thanks @j-f1
- [#1213](https://github.com/actualbudget/actual/pull/1213) Bundle only the variable font version of the UI font — thanks @j-f1
- [#1214](https://github.com/actualbudget/actual/pull/1214) Fix the bundle size comparison workflow on fork PRs — thanks @j-f1
- [#1216](https://github.com/actualbudget/actual/pull/1216) Remove redundant UUID wrapper module, update `uuid` package to 9.x — thanks @j-f1
- [#1217](https://github.com/actualbudget/actual/pull/1217) Move the rest of the syncing protobuf code to the CRDT package — thanks @j-f1
- [#1221](https://github.com/actualbudget/actual/pull/1221) Clean up legacy build scripts — thanks @Shazib
- [#1222](https://github.com/actualbudget/actual/pull/1222) Tidy up github action scripts — thanks @Shazib
- [#1223](https://github.com/actualbudget/actual/pull/1223) Updated linter settings to resolve issues with import/no-unused-modules — thanks @Shazib
- [#1227](https://github.com/actualbudget/actual/pull/1227) Remove unused build scripts and simplify how we build version number — thanks @MatissJanis
- [#1229](https://github.com/actualbudget/actual/pull/1229) Added a Netlify banner for easy jumping back to the PR — thanks @MatissJanis
- [#1230](https://github.com/actualbudget/actual/pull/1230) Enable dev-server asset caching — thanks @MatissJanis
- [#1239](https://github.com/actualbudget/actual/pull/1239) Add Desktop (electron) option to bug reports. — thanks @Shazib
- [#1243](https://github.com/actualbudget/actual/pull/1243) Fix workflow that posts auto comments on implemented feature requests — thanks @j-f1
- [#1246](https://github.com/actualbudget/actual/pull/1246) Updated git settings to ensure unix line endings on `.tsx` files — thanks @Shazib
- [#1248](https://github.com/actualbudget/actual/pull/1248) Moving some components from `common.tsx` to separate files inside the `common` folder — thanks @MatissJanis
- [#1251](https://github.com/actualbudget/actual/pull/1251) Cancel previous CI jobs if a new push is made — thanks @MatissJanis
- [#1256](https://github.com/actualbudget/actual/pull/1256) Remove lingering references to `locationPtr` after `react-router` upgrade — thanks @j-f1
- [#1257](https://github.com/actualbudget/actual/pull/1257) Moving more components from `common.tsx` to separate files inside the `common` folder — thanks @MatissJanis
- [#1258](https://github.com/actualbudget/actual/pull/1258) Reorganized accounts directory. Pulled our Header functions to make the accounts.js smaller and more manageable. — thanks @carkom
- [#1259](https://github.com/actualbudget/actual/pull/1259) Refactoring some usages of legacy `Select` component to autocompletes or `CustomSelect` — thanks @MatissJanis
- [#1265](https://github.com/actualbudget/actual/pull/1265) Back change on cleared/uncleared boxes for accounts page. — thanks @carkom

### Actual Server

Version: 23.7.0

#### Features

- [#214](https://github.com/actualbudget/actual-server/pull/214) Add a health check script (useful if running inside of a Docker container) — thanks @j-f1

#### Maintenance

- [#218](https://github.com/actualbudget/actual-server/pull/218) Port from `@actual-app/api` usage to `@actual-app/crdt` — thanks @MatissJanis

## 23.6.0

**Docker tag: 23.6.0**

### Actual

Version: 23.6.0

#### Features

- [#994](https://github.com/actualbudget/actual/pull/994) Reports: ability to filter the data by payee/account/category/etc. — thanks @MatissJanis
- [#1060](https://github.com/actualbudget/actual/pull/1060) Added the ability to hide category groups while keeping them in the same category group. — thanks @Miodec
- [#1011](https://github.com/actualbudget/actual/pull/1011) Add ability to filter the Manage Payees screen to show orphaned payees only. — thanks @sudoCerb

#### Enhancements

- [#964](https://github.com/actualbudget/actual/pull/964) Introduces a ResponsiveProvider as a foundation for future mobile development. Makes transaction entry available to many mobile users in landscape orientation. — thanks @trevdor
- [#995](https://github.com/actualbudget/actual/pull/995) Number Format: Add a new option (space-dot) e.g. "1 234.56" — thanks @TheTrueCaligari
- [#1004](https://github.com/actualbudget/actual/pull/1004) Add option to not remove funds when using an "up to" goal template. — thanks @youngcw
- [#1016](https://github.com/actualbudget/actual/pull/1016) Add menu item and keywords for end-of-month budget reassignments — thanks @shall0pass
- [#1023](https://github.com/actualbudget/actual/pull/1023) Created development docker container — thanks @jonezy35
- [#1029](https://github.com/actualbudget/actual/pull/1029) Make number parsing agnostic to decimal and thousands separators — thanks @chylex
- [#1034](https://github.com/actualbudget/actual/pull/1034) Updated account order inside the account autocomplete popup to: On Budget, Off Budget, Closed Accounts. Removed closed accounts from suggestions when creating a new transaction. — thanks @Miodec
- [#1052](https://github.com/actualbudget/actual/pull/1052) Templates: Add option to only apply schedule template to the month of the schedule instead of spreading out the charge. — thanks @youngcw

#### Bugfix

- [#999](https://github.com/actualbudget/actual/pull/999) Transactions table: when creating a split transaction - focus on the "debit" field next. — thanks @MatissJanis
- [#1000](https://github.com/actualbudget/actual/pull/1000) Reports: 1y date range should be 12 months, not 13 months — thanks @MatissJanis
- [#1008](https://github.com/actualbudget/actual/pull/1008) Reports: Add Upcoming/Due transactions in the "Selected balance" sum (Issue #319) — thanks @TheTrueCaligari
- [#1017](https://github.com/actualbudget/actual/pull/1017) Bugfix: amounts for schedules incorrectly read in 'space-dot' format. — thanks @TheTrueCaligari
- [#1019](https://github.com/actualbudget/actual/pull/1019) Fix infinite loop condition in repeat goal — thanks @youngcw
- [#1028](https://github.com/actualbudget/actual/pull/1028) Bugfix: Goals template compounding - Large target differences resulted in not enough funding — thanks @shall0pass
- [#1033](https://github.com/actualbudget/actual/pull/1033) Remove unnecessary message in the “Find schedules” modal — thanks @j-f1
- [#1038](https://github.com/actualbudget/actual/pull/1038) Fixed a bug where it was possible to make a transfer to the same account as the one making the transfer. — thanks @Miodec
- [#1048](https://github.com/actualbudget/actual/pull/1048) Fix a couple of bugs/inconsistencies in the Electron app — thanks @j-f1
- [#1049](https://github.com/actualbudget/actual/pull/1049) Goals Schedule - Include spent in calculation — thanks @shall0pass
- [#1054](https://github.com/actualbudget/actual/pull/1054) Re-export the API methods at the top level of the `@actual-budget/api` package like they were in the past. Note: If you were using the `api.methods.<method>` syntax to access API methods in recent versions, that is now deprecated and will stop working with the next major release of the API package. — thanks @j-f1
- [#1056](https://github.com/actualbudget/actual/pull/1056) Change copy-migrations shebang to bash. yarn build failed on copy-migrations because /bin/sh is not bash on WSL and doesn't expect -e — thanks @fry
- [#1058](https://github.com/actualbudget/actual/pull/1058) Fix date calculations in Goal Templates by adding a time zone correction — thanks @shall0pass
- [#1059](https://github.com/actualbudget/actual/pull/1059) Goals: Undo change that broke some template parsing — thanks @youngcw
- [#1067](https://github.com/actualbudget/actual/pull/1067) Fix link to spent transactions for a budget category — thanks @MatissJanis
- [#1083](https://github.com/actualbudget/actual/pull/1083) Goals: Fix bug that made repeat values >9 fail parsing. — thanks @youngcw
- [#1084](https://github.com/actualbudget/actual/pull/1084) Fix error if sink/source were defined in same category. — thanks @shall0pass

#### Maintenance

- [#979](https://github.com/actualbudget/actual/pull/979) Convert top common components in `desktop-client` to Typescript — thanks @albertogasparin
- [#1001](https://github.com/actualbudget/actual/pull/1001) Improve Actions setup, add more automation around issue management — thanks @j-f1
- [#1002](https://github.com/actualbudget/actual/pull/1002) Add missing migrations to the API package — thanks @j-f1
- [#1003](https://github.com/actualbudget/actual/pull/1003) Fixing Electron App — thanks @Shazib
- [#1005](https://github.com/actualbudget/actual/pull/1005) Detect more errors in JS OFX importer. — thanks @Sinistersnare
- [#1012](https://github.com/actualbudget/actual/pull/1012) Add link to current feature requests to README. — thanks @youngcw
- [#1015](https://github.com/actualbudget/actual/pull/1015) Enable ESLint’s `curly` rule — thanks @j-f1
- [#1022](https://github.com/actualbudget/actual/pull/1022) Improve behavior of shift-clicking checkboxes to select multiple transactions. — thanks @j-f1
- [#1032](https://github.com/actualbudget/actual/pull/1032) Adds support for dev containers, allowing for easier contributions. — thanks @jlsjonas
- [#1036](https://github.com/actualbudget/actual/pull/1036) Remove dependency on `@reactions/component` — thanks @j-f1
- [#1037](https://github.com/actualbudget/actual/pull/1037) Convert few other components in `desktop-client` to Typescript — thanks @albertogasparin
- [#1042](https://github.com/actualbudget/actual/pull/1042) Update Yarn — thanks @j-f1
- [#1043](https://github.com/actualbudget/actual/pull/1043) Upgrade `react-spring`, remove `wobble` dependency — thanks @j-f1
- [#1045](https://github.com/actualbudget/actual/pull/1045) Update to React Router v5.1 conventions to facilitate the v6 upgrade. — thanks @trevdor
- [#1061](https://github.com/actualbudget/actual/pull/1061) Use the `useLiveQuery` hook in a couple more places — thanks @j-f1
- [#1064](https://github.com/actualbudget/actual/pull/1064) Integrate `useMemo` into `useLiveQuery` — thanks @j-f1
- [#1070](https://github.com/actualbudget/actual/pull/1070) Add a few more `eslint-plugin-import` rules to keep our imports tidy — thanks @j-f1
- [#1078](https://github.com/actualbudget/actual/pull/1078) Migrate some files in `desktop-client` to use Typescript. — thanks @TomAFrench
- [#1079](https://github.com/actualbudget/actual/pull/1079) Remove stale reference to `loot-design` package. — thanks @TomAFrench

### Actual Server

Version: 23.6.0

#### Maintenance

- [#204](https://github.com/actualbudget/actual-server/pull/204) Fix build process for edge Docker images — thanks @j-f1
- [#208](https://github.com/actualbudget/actual-server/pull/208) Migrate to the combined release notes action from the main repo — thanks @j-f1

## 23.5.0

**Docker tag: 23.5.0**

### Actual

Version: 23.5.0

#### Features

- [#921](https://github.com/actualbudget/actual/pull/921) Add experimental OFX importer written in pure javascript. — thanks @sinistersnare

#### Enhancements

- [#858](https://github.com/actualbudget/actual/pull/858) Goals: Added support for percentage driven targets — thanks @shall0pass
- [#879](https://github.com/actualbudget/actual/pull/879) Goal templates: Changed how compounding 'by' matches are filled. Now uses an average across templates. — thanks @shall0pass
- [#910](https://github.com/actualbudget/actual/pull/910) Add setting to change first day of the week — thanks @biohzrddd
- [#919](https://github.com/actualbudget/actual/pull/919) Show pending transactions from Nordigen in transactions table — thanks @henrikmaa
- [#933](https://github.com/actualbudget/actual/pull/933) Autocomplete: set min-width for the tooltip — thanks @MatissJanis
- [#953](https://github.com/actualbudget/actual/pull/953) Re-arrange schedule operation options to start with "is approximately" (the default selection) — thanks @MatissJanis
- [#961](https://github.com/actualbudget/actual/pull/961) Goals: Add priority support — thanks @shall0pass & @youngcw
- [#968](https://github.com/actualbudget/actual/pull/968) Nordigen: ability to configure credentials via the UI — thanks @MatissJanis
- [#987](https://github.com/actualbudget/actual/pull/987) Add support for credit card OFX files — thanks @j-f1

#### Bugfix

- [#939](https://github.com/actualbudget/actual/pull/939) Fix j/k shortcuts to move between transactions on account pages — thanks @j-f1
- [#946](https://github.com/actualbudget/actual/pull/946) Don’t reset checked transactions when creating a schedule — thanks @j-f1
- [#947](https://github.com/actualbudget/actual/pull/947) Autocomplete: fix multi-autocomplete filtering UX — thanks @MatissJanis
- [#949](https://github.com/actualbudget/actual/pull/949) Autocomplete: support touch events — thanks @MatissJanis
- [#950](https://github.com/actualbudget/actual/pull/950) Nordigen: add fallback link to re-init bank-sync in case the popover was blocked — thanks @MatissJanis
- [#951](https://github.com/actualbudget/actual/pull/951) Forces CSV importer to ignore extra lines ensuring valid import field keys. — thanks @aaroneiche
- [#955](https://github.com/actualbudget/actual/pull/955) Schedules: make transfer transactions appear in both affecting accounts — thanks @MatissJanis
- [#960](https://github.com/actualbudget/actual/pull/960) Mobile: use the correct top-bar background color in settings page — thanks @MatissJanis
- [#966](https://github.com/actualbudget/actual/pull/966) Transaction table: show action checkbox on row hover — thanks @MatissJanis
- [#967](https://github.com/actualbudget/actual/pull/967) Re-introduce single line text blocks (useful for mobile) — thanks @MatissJanis
- [#969](https://github.com/actualbudget/actual/pull/969) Nordigen: improved error handling when bank-list API fails — thanks @MatissJanis
- [#972](https://github.com/actualbudget/actual/pull/972) Position notification banners always at bottom of the page — thanks @MatissJanis
- [#992](https://github.com/actualbudget/actual/pull/992) Allow creating transactions by clicking "enter" in the notes/payee/category field — thanks @MatissJanis

#### Maintenance

- [#896](https://github.com/actualbudget/actual/pull/896) Convert few more folders in `loot-core` to Typescript — thanks @albertogasparin
- [#931](https://github.com/actualbudget/actual/pull/931) Cleaning up state management in autocomplete — thanks @MatissJanis
- [#932](https://github.com/actualbudget/actual/pull/932) Improving e2e test stability — thanks @MatissJanis
- [#934](https://github.com/actualbudget/actual/pull/934) Move from deprecated peg.js to Peggy for Goal template parser. — thanks @sinistersnare
- [#945](https://github.com/actualbudget/actual/pull/945) Autocomplete: upgrade `Downshift` dependency — thanks @MatissJanis
- [#954](https://github.com/actualbudget/actual/pull/954) Automatically close feature request issues so the open issue list can focus on bugs — thanks @MatissJanis
- [#957](https://github.com/actualbudget/actual/pull/957) Finish converting `loot-core` to Typescript — thanks @albertogasparin
- [#962](https://github.com/actualbudget/actual/pull/962) TypeScript: migrated an assortment of common components to TS — thanks @MatissJanis
- [#974](https://github.com/actualbudget/actual/pull/974) eslint: Switch to TypeScript-aware `no-unused-vars` rule. — thanks @trevdor
- [#976](https://github.com/actualbudget/actual/pull/976) Remove unused `prop-types` dependency — thanks @MatissJanis
- [#977](https://github.com/actualbudget/actual/pull/977) Make `yarn start:browser` the default `start` command instead of `start:desktop` which currently doesn't reliably work — thanks @MatissJanis
- [#978](https://github.com/actualbudget/actual/pull/978) Contributors: add back Rich, add also Alberto — thanks @MatissJanis
- [#980](https://github.com/actualbudget/actual/pull/980) Run feature-request management github action when the "feature" label is added — thanks @MatissJanis
- [#982](https://github.com/actualbudget/actual/pull/982) Run feature-request management github action only once and for the "feature" label only (not for other labels) — thanks @MatissJanis
- [#985](https://github.com/actualbudget/actual/pull/985) Remove unused payee rules feature — thanks @j-f1

### Actual Server

Version: 23.5.0

#### Features

- [#194](https://github.com/actualbudget/actual-server/pull/194) Adds support for setting and getting secrets in actual-server. Additionally the secrets can be set from client using api. — thanks @henrikmaa

#### Enhancements

- [#190](https://github.com/actualbudget/actual-server/pull/190) Add an `all` field to /nordigen/transactions endpoint with ordered array of both booked and pending transactions — thanks @Jackenmen

#### Bugfix

- [#197](https://github.com/actualbudget/actual-server/pull/197) Set the secrets response to be JSON instead of plain-text — thanks @MatissJanis

#### Maintenance

- [#195](https://github.com/actualbudget/actual-server/pull/195) Remove the unused `migrations` folder — thanks @j-f1

## 23.4.2

**Docker tag: 23.4.2**

### Actual

Version: 23.4.2

#### Features

- [#885](https://github.com/actualbudget/actual/pull/885) Add template keyword to budget according to named schedules — thanks @pole95

#### Enhancements

- [#868](https://github.com/actualbudget/actual/pull/868) Improve sidebar auto-floating behavior — thanks @j-f1

#### Bugfix

- [#915](https://github.com/actualbudget/actual/pull/915) Fix reconciling a budget with a zero value — thanks @j-f1
- [#926](https://github.com/actualbudget/actual/pull/926) Fix undo keyboard shortcut being ignored — thanks @j-f1

#### Maintenance

- [#916](https://github.com/actualbudget/actual/pull/916) Remove `@jlongster/lively` dependency; refactor old autocomplete to not use it any more; disable new autocomplete — thanks @MatissJanis
- [#924](https://github.com/actualbudget/actual/pull/924) Remove `react-select` and the new autocomplete — thanks @MatissJanis

### Actual Server

Version: 23.4.2

#### Features

- [#186](https://github.com/actualbudget/actual-server/pull/186) Add an `npm run reset-password` script to set or reset the server password. — thanks @j-f1

#### Enhancements

- [#189](https://github.com/actualbudget/actual-server/pull/189) More clearly report the problem with Nordigen requests that fail with an unexpected status code — thanks @j-f1

## 23.4.1

**Docker tag: 23.4.1**

The release fixes a issue with creating rules from the transaction list.

### Actual

Version: 23.4.1

#### Enhancements

- [#860](https://github.com/actualbudget/actual/pull/860) Allow goal template 'by' matches to compound — thanks @shall0pass
- [#887](https://github.com/actualbudget/actual/pull/887) Mobile: unify "settings" page header with the style of "accounts" page — thanks @MatissJanis
- [#891](https://github.com/actualbudget/actual/pull/891) Goal template can now use single decimal places to define targets — thanks @shall0pass
- [#895](https://github.com/actualbudget/actual/pull/895) Improve error reporting for goal templates — thanks @shall0pass
- [#900](https://github.com/actualbudget/actual/pull/900) Add "Daily" option to scheduled transactions — thanks @biohzrddd

#### Bugfix

- [#865](https://github.com/actualbudget/actual/pull/865) Fix case-insensitive matching of strings for uppercase letters from non-English alphabets — thanks @Jackenmen
- [#881](https://github.com/actualbudget/actual/pull/881) Autocomplete: do not show "create payee" option if the typed-in payee is an exact match of an existing payee — thanks @MatissJanis
- [#882](https://github.com/actualbudget/actual/pull/882) Fix rule creation from account page (transaction list) — thanks @MatissJanis
- [#883](https://github.com/actualbudget/actual/pull/883) Recognize numpad enter key as enter key — thanks @j-f1
- [#886](https://github.com/actualbudget/actual/pull/886) Fill category field when selecting 'Create rule' from accounts screen — thanks @shall0pass
- [#902](https://github.com/actualbudget/actual/pull/902) Remove currently viewed account from list of possible transfer accounts — thanks @biohzrddd

#### Maintenance

- [#864](https://github.com/actualbudget/actual/pull/864) Don’t check for release notes on `release/*` branches — thanks @j-f1
- [#869](https://github.com/actualbudget/actual/pull/869) Disable ESLint when building in CI (since we have a separate linting job) — thanks @j-f1
- [#870](https://github.com/actualbudget/actual/pull/870) Remove duplicate migration and default-db.sqlite files — thanks @j-f1
- [#877](https://github.com/actualbudget/actual/pull/877) Convert most CommonJS imports/exports to ESM — thanks @albertogasparin
- [#884](https://github.com/actualbudget/actual/pull/884) Update `@typescript-eslint/*` packages to their latest versions — thanks @j-f1
- [#889](https://github.com/actualbudget/actual/pull/889) Convert few other folders in `loot-core` to Typescript — thanks @albertogasparin
- [#890](https://github.com/actualbudget/actual/pull/890) Add a CodeQL workflow to automatically scan for potential security issues — thanks @j-f1
- [#893](https://github.com/actualbudget/actual/pull/893) Remove usage of `realpath` command in build script — thanks @j-f1

### Actual Server

Version: 23.4.1

#### Features

- [#182](https://github.com/actualbudget/actual-server/pull/182) Add support for armv6l (Alpine-based images only) — thanks @intiplink

#### Enhancements

- [#187](https://github.com/actualbudget/actual-server/pull/187) Add rate limiting to all server requests — thanks @j-f1

#### Maintenance

- [#181](https://github.com/actualbudget/actual-server/pull/181) Don’t check for release notes on `release/*` branches — thanks @j-f1
- [#185](https://github.com/actualbudget/actual-server/pull/185) Use the proper Typescript Babel preset — thanks @albertogasparin

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

- [#725](https://github.com/actualbudget/actual/pull/725) A “hide decimal places” option has been added to improve readability for currencies that typically have large values. — thanks @j-f1
- [#792](https://github.com/actualbudget/actual/pull/792) Improved UX when setting up account links for bank-sync via Nordigen — thanks @MatissJanis
- [#802](https://github.com/actualbudget/actual/pull/802) Add quick rule creation from transactions table in accounts page — thanks @albertogasparin
- [#811](https://github.com/actualbudget/actual/pull/811) Allow rules to apply to "all" or "any" of the provided conditions — thanks @albertogasparin

#### Enhancements

- [#736](https://github.com/actualbudget/actual/pull/736) Save payee name in “imported payee” field during YNAB4/YNAB5 import — thanks @ostat
- [#756](https://github.com/actualbudget/actual/pull/756) Make goal template keywords case insensitive — thanks @j-f1
- [#762](https://github.com/actualbudget/actual/pull/762) Change when the welcome screen is shown, add a button to start by importing a file — thanks @j-f1
- [#768](https://github.com/actualbudget/actual/pull/768) Update wording across the UI to clarify that we don’t own any servers — thanks @j-f1
- [#774](https://github.com/actualbudget/actual/pull/774) Clarify in the UI that Account Type cannot be changed after creation — thanks @pmamberti
- [#785](https://github.com/actualbudget/actual/pull/785) Allow importing `.blob` files from actual-server — thanks @Jackenmen
- [#791](https://github.com/actualbudget/actual/pull/791) Replace straight quotes with curly quotes in user-visible text — thanks @j-f1
- [#793](https://github.com/actualbudget/actual/pull/793) Slightly improve the layout of the new autocomplete. — thanks @j-f1
- [#799](https://github.com/actualbudget/actual/pull/799) Improve visual consistency on the settings page — thanks @j-f1
- [#801](https://github.com/actualbudget/actual/pull/801) Add explicit bank-sync warning disclaimer — thanks @MatissJanis
- [#808](https://github.com/actualbudget/actual/pull/808) Import transactions with negative amounts represented as `(amount)` — thanks @aharbis
- [#834](https://github.com/actualbudget/actual/pull/834) Autocomplete: set min-width of the menu — thanks @MatissJanis
- [#835](https://github.com/actualbudget/actual/pull/835) Force the sidebar to always float when the window is narrow — thanks @j-f1
- [#848](https://github.com/actualbudget/actual/pull/848) Remove Safari pinned tab icon — thanks @j-f1
- [#850](https://github.com/actualbudget/actual/pull/850) Autocomplete: turn on new autocomplete by default — thanks @MatissJanis

#### Bugfix

- [#751](https://github.com/actualbudget/actual/pull/751) Fix `#template 0` causing an error — thanks @j-f1
- [#754](https://github.com/actualbudget/actual/pull/754) (Nordigen) Use bookingDate as fallback during sync — thanks @waseem-h
- [#777](https://github.com/actualbudget/actual/pull/777) Fix missing `onHover` prop in `TransactionsTable` — thanks @MatissJanis
- [#787](https://github.com/actualbudget/actual/pull/787) New autocomplete: making consistent height between multi/single value inputs — thanks @MatissJanis
- [#797](https://github.com/actualbudget/actual/pull/797) Re-enable goal templates by passing flag values to the budget summary component — thanks @modrzew
- [#819](https://github.com/actualbudget/actual/pull/819) Fix error when running importTransactions from the API — thanks @j-f1
- [#836](https://github.com/actualbudget/actual/pull/836) PayeeAutocomplete: fix long delay when clicking on "make transfer" — thanks @MatissJanis
- [#837](https://github.com/actualbudget/actual/pull/837) PayeeAutocomplete: fix flipping of the menu when it's opened near the bottom of the page — thanks @MatissJanis
- [#839](https://github.com/actualbudget/actual/pull/839) Autocomplete: remove portalization from usage in transaction table in order to improve the UX — thanks @MatissJanis
- [#851](https://github.com/actualbudget/actual/pull/851) Fix "no server" link no longer working — thanks @MatissJanis
- [#853](https://github.com/actualbudget/actual/pull/853) Hide the file list/import screens when loading a budget — thanks @j-f1
- [#854](https://github.com/actualbudget/actual/pull/854) Dismiss the update notification only after clicking the close button — thanks @MatissJanis
- [#855](https://github.com/actualbudget/actual/pull/855) Normalize value when single/multi select is changed — thanks @MatissJanis
- [#856](https://github.com/actualbudget/actual/pull/856) Autocomplete: allow editing previously selected payees — thanks @MatissJanis
- [#862](https://github.com/actualbudget/actual/pull/862) Autocomplete: styling fixes — thanks @MatissJanis

#### Maintenance

- [#670](https://github.com/actualbudget/actual/pull/670) `node-libofx`: add transaction_acct_name function — thanks @j-f1
- [#696](https://github.com/actualbudget/actual/pull/696) Upgrade React to v18 — thanks @MatissJanis
- [#741](https://github.com/actualbudget/actual/pull/741) Refactored PaymentAutocomplete component to use react-select — thanks @MatissJanis
- [#746](https://github.com/actualbudget/actual/pull/746) Add support for automatically generating release notes — thanks @j-f1
- [#750](https://github.com/actualbudget/actual/pull/750) Reduce JavaScript bundle size by 1MB — thanks @j-f1
- [#755](https://github.com/actualbudget/actual/pull/755) Removing unused `Debugger` component and its dependencies: perf-deets, codemirror — thanks @MatissJanis
- [#758](https://github.com/actualbudget/actual/pull/758) Fix end-to-end testing workflow — thanks @j-f1
- [#763](https://github.com/actualbudget/actual/pull/763) Disable ESLint when building in CI — thanks @j-f1
- [#765](https://github.com/actualbudget/actual/pull/765) Make desktop-client integration tests independent — thanks @MatissJanis
- [#769](https://github.com/actualbudget/actual/pull/769) Refactor `TransactionsTable` to react-hook component — thanks @MatissJanis
- [#771](https://github.com/actualbudget/actual/pull/771) Reducing unit test flakiness by removing randomization — thanks @MatissJanis
- [#772](https://github.com/actualbudget/actual/pull/772) Upgrade `fast-check` dependency to improve unit test speed — thanks @MatissJanis
- [#775](https://github.com/actualbudget/actual/pull/775) Revert small change to `useTableNavigator` — thanks @MatissJanis
- [#776](https://github.com/actualbudget/actual/pull/776) Finish React v18 upgrade: react-dom change — thanks @MatissJanis
- [#778](https://github.com/actualbudget/actual/pull/778) Further autocomplete component refactors: AccountAutocomplete & GenericInput — thanks @MatissJanis
- [#780](https://github.com/actualbudget/actual/pull/780) Add `waitFor` to a flaky unit test to make it more stable — thanks @MatissJanis
- [#781](https://github.com/actualbudget/actual/pull/781) Remove unused `tableNavigatorOpts` code-path — thanks @MatissJanis
- [#783](https://github.com/actualbudget/actual/pull/783) Remove a few unused class components, convert a few components to functions — thanks @j-f1
- [#784](https://github.com/actualbudget/actual/pull/784) Refactor `Nordigen` and category Autocomplete to the new react-select component — thanks @MatissJanis
- [#786](https://github.com/actualbudget/actual/pull/786) Refactored all feature flags to use the new `useFeatureFlag` hook — thanks @MatissJanis
- [#789](https://github.com/actualbudget/actual/pull/789) Enable new autocomplete in dev/preview builds — thanks @MatissJanis
- [#790](https://github.com/actualbudget/actual/pull/790) Expose demo bank for easy bank-sync testing in dev and preview builds — thanks @MatissJanis
- [#795](https://github.com/actualbudget/actual/pull/795) Disable flaky unit test steps — thanks @MatissJanis
- [#800](https://github.com/actualbudget/actual/pull/800) Eliminate the `loot-design` package and move all of its code into `desktop-client` — thanks @j-f1
- [#803](https://github.com/actualbudget/actual/pull/803) Docs: remove Rich from core contributors — thanks @MatissJanis
- [#806](https://github.com/actualbudget/actual/pull/806) Retry loading backend script in web-workers (for local dev server) — thanks @MatissJanis
- [#813](https://github.com/actualbudget/actual/pull/813) Added onboarding and budget e2e tests — thanks @MatissJanis
- [#816](https://github.com/actualbudget/actual/pull/816) Initial setup to allow Typescript migration — thanks @albertogasparin
- [#831](https://github.com/actualbudget/actual/pull/831) Moved `NewAutocomplete` component to TypeScript — thanks @MatissJanis
- [#832](https://github.com/actualbudget/actual/pull/832) Allow `data:` URLs for images in Netlify deploys — thanks @j-f1
- [#841](https://github.com/actualbudget/actual/pull/841) Initial migration of loot-core to Typescript — thanks @albertogasparin
- [#845](https://github.com/actualbudget/actual/pull/845) Improve stability of budget e2e test file — thanks @MatissJanis
- [#849](https://github.com/actualbudget/actual/pull/849) Update to latest stable `date-fns` version — thanks @j-f1
- [#861](https://github.com/actualbudget/actual/pull/861) Enable linting for all packages — thanks @j-f1

### Actual Server

Version: 23.4.0

#### Features

- [#178](https://github.com/actualbudget/actual-server/pull/178) Add some optional logging to help troubleshoot configuration issues — thanks @j-f1

#### Enhancements

- [#141](https://github.com/actualbudget/actual-server/pull/141) Make the official Docker images available for armv7 — thanks @jamesmortensen
- [#166](https://github.com/actualbudget/actual-server/pull/166) Expose sha256 hashes of account IBANs in Nordigen get-accounts and transactions endpoints — thanks @Jackenmen
- [#172](https://github.com/actualbudget/actual-server/pull/172) Changed budget file download endpoint to use less memory by using streams — thanks @Jackenmen

#### Bugfix

- [#167](https://github.com/actualbudget/actual-server/pull/167) Fix config.json in a default location getting silently ignored when it contains syntax errors. — thanks @Jackenmen

#### Maintenance

- [#150](https://github.com/actualbudget/actual-server/pull/150) Update `docker-compose.yml` to clarify proper usage in production — thanks @j-f1
- [#165](https://github.com/actualbudget/actual-server/pull/165) Add support for automatically generating release notes — thanks @j-f1
- [#168](https://github.com/actualbudget/actual-server/pull/168) Expose demo bank that can be used to test Nordigen bank-sync — thanks @MatissJanis
- [#171](https://github.com/actualbudget/actual-server/pull/171) Fix app-sync.test.js not being ran due to faulty jest configuration — thanks @Jackenmen
- [#175](https://github.com/actualbudget/actual-server/pull/175) Push Docker images to new `actualbudget` Docker Hub organization. — thanks @trevdor

## 23.3.2

**Docker tag: 23.3.2**

The release has the following notable features:

- Docker fix: don't make symlink
- Various Nordigen bank-sync bugfixes

### Actual

Version: 23.3.2

#### Bugfix

- [#738](https://github.com/actualbudget/actual/pull/738) Set the filename/filetype before attempting to parse — thanks @j-f1
- [#744](https://github.com/actualbudget/actual/pull/744) (nordigen) fix detection of -0.00 "debited" transactions — thanks @Jackenmen
- [#745](https://github.com/actualbudget/actual/pull/745) (nordigen) fallback to array version of remittanceInformationUnstructured if necessary — thanks @Jackenmen
- [#247](https://github.com/actualbudget/actual/pull/247) Route aggregate queries in transaction grouped mode through the correct layer to remove deleted transactions — thanks @jlongster
- [#743](https://github.com/actualbudget/actual/pull/743) (nordigen) fallback to bookingDate if valueDate is not set — thanks @MatissJanis
- [#742](https://github.com/actualbudget/actual/pull/742) (nordigen) check server status before linking accounts — thanks @MatissJanis

#### Maintenance

- [#665](https://github.com/actualbudget/actual/pull/665) Remove year from the LICENSE — thanks @MatissJanis

### Actual Server

Version: 23.3.2

#### Features

- [#162](https://github.com/actualbudget/actual-server/pull/162) (nordigen) add status endpoint for checking status — thanks @MatissJanis

#### Bugfix

- [#156](https://github.com/actualbudget/actual-server/pull/156) Re-generate nordigen token — thanks @fstybel
- [#157](https://github.com/actualbudget/actual-server/pull/157) Don’t make Dockerfile a symlink — thanks @j-f1
- [#160](https://github.com/actualbudget/actual-server/pull/160) (nordigen) close window when opening /nordigen/link path — thanks @MatissJanis
- [#163](https://github.com/actualbudget/actual-server/pull/163) (nordigen) add currency to account name — thanks @MatissJanis

#### Maintenance

- [#161](https://github.com/actualbudget/actual-server/pull/161) Update README.md — thanks @suryaatevellore
- [#140](https://github.com/actualbudget/actual-server/pull/140) Remove year from the LICENSE — thanks @MatissJanis

## 23.3.1

**Docker tag: 23.3.1**

### Actual Server

Version: 23.3.1

#### Bugfix

- [#155](https://github.com/actualbudget/actual-server/pull/155) fix nordigen usage in fly.io — thanks @MatissJanis

## 23.3.0

**Docker tag: 23.3.0**

The release has the following notable features:

- _Experimental_ support for automatically syncing transactions from European bank accounts using Nordigen.
- Filters in the transaction list can now be edited.
- When connecting to a server for the first time, you no longer need to enter the server URL.
- You’ll now be notified of future updates to Actual.
- Large imports will no longer break in Safari.

### Actual

Version: 23.3.0

#### Features

- [#457](https://github.com/actualbudget/actual/pull/457) Nordigen integration - account sync — thanks @fstybel, @eberureon & @j-f1
- [#621](https://github.com/actualbudget/actual/pull/621) Implement outdated version indicator — thanks @vincentscode
- [#646](https://github.com/actualbudget/actual/pull/646) Allow editing filters — thanks @j-f1
- [#651](https://github.com/actualbudget/actual/pull/651) Add Toggle for hiding "Cleared" column — thanks @mnsrv
- [#649](https://github.com/actualbudget/actual/pull/649) Allow the server to auto-configure the server URL for the client — thanks @j-f1
- [#690](https://github.com/actualbudget/actual/pull/690) Added option to include exchange rate multiplier during import — thanks @carkom & @MatissJanis
- [#693](https://github.com/actualbudget/actual/pull/693) Add button and 'esc' shortcut to clear transaction filter — thanks @gsumpster

#### Enhancements

- [#588](https://github.com/actualbudget/actual/pull/588) Updates to the template/goal feature — thanks @j-f1
- [#648](https://github.com/actualbudget/actual/pull/648) Block enabling e2e encryption when the crypto API is unavailable — thanks @j-f1
- [#657](https://github.com/actualbudget/actual/pull/657) Better explain the process for importing an exported file — thanks @j-f1
- [#675](https://github.com/actualbudget/actual/pull/675) Don’t force user to re-enter password after changing it — thanks @j-f1
- [#674](https://github.com/actualbudget/actual/pull/674) Make the “Not logged in” warning a button — thanks @j-f1
- [#464](https://github.com/actualbudget/actual/pull/464) Updates to the @actual-budget/api package — thanks @j-f1
- [#676](https://github.com/actualbudget/actual/pull/676) Update the Bootstrap page to be more welcoming — thanks @j-f1
- [#680](https://github.com/actualbudget/actual/pull/680) Intelligently adjust field for newly added action — thanks @j-f1
- [#692](https://github.com/actualbudget/actual/pull/692) (import) date formats supporting digits without leading zeros — thanks @MatissJanis
- [#668](https://github.com/actualbudget/actual/pull/668) Adds delay before note is displayed on hover. — thanks @venkata-krishnas
- [#727](https://github.com/actualbudget/actual/pull/727) (bank-sync) use full bank list + autocomplete — thanks @MatissJanis

#### Bugfix

- [#660](https://github.com/actualbudget/actual/pull/660) Stop editing when clicking on blank areas of tables — thanks @j-f1
- [#681](https://github.com/actualbudget/actual/pull/681) Don’t post messages to the worker until it is ready — thanks @j-f1
- [#705](https://github.com/actualbudget/actual/pull/705) Don’t allow bulk editing to set a field to null — thanks @j-f1
- [#700](https://github.com/actualbudget/actual/pull/700) Fix notes button not being visible unless hovered — thanks @j-f1
- [#706](https://github.com/actualbudget/actual/pull/706) Allow rendering a schedule in `<Value />` — thanks @j-f1
- [#707](https://github.com/actualbudget/actual/pull/707) Fix check for crypto.subtle — thanks @j-f1
- [#712](https://github.com/actualbudget/actual/pull/712) Add a missing space to the fatal error message — thanks @j-f1
- [#659](https://github.com/actualbudget/actual/pull/659) Improve handling of the undo/redo shortcuts — thanks @j-f1
- [#457](https://github.com/actualbudget/actual/pull/457/commits/d868645d40fbc6105fe8b1d1a48e93b03c7a4c27) Fix for syncing large batches of updates in Safari — thanks @j-f1

#### Maintenance

- [#647](https://github.com/actualbudget/actual/pull/647) (prettier) adding trailing commas — thanks @MatissJanis
- [#663](https://github.com/actualbudget/actual/pull/663) remove closed-source subscription notification code — thanks @MatissJanis
- [#671](https://github.com/actualbudget/actual/pull/671) Log more debugging information for an invalid-schema sync error — thanks @j-f1
- [#678](https://github.com/actualbudget/actual/pull/678) Fix error cases in displaying filters/rules — thanks @j-f1
- [#683](https://github.com/actualbudget/actual/pull/683) upgrade yarn to v3.4.1 (latest stable) — thanks @MatissJanis
- [#684](https://github.com/actualbudget/actual/pull/684) add interactive-tools yarn plugin — thanks @MatissJanis
- [#689](https://github.com/actualbudget/actual/pull/689) Don’t run linting while building in CI — thanks @j-f1
- [#694](https://github.com/actualbudget/actual/pull/694) (e2e) adding e2e tests for schedules page — thanks @MatissJanis
- [#695](https://github.com/actualbudget/actual/pull/695) (e2e) adding e2e tests for accounts: creating & closing — thanks @MatissJanis
- [#697](https://github.com/actualbudget/actual/pull/697) moving back to create-react-app — thanks @MatissJanis
- [#702](https://github.com/actualbudget/actual/pull/702) Remove/dedupe/upgrade several dependencies — thanks @j-f1
- [#703](https://github.com/actualbudget/actual/pull/703) removing lively from MonthPicker — thanks @MatissJanis
- [#704](https://github.com/actualbudget/actual/pull/704) remove unused component library code — thanks @MatissJanis
- [#708](https://github.com/actualbudget/actual/pull/708) remove dead code: budget-sheets-old — thanks @MatissJanis
- [#709](https://github.com/actualbudget/actual/pull/709) refactor MonthPicker and remove ElementQuery — thanks @MatissJanis
- [#710](https://github.com/actualbudget/actual/pull/710) remove more dead code — thanks @MatissJanis
- [#711](https://github.com/actualbudget/actual/pull/711) upgrade github actions — thanks @MatissJanis
- [#713](https://github.com/actualbudget/actual/pull/713) removed usage of babel-preset-jwl-app — thanks @MatissJanis
- [#714](https://github.com/actualbudget/actual/pull/714) Upgrade better-sqlite3 to the latest version — thanks @j-f1
- [#715](https://github.com/actualbudget/actual/pull/715) re-enable react-hooks/rules-of-hooks eslint rule — thanks @MatissJanis
- [#717](https://github.com/actualbudget/actual/pull/717) Fix e2e test to not assume it’s been run on Feb 28, 2023 — thanks @j-f1
- [#718](https://github.com/actualbudget/actual/pull/718) upgrade react-modal to v3.16.1 and remove the patch — thanks @MatissJanis
- [#720](https://github.com/actualbudget/actual/pull/720) Enable most of the disabled ESLint rules — thanks @j-f1
- [#721](https://github.com/actualbudget/actual/pull/721) Remove code in loot-core/src/server/spreadsheet that uses escodegen — thanks @j-f1
- [#729](https://github.com/actualbudget/actual/pull/729) Create an artifact with the built web UI for each commit — thanks @j-f1
- [#733](https://github.com/actualbudget/actual/pull/733) Remove outdated part of the postinstall script — thanks @j-f1

### Actual Server

Version: 23.3.0

#### Features

- [#74](https://github.com/actualbudget/actual-server/pull/74) & [#145](https://github.com/actualbudget/actual-server/pull/145) Backend integration with Nordigen - account sync — thanks @fstybel & @MatissJanis
- [#135](https://github.com/actualbudget/actual-server/pull/135) Auto-configure the client’s server URL — thanks @j-f1

#### Bugfix

- [#133](https://github.com/actualbudget/actual-server/pull/133) Replace require with import — thanks @j-f1

#### Maintenance

- [#121](https://github.com/actualbudget/actual-server/pull/121) Update the :edge images to use the very latest web UI version — thanks @j-f1 & @trevdor
- [#146](https://github.com/actualbudget/actual-serve/pull/146) upgrade yarn to v3.4.1 and add interactive-tools plugin — thanks @MatissJanis
- [#147](https://github.com/actualbudget/actual-serve/pull/147) Improve edge image build times — thanks @j-f1
- [#148](https://github.com/actualbudget/actual-serve/pull/148) adding trailing commas everywhere — thanks @MatissJanis
- [#149](https://github.com/actualbudget/actual-serve/pull/149) Fix edge image tagging — thanks @j-f1
- [#153](https://github.com/actualbudget/actual-server/pull/153) Fix Docker actions failing on PRs from forks — thanks @j-f1

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

- [#644](https://github.com/actualbudget/actual/pull/644) Allow bypassing SharedArrayBuffer override — thanks @j-f1

#### Bugfix

- [#640](https://github.com/actualbudget/actual/pull/640) Fix coloring of the “Split Transaction” button in the category picker — thanks @j-f1
- [#641](https://github.com/actualbudget/actual/pull/641) Fix prop name for button to enable e2ee — thanks @j-f1

#### Maintenance

- [#638](https://github.com/actualbudget/actual/pull/638) Allow the Netlify frontend to connect to arbitrary servers — thanks @j-f1
- [#639](https://github.com/actualbudget/actual/pull/639) Move desktop-client deps to devDeps — thanks @j-f1

### Actual Server

Version: 23.2.9

#### Maintenance

- [#128](https://github.com/actualbudget/actual-server/pull/128) Upgrade to ESM, update to latest dependencies — thanks @j-f1
- [#131](https://github.com/actualbudget/actual-server/pull/131) Move source code to an src/ directory — thanks @j-f1

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

- [#355](https://github.com/actualbudget/actual/pull/355) Schedule Editor: Keep payee list open while toggling transfer payees focus — thanks @trevdor
- [#467](https://github.com/actualbudget/actual/pull/467) Add an “Experimental Features” section in the settings — thanks @j-f1
- [#475](https://github.com/actualbudget/actual/pull/475) Add support for filtering the rules list — thanks @j-f1
- [#482](https://github.com/actualbudget/actual/pull/482) Add option to control the "cleared state" in Rules — thanks @shall0pass
- [#569](https://github.com/actualbudget/actual/pull/569) List of categories in transfer money dialog — thanks @shall0pass
- [#570](https://github.com/actualbudget/actual/pull/570) Use navigator.userAgent to determine isMobile — thanks @shall0pass
- [#573](https://github.com/actualbudget/actual/pull/573) Goal templates — thanks @shall0pass
- [#579](https://github.com/actualbudget/actual/pull/579) Add 'View on Hover' to Category Notes for #563 — thanks @gsumpster
- [#580](https://github.com/actualbudget/actual/pull/580) Added date to export file name — thanks @rich-howell
- [#584](https://github.com/actualbudget/actual/pull/585) Cover Overspending dropdown menu, open on click — thanks @shall0pass
- [#590](https://github.com/actualbudget/actual/pull/590) Add support for filtering the schedules table — thanks @j-f1
- [#593](https://github.com/actualbudget/actual/pull/593) Allow creating a payee with a name matching an existing account — thanks @j-f1
- [#598](https://github.com/actualbudget/actual/pull/595) Allow configuring the server from any page on the management app — thanks @j-f1
- [#600](https://github.com/actualbudget/actual/pull/600) Add a warning when SharedArrayBuffer is not available — thanks @j-f1
- [#601](https://github.com/actualbudget/actual/pull/601) Improve handling of schedules that are missing a date — thanks @j-f1
- [#602](https://github.com/actualbudget/actual/pull/602) Support arbitrary currency symbols in expressions — thanks @j-f1
- [#617](https://github.com/actualbudget/actual/pull/617) Improve behavior of deleted payees/categories/accounts in rules — thanks @j-f1

#### Bugfix

- [#88](https://github.com/actualbudget/actual/pull/88) Fix some YNAB4 importer bugs — thanks @rianmcguire
- [#414](https://github.com/actualbudget/actual/pull/414) Fix condition mapping for payee rule creation from payee modal — thanks @winklevos
- [#451](https://github.com/actualbudget/actual/pull/451) Fix bug where rules page may not load due to link-schedule payee dependency — thanks @winklevos
- [#486](https://github.com/actualbudget/actual/pull/486) Fix TypeScript warning about too many files — thanks @j-f1
- [#489](https://github.com/actualbudget/actual/pull/489) Fix “Repair split transactions” button being missing — thanks @j-f1
- [#490](https://github.com/actualbudget/actual/pull/490) 🐛 (ynab4) transaction cleared state in imports — thanks @MatissJanis
- [#574](https://github.com/actualbudget/actual/pull/574) Fix #488 — thanks @MatissJanis
- [#572](https://github.com/actualbudget/actual/pull/572) fix: typo in reconciliation transaction creation — thanks @MatissJanis
- [#591](https://github.com/actualbudget/actual/pull/591) Allow libofx to handle decoding imported files — thanks @j-f1
- [#592](https://github.com/actualbudget/actual/pull/592) Update SelectedBalance to use useSheetValue — thanks @j-f1
- [#599](https://github.com/actualbudget/actual/pull/599) Don’t crash when loading an invalid account ID — thanks @j-f1
- [#605](https://github.com/actualbudget/actual/pull/605) Add a suggestion to upload the imported file if reporting an import bug — thanks @j-f1
- [#620](https://github.com/actualbudget/actual/pull/620) Fixes editing closed account names issue #616 — thanks @n1thun
- [#629](https://github.com/actualbudget/actual/pull/629) Fix form submission on TransferTooltip when pressing enter — thanks @gsumpster
- [#630](https://github.com/actualbudget/actual/pull/630) Skip the “Starting Balance” transaction if the balance is 0 — thanks @j-f1
- [#632](https://github.com/actualbudget/actual/pull/632) Fix default value of “Move to a category” — thanks @j-f1

#### Maintenance

- [#469](https://github.com/actualbudget/actual/pull/469) 🚨 enabling no-unused-vars eslint rule — thanks @MatissJanis
- [#472](https://github.com/actualbudget/actual/pull/372) 👷 disable failing electron builds — thanks @MatissJanis
- [#485](https://github.com/actualbudget/actual/pull/485) Regenerate icons without the .web.js extension — thanks @j-f1
- [#575](https://github.com/actualbudget/actual/pull/575) Add an issue template for feature requests — thanks @j-f1
- [#586](https://github.com/actualbudget/actual/pull/586) ⬆️ upgrade caniuse-lite — thanks @MatissJanis
- [#609](https://github.com/actualbudget/actual/pull/609) ⬆️ upgrade node-fetch to ^2.6.9 — thanks @MatissJanis
- [#610](https://github.com/actualbudget/actual/pull/610) 🔖 (api) 4.1.6: node-fetch upgrade — thanks @MatissJanis
- [#624](https://github.com/actualbudget/actual/pull/624) Fatal error dialog update to reflect open source — thanks @rich-howell
- [#627](https://github.com/actualbudget/actual/pull/627) Remove all references to help@actualbudget.com — thanks @rich-howell
- [#633](https://github.com/actualbudget/actual/pull/633) Removed reference to blog — thanks @rich-howell
- [#635](https://github.com/actualbudget/actual/pull/635) Removing dead links — thanks @rich-howell

### Actual Server

Version: 23.2.5

#### Features

- [#115](https://github.com/actualbudget/actual-server/pull/115) Add support for HTTPS — thanks @j-f1

#### Bugfix

- [#109](https://github.com/actualbudget/actual-server/pull/109) fix: listen also listen on ipv6 addresses — thanks @heilerich

#### Maintenance

- [#116](https://github.com/actualbudget/actual-server/pull/116) 🔥 remove unused code (plaid, sync-full) — thanks @MatissJanis
- [#110](https://github.com/actualbudget/actual-server/pull/110) build(deps): bump node-fetch from 2.2.0 to 2.6.7
- [#111](https://github.com/actualbudget/actual-server/pull/111) build(deps): bump minimatch from 3.0.4 to 3.1.2
- [#112](https://github.com/actualbudget/actual-server/pull/112) build(deps): bump moment from 2.29.3 to 2.29.4
- [#117](https://github.com/actualbudget/actual-server/pull/117) build(deps): bump http-cache-semantics from 4.1.0 to 4.1.1
- [#118](https://github.com/actualbudget/actual-server/pull/118) ⬆️ upgrade @actual-app/api to 4.1.6: node-fetch v2 support — thanks @MatissJanis
- [#119](https://github.com/actualbudget/actual-server/pull/119) ⬆️ upgrade express\*, bcrypt and body-parser — thanks @MatissJanis

## 23.1.12

**Docker tag: 23.1.12**

The release has notable of improvements of:

- Read-only responsive view, this replaces our mobile apps, it is notable that this is read-only at this stage.
- Improvements to the sidebar design

### Actual

Version: 23.1.12

#### Features

- [#403](https://github.com/actualbudget/actual/pull/403) Replace URLs to point to https://actualbudget.github.io/docs — thanks @shall0pass
- [#413](https://github.com/actualbudget/actual/pull/413) feat: allow creating test budget in netlify deployments — thanks @MatissJanis
- [#420](https://github.com/actualbudget/actual/pull/420) feat: creating test budget on the config page — thanks @MatissJanis
- [#426](https://github.com/actualbudget/actual/pull/426) Move “Find schedules” to a button on the Schedules page — thanks @j-f1
- [#435](https://github.com/actualbudget/actual/pull/435) Read-only Responsive view — thanks @trevdor
- [#440](https://github.com/actualbudget/actual/pull/440) Further iteration on the sidebar design — thanks @j-f1

#### Bugfix

- [#423](https://github.com/actualbudget/actual/pull/423) Improve handling of “no server” state — thanks @j-f1
- [#430](https://github.com/actualbudget/actual/pull/430) fix: select date filtering by month #406 🚑 — thanks @iurynogueira
- [#441](https://github.com/actualbudget/actual/pull/441) Fix overlap of version info and server URL — thanks @trevdor

#### Maintenance

- [#401](https://github.com/actualbudget/actual/pull/401) Update git attributes for better End of Line handling — thanks @winklevos
- [#412](https://github.com/actualbudget/actual/pull/412) test: re-enable skipped unit tests — thanks @MatissJanis
- [#415](https://github.com/actualbudget/actual/pull/415) chore: fix eslint issues and make warnings CI blocking — thanks @MatissJanis
- [#418](https://github.com/actualbudget/actual/pull/418) fix: some react warnings — thanks @MatissJanis
- [#421](https://github.com/actualbudget/actual/pull/421) chore: remove unused variables — thanks @MatissJanis
- [#425](https://github.com/actualbudget/actual/pull/425) fix: re-disable no-unused-vars eslint rule — thanks @MatissJanis
- [#428](https://github.com/actualbudget/actual/pull/428) chore: remove more unused variables — thanks @MatissJanis
- [#429](https://github.com/actualbudget/actual/pull/429) prune: remove unused icons — thanks @MatissJanis
- [#431](https://github.com/actualbudget/actual/pull/431) prune: remove unused variables — thanks @MatissJanis
- [#434](https://github.com/actualbudget/actual/pull/434) Split the Settings component into multiple files — thanks @j-f1
- [#437](https://github.com/actualbudget/actual/pull/437) chore: remove unused vars & cleanups — thanks @MatissJanis
- [#439](https://github.com/actualbudget/actual/pull/439) docs: add netlify as sponsors to README — thanks @MatissJanis
- [#442](https://github.com/actualbudget/actual/pull/442) 🔥 removal of react-native mobile apps — thanks @MatissJanis
- [#443](https://github.com/actualbudget/actual/pull/443) ⬆️ upgrade prettier and fix new issues — thanks @MatissJanis

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

- [#218](https://github.com/actualbudget/actual/pull/218) Fix enter to create accounts — thanks @ezfe)
- [#266](https://github.com/actualbudget/actual/pull/266) RUpdate data-file-index.txt — thanks @j-f1
- [#272](https://github.com/actualbudget/actual/pull/272) a11y: update cleared state display for clarity — thanks @rickdoesdev
- [#273](https://github.com/actualbudget/actual/pull/273) Remove the hold for future months button — thanks @shall0pass
- [#385](https://github.com/actualbudget/actual/pull/385) feat: ability to add notes to accounts — thanks @MatissJanis
- [#386](https://github.com/actualbudget/actual/pull/386) Always pull in API package from workspace (fixes #378) — thanks @jlongster
- [#387](https://github.com/actualbudget/actual/pull/387) Remove 32bit limit on amounts — thanks @jlongster
- [#389](https://github.com/actualbudget/actual/pull/389) Add a help button to the menu — thanks @shall0pass
- [#394](https://github.com/actualbudget/actual/pull/389) fix(useSheetValue): default value should be null not undefined — thanks @MatissJanis
- [#396](https://github.com/actualbudget/actual/pull/396) Avoid pulling in the bundled app from API in backend — thanks @jlongster

### Actual Server

Version : 22.12.09

Builds with Actual 22.12.03 and API 4.1.5.

## 22.10.25

**Docker tag: 22.10.25**

:::warning
This release includes a breaking change to the sync component that requires manual migration. Ensure your budget is [backed up](./backup-restore/backup.md) before you update to avoid data loss.
:::

This release of Actual does not include any of the following

- Actual Electron Desktop Application
- iOS Application
- Android Application

### Actual

Version: 22.10.25

- [#1](https://github.com/actualbudget/actual/pull/1) Add fields to package.json — thanks @coliff
- [#3](https://github.com/actualbudget/actual/pull/3) Create .editorconfig — thanks @coliff
- [#7](https://github.com/actualbudget/actual/pull/7) Add missing comma in package.json — thanks @S3B4S
- [#20](https://github.com/actualbudget/actual/pull/20) add: tsconfig.json — thanks @wmertens
- [#25](https://github.com/actualbudget/actual/pull/25) Building for Windows — thanks @ejmurra
- [#46](https://github.com/actualbudget/actual/pull/46) Minor fixes to package.json file formatting — thanks @TomAFrench
- [#47](https://github.com/actualbudget/actual/pull/47) Add missing comma to jest.config.js — thanks @TomAFrench
- [#48](https://github.com/actualbudget/actual/pull/48) Remove some unnecessary files + add logs to gitignore — thanks @TomAFrench
- [#50](https://github.com/actualbudget/actual/pull/50) Migrate to yarn v3 — thanks @TomAFrench
- [#52](https://github.com/actualbudget/actual/pull/52) Remove unused imports — thanks @TomAFrench
- [#53](https://github.com/actualbudget/actual/pull/53) Remove unused patch for react-native-safe-area-view — thanks @TomAFrench
- [#54](https://github.com/actualbudget/actual/pull/54) Update importer packages package.json to point to monorepo — thanks @TomAFrench
- [#55](https://github.com/actualbudget/actual/pull/55) Lock packages to the versions for which patches have been made — thanks @TomAFrench
- [#59](https://github.com/actualbudget/actual/pull/59) Fix timestamp test suite — thanks @TomAFrench
- [#64](https://github.com/actualbudget/actual/pull/64) Group CRDT files into their own directory — thanks @TomAFrench
- [#65](https://github.com/actualbudget/actual/pull/65) Add documentation on how to build the protobuf — thanks @TomAFrench
- [#68](https://github.com/actualbudget/actual/pull/68) Route all imports of AQL code through an index.js file — thanks @TomAFrench
- [#69](https://github.com/actualbudget/actual/pull/69) Enforce sorting of contents of data-file-index.txt — thanks @TomAFrench
- [#70](https://github.com/actualbudget/actual/pull/70) Add linting job to CI — thanks @TomAFrench
- [#71](https://github.com/actualbudget/actual/pull/71) Add ability to import Actual files; enable export on desktop — thanks @jlongster
- [#72](https://github.com/actualbudget/actual/pull/72) Fix some errors caused by using bash syntax with sh shebang — thanks @TomAFrench
- [#73](https://github.com/actualbudget/actual/pull/73) Add a CI workflow to perform builds of api, web and electron packages — thanks @TomAFrench
- [#80](https://github.com/actualbudget/actual/pull/80) Improved yarn scripts in desktop-electron package — thanks @TomAFrench
- [#81](https://github.com/actualbudget/actual/pull/81) Remove unused yarn scripts — thanks @TomAFrench
- [#94](https://github.com/actualbudget/actual/pull/94) currency-formatter -> Intl.NumberFormat — thanks @trevdor
- [#95](https://github.com/actualbudget/actual/pull/95) Fix official node version to 16.15.0 — thanks @TomAFrench
- [#96](https://github.com/actualbudget/actual/pull/96) Fix yaml formatting in CI config — thanks @TomAFrench
- [#99](https://github.com/actualbudget/actual/pull/99) Dependency cleanup — thanks @TomAFrench
- [#102](https://github.com/actualbudget/actual/pull/102) Fix test failure due to non-integer weight values — thanks @TomAFrench
- [#104](https://github.com/actualbudget/actual/pull/104) Delete unused directory browser/build — thanks @TomAFrench
- [#107](https://github.com/actualbudget/actual/pull/107) Update downshift patch to match installed version — thanks @TomAFrench
- [#111](https://github.com/actualbudget/actual/pull/111) Remove holiday text from README — thanks @TomAFrench
- [#112](https://github.com/actualbudget/actual/pull/112) display version on settings page — thanks @PartyLich
- [#117](https://github.com/actualbudget/actual/pull/117) Fix: parse dates without a delimiter in CSV import — thanks @PartyLich
- [#124](https://github.com/actualbudget/actual/pull/124) fix: hitting enter after setting password redirects to demo page — thanks @andremralves
- [#129](https://github.com/actualbudget/actual/pull/129) Add action to mark new issues for triage — thanks @TomAFrench
- [#130](https://github.com/actualbudget/actual/pull/130) Enforce prettier rules — thanks @TomAFrench
- [#131](https://github.com/actualbudget/actual/pull/131) Silence warning for missing moment.js install — thanks @TomAFrench
- [#132](https://github.com/actualbudget/actual/pull/132) Replace jwl-dev-utils with react-dev-utils — thanks @TomAFrench
- [#135](https://github.com/actualbudget/actual/pull/135) Remove unused dependencies — thanks @TomAFrench
- [#137](https://github.com/actualbudget/actual/pull/137) Skip failing test suites — thanks @TomAFrench
- [#139](https://github.com/actualbudget/actual/pull/139) Remove unused rollup config and dependencies — thanks @TomAFrench
- [#163](https://github.com/actualbudget/actual/pull/163) Force react-error-overlay to 6.0.9 to fix error — thanks @jlongster
- [#164](https://github.com/actualbudget/actual/pull/164) build on windows — thanks @bdoherty
- [#202](https://github.com/actualbudget/actual/pull/202) Run tests on github actions — thanks @TomAFrench
- [#219](https://github.com/actualbudget/actual/pull/219) 199 Adding translation to schedules list — thanks @manuelcanepa
- [#203](https://github.com/actualbudget/actual/pull/203) Replace babel-jest with ts-jest — thanks @TomAFrench
- [#204](https://github.com/actualbudget/actual/pull/204) Use workspace ranges for monorepo dependencies — thanks @TomAFrench
- [#208](https://github.com/actualbudget/actual/pull/208) Bug Report Template & Issues Configuration — thanks @rich-howell
- [#213](https://github.com/actualbudget/actual/pull/213) Enforce linting in desktop-client — thanks @TomAFrench
- [#214](https://github.com/actualbudget/actual/pull/214) Fix adm-zip install failure — thanks @trevdor
- [#217](https://github.com/actualbudget/actual/pull/217) Remove unused imports and sort imports in desktop-client — thanks @TomAFrench
- [#222](https://github.com/actualbudget/actual/pull/222) Remove patch-package dependency from loot-design — thanks @TomAFrench
- [#224](https://github.com/actualbudget/actual/pull/224) Adding translation to rule editor and transaction table — thanks @manuelcanepa
- [#225](https://github.com/actualbudget/actual/pull/225) Implement localization for schedule descriptions — thanks @j-f1
- [#228](https://github.com/actualbudget/actual/pull/228) Add macOS to list of operating systems in the issue template — thanks @rich-howell
- [#229](https://github.com/actualbudget/actual/pull/229) Fix handling of -0 in budget summary — thanks @j-f1
- [#230](https://github.com/actualbudget/actual/pull/230) Revert change to make importers use the api bundle from inside the monorepo — thanks @TomAFrench
- [#234](https://github.com/actualbudget/actual/pull/234) Allow enter to create new transaction when focused on cleared column — thanks @ezfe
- [#232](https://github.com/actualbudget/actual/pull/232) Fix linter issues — thanks @TomAFrench
- [#233](https://github.com/actualbudget/actual/pull/233) Enforce linting in loot-design — thanks @TomAFrench
- [#237](https://github.com/actualbudget/actual/pull/237) Separate external, monorepo and internal imports — thanks @TomAFrench
- [#238](https://github.com/actualbudget/actual/pull/238) Sort import in alphabetical order — thanks @TomAFrench
- [#240](https://github.com/actualbudget/actual/pull/240) Fix CI to an exact node version — thanks @TomAFrench
- [#244](https://github.com/actualbudget/actual/pull/244) Remove dollar sign from close account modal — thanks @TomAFrench
- [#262](https://github.com/actualbudget/actual/pull/262) Render a schedule rule with the mapped payee id; fixes crash — thanks @jlongster

### Actual Server

Version: 22.10.25

- [#1](https://github.com/actualbudget/actual-server/pull/1) - Adjust Dockerfile to build successfully — thanks @Kovah
- [#2](https://github.com/actualbudget/actual-server/pull/2) - Instructions for running via Docker — thanks @ajtrichards
- [#6](https://github.com/actualbudget/actual-server/pull/6) - Add hostname binding — thanks @UnexomWid
- [#7](https://github.com/actualbudget/actual-server/pull/7) - added a basic docker-compose file — thanks @Kk-ships
- [#11](https://github.com/actualbudget/actual-server/pull/11) - Add Github Actions workflow to automatically build a Docker image — thanks @Kovah
- [#12](https://github.com/actualbudget/actual-server/pull/12) - Adjust Dockerfile to use multi-stage builds — thanks @Kovah
- [#13](https://github.com/actualbudget/actual-server/pull/13) - add: tsconfig.json — thanks @wmertens
- [#14](https://github.com/actualbudget/actual-server/pull/14) - Use Alpine Linux as base image for docker container — thanks @ldotlopez
- [#19](https://github.com/actualbudget/actual-server/pull/19) - Add GH Action workflow to publish Docker image — thanks @m3nu
- [#20](https://github.com/actualbudget/actual-server/pull/20) - Add one-click hosting option — thanks @m3nu
- [#21](https://github.com/actualbudget/actual-server/pull/21) - Health Check Endpoint — thanks @Silvenga
- [#22](https://github.com/actualbudget/actual-server/pull/22) - Add Dockerfile.alpine for alpine build add tini to debian image — thanks @brtwrst
- [#28](https://github.com/actualbudget/actual-server/pull/28) Transition to typescript — thanks @PartyLich
- [#31](https://github.com/actualbudget/actual-server/pull/31) Correct fly template port — thanks @ciwchris
- [#33](https://github.com/actualbudget/actual-server/pull/33) Add more appropriate linting setup — thanks @TomAFrench
- [#37](https://github.com/actualbudget/actual-server/pull/37) Add linter checks to CI — thanks @TomAFrench
- [#41](https://github.com/actualbudget/actual-server/pull/41) Check builds are successful on PRs/master — thanks @TomAFrench
- [#43](https://github.com/actualbudget/actual-server/pull/43) Enforce prettier rules — thanks @TomAFrench
- [#46](https://github.com/actualbudget/actual-server/pull/46) fix: error handling middleware signature — thanks @JazzaG
- [#50](https://github.com/actualbudget/actual-server/pull/50) Fix Cross-Origin issues to enable SharedArrayBuffer — thanks @jlongster
- [#51](https://github.com/actualbudget/actual-server/pull/51) Bump Actual to 4.1.0 — thanks @jlongster
- [#52](https://github.com/actualbudget/actual-server/pull/52) Fix 'Out of sync' error — thanks @7brend7
- [#64](https://github.com/actualbudget/actual-server/pull/64) build: add node GC argument to fly template — thanks @PartyLich
- [#65](https://github.com/actualbudget/actual-server/pull/65) build: add tini subreaper arg to fly template — thanks @PartyLich
- [#70](https://github.com/actualbudget/actual-server/pull/70) Update Express to version 4.17 — thanks @rich-howell
- [#72](https://github.com/actualbudget/actual-server/pull/72) Fix/download only necessary files — thanks @PartyLich
- [#75](https://github.com/actualbudget/actual-server/pull/75) Switch syncing to simple sync method — thanks @jlongster
- [#78](https://github.com/actualbudget/actual-server/pull/78) Respect configuration for user-files and don't init the app — thanks @jlongster
- [#81](https://github.com/actualbudget/actual-server/pull/81) Store user files as blobs instead of unzipping them — thanks @jlongster
- [#82](https://github.com/actualbudget/actual-server/pull/82) Build docker image on push to master or tag — thanks @trevdor
