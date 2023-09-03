# Release Notes

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
This release includes a breaking change to the sync component that requires manual migration ([migration guide](./migration/simple-sync.md)). Ensure your budget is [backed up](./backup-restore/backup.md) before you update to avoid data loss
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
