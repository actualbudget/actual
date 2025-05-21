# Community Projects


The following community projects are not maintained by the Actual Budget project but integrate with it.
They are for special use cases or for developing features that have not yet been integrated into Actual.

These and other projects can be discussed in the #community-projects channel on the Actual Discord server.

If you want your project listed here, notify people in the #documentation Discord channel. Before you can ask
for it to be added, your project must have a proper README file.

## Bank Export and Importers

The following are implementations of bank syncing using the Actual API. For instructions on using them, see the respective repositories.

* **Caju Brazil bank exporter to OFX** - https://github.com/Kasama/caju-actual-budget-importer
* **Credit Suisse, Cembra Money Bank, DKB, ZKB, and Interactive Brokers CVS import** - https://github.com/wirhabenzeit/actual-budget-cli
* **ICS Cards Holland CVS exporter** - https://github.com/IeuanK/ICS-Exporter/
* **ING bank CSV import** - https://github.com/jvmap/ActualBudgetTransformer
* **Monobank bank sync** - https://github.com/dnullproject/mono-to-actualbudget
* **My Edenred Portugal bank sync** - https://github.com/rodriguestiago0/myedenred-actual
* **Norwegian Trumf Visa PDF invoice to Actual Budget friendly CSV converter** - https://github.com/RubenOlsen/TrumfVisa2ActualBudget
* **Plaid bank sync** - https://github.com/youngcw/actualplaid



## Other Importers

Actual is used by some people to track money not necessarily found in bank accounts. This can be crypto currency
tracking, loyalty card paybacks, prepaid cards, etc.

* **Coinbase data puller** - https://github.com/SwadeDotExe/Coinbase-To-ActualBudget
  - *This script pulls data from a USD and BTC wallet in Coinbase and keeps a wallet in Actual Budget synchronized with this balance.*
* **Portuguese meal cards from My Edenred and Coverflex** - https://github.com/rodriguestiago0/actual-mealcards
  - *This script will track Portuguese prepaid meal cards from My Edenred and Coverflex providers*


## Budget Migration

Actual currently has official support for migrating budgets from YNAB4 and nYNAB. The following are available for migrating from other budget apps.

* **Mint.com** - https://github.com/youngcw/actual_mint_importer
* **MoneyMoney** - https://github.com/NikxDa/actual-moneymoney
* **Financier.io** - https://github.com/jat255/financier-to-actual
* **Quicken on Mac** - https://github.com/slimslickner/quicken-mac-to-actual-budget
* **Priotecs MoneyControl (Primoco)** - https://github.com/SimonMayerhofer/primoco-to-actual-migrator


## Various utilities to enhance Actual's functionality

* **Actual Tap** - https://github.com/bobokun/actualtap-py
   - *Provides an API to integrate tap-to-pay transactions on mobile devices with Actual Budget.*
* **Actual AI** - https://github.com/sakowicz/actual-ai
   - *Categorize transactions using AI.*
* **Actual Helpers** - https://github.com/psybers/actual-helpers
   - *Collection of helper scripts to track home prices and car values, add loan interest transactions, track investment accounts, etc.*
* **Actual Tasks** - https://github.com/rodriguestiago0/actual_task
   - *Two utilities to help fix payees and calculate mortgages.*
* **Easy category archive function** - https://github.com/rvisharma/actual-archive-category
   - *This tool moves transactions over to an _archive_ category, and then deletes the category.*
* **Actual Budget Backup** - https://github.com/rodriguestiago0/actualbudget-backup
   - *Tool which will back up Actual Budget and upload it to the configurable destination using the clone utility.*
* **Actual Budget Prometheus Exporter** - https://github.com/sakowicz/actual-budget-prometheus-exporter
   - *Prometheus metrics exporter and Grafana Dashboard.*
* **Actual Budget Auto Sync** - https://github.com/seriouslag/actual-auto-sync
   - *A background service that automatically syncs your Actual Budget accounts on a scheduled basis.*
* **Actual Userscripts** - https://github.com/pogman-code/actual-userscripts
   - *A collection of JavaScript/CSS Userscripts for Actual Budget.*


## Others

* **Amazon orders CSV exporter user script** - https://github.com/IeuanK/AmazonExporter/
   - *Allows you to capture your Amazon orders, then store them as CSV or JSON file*
* **Actual Budget CLI** - https://github.com/wirhabenzeit/actual-budget-cli
   - *CLI to interact with the Actual Budget API.*
* **Local REST API** - https://github.com/jhonderson/actual-http-api
   - *This is a bridging API between REST and the internal Actual APIs.*
* **Actual Python API** - https://github.com/bvanelli/actualpy
   - *API to interact with the Actual server, written in Python.*
* **Actual Budget Home Assistant Integration** - https://github.com/jlvcm/ha-actualbudget
   - *Home Assistant Integration with an Actual Budget server*
