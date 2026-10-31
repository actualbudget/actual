# Multi-currency

This example budget is for a family that has a Paris apartment they sublease to a brother-in-law and parents they visit in Mexico. The budget uses US dollars. BNP Paribas holds euros for the Paris rent and sublease receipts. BBVA México holds pesos for visits, gifts and remittances to the parents. The budget total stays in dollars. A foreign account shows its own currency. A saved exchange rate converts its transactions into dollars. Résidences Saint-Martin SARL, the landlord, and the family members in this example are fictional.

<ExperimentalFeatureWarning issueId="5191" />

## Turn on currency support

Open **Settings**, then **Experimental**. Turn on **Currency support**.

## Set the budget currency

With Currency support on, open **Settings**, then **General**. Under Currency, set **Default currency** to **USD - US Dollar ($)**. The Currency settings appear only while Currency support is on.

Actual recommends a backup before it changes the currency. Backup confirmation is optional. Choose **Continue** when precision stays the same. If precision changes, review the conversion and choose **Confirm precision change**.

That setting also updates the number format. You can change the symbol position and whether decimal places are shown on the same screen. If Currency support is turned off later, the Currency settings disappear. The saved currency and recorded precision stay intact, but amounts show no currency symbol. `FORMATCURRENCY` also omits the saved currency symbol; an explicit symbol argument in a formula still overrides its default.

<img width="656" alt="Currency settings with the default currency set to USD - US Dollar ($)" src="/img/budgeting/multi-currency-currency@2x.png" />

With Currency support on, the currency picker and symbols appear:

<img width="860" alt="Currency support on: USD settings and dollar account balances" src="/img/budgeting/currency-support-on.png" />

With Currency support off, the picker disappears and the same balances keep cents without dollar symbols:

<img width="860" alt="Currency support off: no Currency settings or dollar symbols, with cents preserved" src="/img/budgeting/currency-support-off.png" />

## Turn on multiple currencies

Back in **Settings**, **Experimental**, turn on **Multiple currencies**. It stays off until the budget has a default currency.

<img width="643" alt="Currency support and Multiple currencies turned on" src="/img/budgeting/multi-currency-experimental@2x.png" />

## The family example

The registers show five months of the family budget, from June through October 2026, with opening balances on May 31. Each month, BNP Paribas pays €950 to Résidences Saint-Martin SARL and receives €950 from Thomas Martin, the brother-in-law. The entries offset, leaving the opening €2,000 balance. Rent uses Paris rent, and the receipt uses Sublease income. The same history appears in the [FX impact report](#fx-impact-report).

<img width="860" alt="BNP Paribas with five months of Paris rent and matching sublease income, keeping a 2000 euro balance" src="/img/budgeting/family-bnp-history.png" />

Each month, BBVA México sends an 800 peso remittance to Elena García and a 150 peso gift to José García. Both use Family support. After five months, the 5,000 peso opening balance falls to 250 pesos.

<img width="860" alt="BBVA México with five months of remittances and gifts for Elena and José García, leaving 250 pesos" src="/img/budgeting/family-bbva-history.png" />

The workflow examples below use separate checkpoints so each calculation can be followed on its own.

## Save exchange rates

With Multiple currencies on, Settings has an **Exchange rates** page. The page is hidden when Multiple currencies is off.

The rate field takes dollars per 1 unit of the chosen currency, and the swap button turns it around. The page has a tab for each currency paired with the dollar. The BNP Paribas account and the BBVA México account open tabs **EUR to USD** and **MXN to USD**. **Add currency…** adds a tab for a currency that has no account yet.

The examples on this page treat 2026-10-31 as today. **Fetch missing daily rates automatically** is on, so once the accounts below exist, Actual fetches each day's market rate for euros and pesos. **Get missing rates** asks for any that are still missing. A day without a fetched rate can still use a manual fallback: set the date, enter the rate, and click **Save fallback**. A fallback applies to its own day only, and a fetched rate for the same day comes first. Saving a second fallback for the same currency and date says a fallback is already saved for that date and offers **Replace saved rate**.

**Rate in use today** names the rate that applies today. On the euro tab it reads "New transactions and valuations today use: fetched rate 1.11619968 from 2026-10-31 (exchange-api)." **Saved rates** on that tab lists the fetched euro rate as stored, 0.895897049531496 euros per dollar. **Save fallback** on that row loads it into the form, and **Remove** deletes it. The status line under **Get missing rates** reads "Exchange rates updated: 0 added, 0 not published, 0 failed." because **Add account** already fetched today's rates.

<img width="672" alt="Exchange rates with Get missing rates, automatic updates and the last update above the EUR to USD tab, which uses a fetched rate of 1.11619968 dollars per euro for 2026-10-31" src="/img/budgeting/multi-currency-rates@2x.png" />

**Export rates** on the euro tab wrote that currency's rates to a file and said: "Rates exported: 1. Invalid rates left out: 0." **Choose file** read a CSV with a euro fallback of 0.85 euros per dollar for 2026-10-15 and a peso fallback of 20 pesos per dollar for 2026-10-31. The preview showed **New: 2**. **Keep existing** stayed selected. An import never creates a fetched rate. The file columns are on the [Exchange rates](../experimental/exchange-rates.md) page.

<img width="672" alt="Export of one euro rate and an import preview with two new fallbacks" src="/img/budgeting/multi-currency-rate-history@2x.png" />

Opening the budget fetches any missing daily rates for its accounts in other currencies, and so do new accounts and transactions. No sync server is needed. The setting, the hosts and the status line are described on the [Exchange rates](../experimental/exchange-rates.md#automatic-updates) page.

## Create the accounts

**Add account** takes the starting balance in the account's own currency. It fetches today's rate when none is saved, then shows the dollar amount.

Create three accounts:

1. **Checking**, currency USD, starting balance 2500. This is everyday spending in dollars.
2. **BNP Paribas**, currency **EUR - Euro (€)**, balance 2000. The dialog says "$2,232.40 in the budget currency, at 1 EUR = 1.11619968 USD".
3. **BBVA México**, currency **MXN - Mexican Peso ($)**, balance 5000. At 1 MXN = 0.0532273 USD, that starting balance is $266.14.

<img width="550" alt="Add account for BNP Paribas in euros, with a 2000 euro balance shown as $2,232.40" src="/img/budgeting/multi-currency-add-account@2x.png" />

If no rate can be fetched for today, the dialog adds **Base amount** and says: "No exchange rate is saved for today. Enter the starting balance in the budget currency."

The BNP Paribas account then shows €2,000.00. Its register lists the starting balance as a 2,000.00 deposit. **All accounts** in the sidebar counts the $2,232.40 dollar amount. The peso account uses $, so its 5,000.00 peso balance looks like $5,000.00. That row is pesos. **All accounts** is dollars.

## Change the account's currency

Open the account menu and choose **Change currency…**. The dialog says: "BNP Paribas uses EUR. Every transaction in its history changes with it." Choose **USD - US Dollar ($)**.

**Keep the numbers** is selected. It says: "Each amount keeps its number in the new currency; budget amounts are recalculated at each date's rate." The preview says: "Transactions that change: 1." That row is the starting balance. Under it: "This change cannot be undone."

**Convert existing amounts** says: "Each budget amount stays the same; amounts in the new currency are calculated at each date's rate." The preview still counts 1 transaction. **Cancel** leaves the account in euros.

<img width="520" alt="Change currency for BNP Paribas, keeping the numbers and moving the account to US dollars" src="/img/budgeting/multi-currency-correction@2x.png" />

If another device added transactions in an earlier currency, the account shows how many use its previous currency, and **Repair…**. **Repair transactions** says another device added or edited transactions in the account using an earlier currency, and repair makes them use the current currency. **Convert existing amounts** is selected there. **Change currency…** is left out of the menu until those transactions are repaired. On a phone, the account menu has **Change currency…** as well.

## Enter a payment

Open the BNP Paribas account and click **Add New**. Enter the payee **Résidences Saint-Martin SARL** and a payment of 950.00. That amount is euros. **Add** saves it at today's fetched rate, -$1,060.39.

The new row stays open after the payment is saved. Click **Cancel** to close it.

**Convert to budget currency** opens when no rate applies to the date, such as a payment dated 11/15/2026, after today. It says "Rate unavailable. Enter a base amount or rate." Enter one of them, then click **Save**. It also opens with a manual fallback, so you can check that rate before saving.

<img width="512" alt="Convert to budget currency for a 950 euro rent payment on a day with no rate, asking for a base amount or rate" src="/img/budgeting/multi-currency-convert@2x.png" />

The account balance is then €1,050.00: the 2,000.00 starting balance minus the 950.00 rent. The register shows the payment as 950.00.

<img width="860" alt="BNP Paribas with a balance of €1,050.00, a 950.00 rent payment to Résidences Saint-Martin SARL, and a 2,000.00 starting balance" src="/img/budgeting/multi-currency-eur-register@2x.png" />

Hold the pointer over the 950.00 payment. It says: "Base: -1,060.39 USD. Effective rate: 1 EUR = 1.1162 USD."

On **All accounts** the same payment is shown in dollars. Hold the pointer over 1,060.39 and it says: "-950.00 EUR in BNP Paribas. Effective rate: 1 EUR = 1.1162 USD."

The row menu includes **Amount details**. For this rent, that opens **Edit foreign amount**.

## Current worth

Under the €1,050.00 balance, Actual shows what that balance is worth at the current rate, and the base amount it has recorded: "≈ $1,172.01 at the current rate (1 EUR = 1.1162 USD, exchange-api rate from 2026-10-31)." The next line is "Recorded base: $1,172.01."

<img width="860" alt="BNP Paribas at €1,050.00, with a current-rate estimate of $1,172.01 and a recorded base of $1,172.01" src="/img/budgeting/multi-currency-estimate@2x.png" />

**All accounts** adds a line under the total: "≈ $3,938.15 at current rates." Hold the pointer over the BNP Paribas balance in the sidebar and it shows the same two lines. On a phone, the account list shows only the first line. **On budget** says "≈ $3,938.15 at current rates." Under BNP Paribas the line is the euro estimate above. Under BBVA México it says "≈ $266.14 at the current rate (1 MXN = 0.0532273 USD, exchange-api rate from 2026-10-31)."

## Balance chart

Open the BBVA México account menu and choose **Show balance chart**. This uses the five-month family history. The filled area charts the recorded dollar balance, and the blue line charts the native peso balance. Hold the pointer over a month to read both amounts. October 2026 shows $20.25 recorded in dollars and MX$250.00 held in pesos, after five monthly remittances and gifts. The dollar amount is the stored booked balance, rather than the current market estimate shown above the chart. The curves use different scales, so compare their direction and hover values. The menu item then says **Hide balance chart**. An account in dollars charts only its dollar balance.

<img width="1040" alt="BBVA México balance history with five months of remittances and gifts, showing October booked balance $20.25 and native balance 250 pesos" src="/img/budgeting/family-bbva-balance-history.png" />

## Change a saved amount

Click the 950.00 rent payment and change it to 1,000.00. **Edit foreign amount** opens with -1,000.00. The line under it is "-$1,116.20 at 1 EUR = 1.11619968 USD (fetched, exchange-api, 2026-10-31)". Leave **Base amount** and the rate empty to use that amount, then click **Save**. The payment is 1,000.00. BNP Paribas is €1,000.00. **All accounts** is $3,882.34.

<img width="512" alt="Edit foreign amount for a 1,000.00 euro rent payment, shown as -$1,116.20 at 1 EUR = 1.11619968 USD" src="/img/budgeting/multi-currency-edit@2x.png" />

A transfer between two euro accounts uses this dialog too. It adds: "The other account of this transfer changes to match."

Click the 1,000.00 deposit from Checking and change the amount. The transfer fields open directly below the transaction being edited. **Received in BNP Paribas** is 1,000.00. Use the row's usual Date and Notes cells to edit those fields. **Sent from Checking** is 1,116.20 USD, and the rate field shows 1 EUR = 1.1162 USD. Change the amounts here and click **Save**.

<img width="860" alt="Transfer fields below the deposit in the BNP Paribas register, with 1,000.00 euros received and 1,116.20 dollars sent from Checking" src="/img/budgeting/multi-currency-exchange-edit@2x.png" />

On a phone, edit Date and Notes on the transaction screen. **Edit amount** opens **Edit transfer** for the amounts, rate and fee.

## Split a payment

On the rent row, open the category menu and choose **Split Transaction**. On desktop, the existing transaction table opens two split rows under the -1,000.00 euro total. Enter payments of 800 for rent and 200 for fees. Incomplete edits stay local until the parts add up to the total and you choose **Save splits**. **Cancel split edits** restores the stored family. Conversion and save controls appear directly below the edited total. An unchanged total keeps its recorded dollar valuation; a changed or zero total needs a budget amount or rate. On a phone, Split opens the split page. Its total, base amount and rate stay above the child allocations. Transfers cannot be split.

<img width="560" alt="Split transaction for a 1,000.00 euro total, with -800 for rent and -200 for fees" src="/img/budgeting/multi-currency-split@2x.png" />

## Move a payment to another account

Open **All accounts**. On the rent row, change the account to **Checking**. Accounts in another currency are listed under **Other currencies**.

**Move to Checking** says: "Now -950.00 EUR in BNP Paribas (-$1,060.39)." **Amount (USD)** is empty. Leave it empty to keep the dollar amount. The line under the field is: "Base amount after the move: -$1,060.39."

Type 1000 to record the amount Checking shows. The line changes to -$1,000.00. October already has money budgeted, so the dialog says: "This changes the budget for October 2026: Paris rent spending $60.39." Click **Move**.

<img width="512" alt="Move to Checking for the 950.00 euro rent, recorded as 1000 dollars, with a budget warning for October 2026" src="/img/budgeting/multi-currency-move@2x.png" />

The rent is then a 1,000.00 payment in Checking. Checking is $1,500.00. BNP Paribas is €2,000.00 again. **All accounts** is $3,998.54.

A payment that came from a schedule is unlinked when the new account uses another currency. The dialog says: "This transaction will no longer be linked to its schedule."

**Edit foreign amount**, **Split transaction**, and the transfer fields show the same budget warning when a dollar amount changes a month that already has money budgeted. On a phone, changing the account opens **Move to Checking**.

## Schedule a payment

Open **Schedules** and click **Add new schedule**. Name it **Paris rent**. Choose the payee **Résidences Saint-Martin SARL** and the account **BNP Paribas**. The amount is then in euros. Enter 950.00. The field shows -€950.00. Set the date to repeat every month.

<img width="694" alt="Schedule for Résidences Saint-Martin SARL in BNP Paribas, with an amount of -€950.00 repeating every month on the 31st" src="/img/budgeting/multi-currency-schedule@2x.png" />

On the scheduled date, Actual posts the payment and converts it with the rate for that date, here the rate fetched for 2026-10-31. 950.00 euros becomes $1,060.39 at 1 EUR = 1.1162 USD.

If that date has no rate, the payment stays unposted. Actual says that some scheduled transactions were not posted, then gives the schedule name, the date, and that no rate exists for that currency. Post the schedule from the Schedules page to enter a rate or the amounts. For this rent, that opens **Convert to budget currency**. Enter a rate or a base amount, then save. Nothing is posted until then.

A remittance from BBVA México works the same way. 8000.00 pesos posts as $425.82 at 1 MXN = 0.0532273 USD.

A schedule stays in the currency of the account it was created for. To use an account in another currency, create a new schedule. The form says: "To use an account in another currency, create a new schedule."

## Link an existing exchange transfer

In **All accounts**, select the payment and deposit, then choose **Make transfer**. The two amounts in the budget currency must be equal and opposite. Actual keeps both recorded amounts in each account.

## Move euros between accounts

Create **Crédit Agricole** with a starting balance of 3,000.00. That is $3,348.60 at the day's fetched rate. Open Crédit Agricole and click **Add New**. In the payee field, choose **Make transfer**, then **BNP Paribas**. Enter a payment of 500.00. **Add** saves it at the same rate, -$558.10.

Crédit Agricole is then €2,500.00. BNP Paribas receives a 500.00 deposit from Crédit Agricole. With the 2,000.00 starting balance and no other payments, the BNP Paribas balance is €2,500.00. **All accounts** does not change, because the dollars move with the euros.

<img width="860" alt="BNP Paribas at €2,500.00 after a 500.00 deposit from Crédit Agricole, with the 2,000.00 starting balance" src="/img/budgeting/multi-currency-transfer@2x.png" />

Choosing Checking or BBVA México from a euro account uses the exchange fields below, not **Convert to budget currency**.

## Transfer between currencies

Open **BNP Paribas** and click **Add New**. In the payee field, choose **Make transfer**, then **Checking**. Enter a deposit of 1,000.00.

The row shows the other side under the transaction. **Sent from Checking** is 1,116.20 USD. **Rate** shows 1 EUR = 1.1162 USD, the day's fetched rate. **Fee** is empty. The gray amount and rate are estimates until you type over them. Click **Add transfer**.

<img width="860" alt="A 1,000.00 euro deposit into BNP Paribas from Checking, estimated as 1,116.20 dollars at 1 EUR = 1.1162 USD" src="/img/budgeting/multi-currency-exchange@2x.png" />

BNP Paribas is then €3,000.00. The deposit row shows Checking, then $1,116.20. Checking is $1,383.80. **All accounts** stays $4,998.54.

Hold the pointer over $1,116.20. It says: "1,116.20 USD left Checking." The next line is the rate this transfer used: "Rate of this transfer: 1 EUR = 1.1162 USD." Under that is the exchange rate for the date: "Exchange rate on 10/31/2026: 1 EUR = 1.1162 USD." When that date has no rate, the last line says: "No exchange rate saved for 10/31/2026."

<img width="340" alt="Hover on the 1,116.20 dollar side of the BNP Paribas transfer: 1,116.20 USD left Checking, at 1 EUR = 1.1162 USD" src="/img/budgeting/multi-currency-rate-hover@2x.png" />

A fee is optional. Choose EUR or USD next to **Fee**. The fee has to be smaller than the amount transferred, or Actual says: "The fee must be smaller than the amount transferred."

A payment of 100.00 from BNP Paribas to BBVA México uses the same row. Both accounts are in currencies other than the dollar, so saved endpoint rates supply the dollar valuation. There is no editable budget-value field; saving requires a valid saved valuation. The estimate is 2,097.04 pesos received and 111.62 dollars. The rate field shows 1 EUR = 20.9704204516 MXN.

## Schedule a transfer

The payee list on a new schedule includes transfers. Open **Schedules** and click **Add new schedule**. Name it **Fund BNP Paribas**. In the payee field, under **Transfer To/From**, choose **Checking**. Choose the account **BNP Paribas**. The amount is in euros. Switch it to a deposit and enter 1,000.00. The field shows +€1,000.00. The date repeats every month on the 31st.

<img width="694" alt="Schedule Fund BNP Paribas, a monthly deposit of +€1,000.00 from Checking into BNP Paribas" src="/img/budgeting/multi-currency-schedule-exchange@2x.png" />

On 10/31/2026, Actual posts both sides at that day's fetched rate. BNP Paribas receives €1,000.00 and is €3,000.00. Checking sends $1,116.20 and is $1,383.80. **All accounts** stays $4,998.54.

If that date has no rate, the transfer stays unposted. Post it from the Schedules page. The dialog is **Post scheduled transfer**, with the same amount, rate, and fee fields as a transfer in the register. Nothing is posted until you click **Add transfer**. If you enter a fee there, type the other amount as well. Actual asks for the amount received or the amount sent, and it does not estimate that side once a fee is set.

## Import onto a scheduled transfer

A file can update that transfer instead of adding a second one. With **Fund BNP Paribas** already posted, open BNP Paribas and click **Import**. Choose a CSV for 10/31/2026 whose amount is 980.00 euros. Leave **Merge with existing transactions** on. The file date has to fall within a week of the transfer, and the amount has to be close to the schedule. This schedule is approximately €1,000.00, and a file amount within 7.5% of that matches.

The preview shows €980.00 from the file and the existing €1,000.00 under it.

<img width="800" alt="Import preview matching a 980.00 euro file row to the existing 1,000.00 euro transfer from Checking" src="/img/budgeting/multi-currency-import-exchange@2x.png" />

**Import** replaces the estimate. The deposit is then 980.00, and the row still shows $1,116.20 from Checking. BNP Paribas is €2,980.00. Checking stays $1,383.80. **All accounts** stays $4,998.54.

A transfer posted with a fee is left as entered. A reconciled transfer is left alone. A bank download that matches the transfer updates it the same way.

## On a phone

A narrow window uses the phone layout. The BBVA México account below uses the same five-month history as the desktop register and FX report. Its balance is 250 pesos, with the monthly 800 peso remittances and 150 peso gifts grouped by date. The **+** button adds a payment and opens **Convert to budget currency**.

<img width="390" alt="Phone view of BBVA México with a 250 peso balance and remittances and gifts grouped by month from June through October" src="/img/budgeting/family-bbva-mobile-history.png" />

The payment detail below returns to the separate BNP Paribas rent-entry checkpoint. Open the rent payment. The amount is -€950.00, with -$1,060.39 under it and "Effective rate: 1 EUR = 1.1162 USD." **Edit amount** opens **Edit foreign amount**. **Split** opens the **Split transaction** page. If the screen has other unsaved changes, save them first. Actual says: "Save your other changes before editing the amount."

<img width="390" alt="Phone transaction for Résidences Saint-Martin SARL showing -€950.00, -$1,060.39, and Edit amount" src="/img/budgeting/multi-currency-mobile-payment@2x.png" />

## Export the euro amount

Export the transactions to CSV. The file adds **Currency** and **Native amount**. The rent row has Currency EUR, Native amount -950, and Amount -1060.39. Rows in Checking leave Currency and Native amount empty. A split writes 0 as the parent's Native amount and puts the euro total in **Split_Native_Amount**. Each part keeps its own Native amount.

To import that file into BNP Paribas, set the amount column to **Native amount**. Actual reads those values as euros and converts each one at the rate for its date.

## Import a file

Open the BNP Paribas account and click **Import**. Choose a CSV, QIF, OFX, QFX, or CAMT file whose amounts are already in euros. Leave **Multiply amount** off. That option scales the numbers in the file, and this account reads them as euros.

The preview shows -€950.00 for the October 31 rent, with -$1,060.39 under it, converted at the rate fetched for that date. Press **Import**.

<img width="860" alt="Import preview of a 950 euro rent payment to Résidences Saint-Martin SARL, with -$1,060.39 under the euro amount" src="/img/budgeting/multi-currency-import@2x.png" />

A CSV can also name the currency of each row. Set **Currency** to that column. Rows marked EUR stay in the preview, and a blank currency is read as euros. A file with the October 31 rent, a €5.00 cafe payment with no currency, and a 1,500.00 peso row keeps the first two. The rent is -€950.00, with -$1,060.39 under it. The cafe payment is -€5.00, with -$5.58 under it. The peso row is listed under "Rows left out because of their currency:" as "10/31/2026 · Elena García · -1500.00 Currency MXN does not match this account's EUR." **Import** offers **Import 2 transactions**.

<img width="860" alt="CSV import into BNP Paribas with the Currency column set, keeping the euro rows and leaving out a peso row" src="/img/budgeting/multi-currency-csv-currency@2x.png" />

Automatic updates cover the days of each account's history. A file row dated before the account's first transaction has none, so the dialog asks. If a date in the file has no rate, the dialog says: "No exchange rate is available for 2026-10-30. Enter a rate to use for these days in this operation only." The rate field takes dollars per 1 euro, with a swap button for the reverse. **Use rate** converts those rows for this import. Actual does not save it as a fallback, so a later import on that day asks again.

<img width="860" alt="Import dialog asking for a euro rate for 2026-10-30 in this import only, with two 950 euro rent rows" src="/img/budgeting/multi-currency-import-rate@2x.png" />

## Link a bank account

With **Currency support** and **Multiple currencies** enabled, GoCardless, SimpleFIN, Pluggy.ai, Akahu and Enable Banking use the currency reported for each bank account. The link dialog formats the reported balance in that currency.

Choose a new on-budget or off-budget account in the link dialog to create it in the bank account's currency automatically. For example, linking a euro account creates an account in EUR, and linking a peso account creates one in MXN. Actual also records the currency's decimal precision, so a JPY account uses whole yen and a KWD account uses three decimal places. Imported transactions retain their native amounts alongside their booked value in the budget currency.

To link an existing account, its currency must match. A bank account in euros can be linked to BNP Paribas, and a bank account in pesos can be linked to BBVA México. The list offers compatible accounts only; Actual also checks the currency when saving the link. Later syncs do not change an existing account's currency.

If the provider does not report a usable currency, Actual offers the budget-currency account flow instead of guessing a foreign currency. An unsupported foreign currency cannot create a new foreign account. With Multiple currencies turned off, bank linking keeps the existing budget-currency behavior.

If the first link needs a missing exchange rate or starting balance, Actual asks for it before creating the account or importing any transactions. A rate entered there converts that link only.

If the bank does not report a balance in that currency, the link dialog says: "The bank did not report a balance in this account's currency. Enter the balance on the starting date, then try again."

Downloaded transactions in some other currency are left out. Actual reports the count: "downloaded transactions were in another currency and were skipped."

If a download needs a rate that is not saved, Actual says: "An exchange rate is needed before these transactions can be added." **Add exchange rate** opens the same form as import, naming each day without a rate. The rate field takes budget-currency units per 1 account-currency unit. **Use rate** downloads again with that rate for those days. Actual does not save it as a fallback.

## FX changes in To Budget

This section uses a separate checkpoint: Checking, BNP Paribas and BBVA México opened on September 30 with the same starting balances, and nothing else. Payments stay booked at the rate in use when you enter them, and they change the FX total.

The starting balances are booked at the rates fetched for September 30: $2,266.46 for the euros at 1 EUR = 1.1332297 USD, and $276.66 for the pesos at 1 MXN = 0.0553323599703537 USD. By October 31 both currencies are worth less. The register keeps the booked amounts. The account list estimates BNP Paribas at $2,232.40 and BBVA México at $266.14, at the rates fetched for October 31.

On the **Budget** page for October, **FX changes (included)** is -$44.58. **To Budget** is $4,998.54. That is the booked $5,043.12 plus the -$44.58. November lists FX changes of $0.00, and its To Budget stays $4,998.54.

**FX details** opens **FX valuation details for October 2026**. The monthly FX change is -$44.58. The dialog says: "FX changes are already included in To Budget." A separate included total appears only when it differs from the monthly figure.

The calculated valuation is opening valuation $2,543.12, transaction activity $0.00, monthly FX changes -$44.58, brought-forward FX $0.00, and closing valuation $2,498.54.

**Reserved in other currencies** is $0.00. Assigned this month is $0.00, and spending, resets and revaluation are $0.00. Nothing is set aside in euros or pesos, so To Budget does not change. The Budget summary adds **Reserved in other currencies** only when that amount is not zero, or when the reservation is incomplete.

BNP Paribas opens at $2,266.46 and closes at $2,232.40. Its monthly FX change is -$34.06. The closing formula for 10/31/2026 is 1 EUR = 1.11619968 USD. BBVA México opens at $276.66 and closes at $266.14, so its FX change is -$10.52. Its closing formula is 1 MXN = 0.0532273390787558 USD.

<img width="620" alt="FX valuation details for October 2026, with -$44.58 included in To Budget and $0.00 reserved in other currencies" src="/img/budgeting/multi-currency-fx-details@2x.png" />

## FX impact report

Hover over or focus a rate formula to see its kind, source, effective timestamp and fallback details.

Open **Reports** and choose **FX impact**. Select June through October 2026. Leave **Accounts** and **Currencies** on all accounts and currencies for this example.

This extends the same example budget for a family that has a Paris apartment they sublease to a brother-in-law and parents they visit in Mexico. It uses Checking, BNP Paribas and BBVA México, with the same landlord and family payees as above. It is a separate checkpoint from the examples above.

The history starts on May 31 with $2,500 in Checking, €2,000 in BNP Paribas and MX$5,000 in BBVA México. At each month-end from June through October, BNP Paribas pays €950 to Résidences Saint-Martin SARL and receives €950 from Thomas Martin as sublease income. BBVA México pays MX$800 to Elena García as a remittance and MX$150 to José García as a gift. October ends with €2,000 and MX$250 in the foreign accounts.

### Fetch historical market rates

Create the accounts with their May 31 opening balances. Automatic updates then fetch every day of euro and peso history from May 31 through today from the built-in **exchange-api** provider, and **Get missing rates** in **Settings → Exchange rates** asks for any that are still missing. Let that finish before entering the transactions. See [Fetched rates](../experimental/exchange-rates.md#fetched-rates) for the hosts and what they see. These screenshots use real fetched rates, like the rest of this page. Each payment is booked using its transaction-date rate.

The provider's dates identify its daily snapshots. These market rates may differ from a bank's executed exchange rate. Fetching rates does not rewrite the base amounts of posted payments.

### Read the report

Positive amounts are gains. **Realized** records FX recognized when foreign holdings are spent. **Unrealized change** records the movement in the value still held. **Closing unrealized** is the remaining unrealized balance at month-end, rather than another amount to add to that month's change. Fee expense is a booked cost. This history has no exchange transfers or fees, so **Transfer carry**, **Internal settlement** and fee columns are zero.

<img width="1040" alt="FX impact report for June through October 2026, showing EUR and MXN gains and losses for the family budget" src="/img/budgeting/multi-currency-fx-impact-history.png" />

The **Selected total** combines the selected accounts and currencies. All figures below are in USD:

| Month     | Realized | Unrealized change | Total change | Closing unrealized |
| --------- | -------: | ----------------: | -----------: | -----------------: |
| June      |  -$25.21 |           -$29.32 |      -$54.53 |            -$29.32 |
| July      |   -$1.70 |           +$25.75 |      +$24.05 |             -$3.57 |
| August    |   +$5.13 |           +$14.52 |      +$19.65 |            +$10.95 |
| September |  -$16.09 |           -$42.97 |      -$59.06 |            -$32.02 |
| October   |  -$24.60 |           -$11.99 |      -$36.59 |            -$44.01 |

For October, euros contribute -$34.06 and pesos -$2.53, making the selected total -$36.59. Expand **Accounts** beneath a month to see BNP Paribas or BBVA México and the closing rate used. The October 31 rates are 1 EUR = 1.11619968 USD and 1 MXN = 0.0532273390787558 USD.

### Reconcile with the budget and export

The final table, **FX changes included in To Budget**, shows amounts already included in available funds. Do not add them again. Each month in this example is **Up to date** and matches the selected total above. Brought forward and **Reserved in other currencies** are $0.00 because the example has no currency reservations.

<img width="1040" alt="Selected FX totals and FX changes already included in To Budget for June through October, with every month up to date" src="/img/budgeting/multi-currency-fx-included-history.png" />

Choose **Export as CSV** to download the same date range and filters, with account rows, currency totals, rate dates and sources, and budget reconciliation details. For October, BNP Paribas closes with native 2000.00 and booked 2331.94. BBVA México closes with native 250.00 and booked 20.25. Both closing rates are fetched snapshots from October 31, sourced from `plugin:exchange-api`. The CSV retains full rate precision for checking the displayed amounts.

## Add a currency to a category

On the **Budget** page, right-click **Food** and choose **Add currency…**. Choose **EUR - Euro (€)**. The dialog says: "Every device that edits this budget needs an up-to-date version of Actual."

<img width="540" alt="Add currency to Food, with EUR - Euro (€) selected" src="/img/budgeting/multi-currency-add-currency@2x.png" />

**Add currency** puts a **EUR** row under Food. Click its **Budgeted** cell and enter 100. Food and **Usual Expenses** then show $111.62 budgeted and $111.62 balance. The euro budgeted cell shows 100, spent is €0.00, and the balance is €100.00.

<img width="700" alt="Food budgeted at $111.62, with the EUR row budgeted at 100 and a balance of €100.00" src="/img/budgeting/multi-currency-pocket-rows@2x.png" />

October lists **Reserved in other currencies** as -$111.62. **To Budget** is $4,886.92. Available funds stays $4,998.54, and **FX changes (included)** stays -$44.58.

The euro balance opens **Food: EUR**. Budgeted is €100.00, spent is €0.00, and the balance is €100.00. Value is $111.62. Assigned in the budget currency is $111.62, and the FX contribution is $0.00. It says **Market rate** and "Rate on 2026-10-31: 1 EUR = 1.11619968 USD". Reserved is €100.00. Held is €2,000.00, the balance of BNP Paribas.

**Edit EUR budget** shows **Budgeted (EUR)** and **Save budget**. **Turn rollover on** is beside it. **Transfer EUR** takes an **Amount (EUR)** and **To**. The first choice is **To Budget**.

<img width="512" alt="Food: EUR with €100.00 budgeted, $111.62 value, rollover, and a transfer back to To Budget" src="/img/budgeting/multi-currency-pocket-details@2x.png" />

**Delete EUR** shows **Move its history to**, set to **No category**. The list is No category, General, Bills, Bills (Flexible), and Savings. The button is **Delete currency**. **Delete base budget** shows the same list, and its button is **Delete base budget**. **Hide currency** is below those forms.

<img width="512" alt="Delete EUR and Delete base budget, each set to No category, with Hide currency below" src="/img/budgeting/multi-currency-pocket-delete@2x.png" />

Select the starting balance in BNP Paribas and open **1 transaction**. The menu includes **Route to currency pockets** and **Route to currency pockets in category…**.

<img width="182" alt="Transaction menu including Route to currency pockets and Route to currency pockets in category" src="/img/budgeting/multi-currency-route-pockets@2x.png" />

On a phone, tap **Food**. The menu includes **Add currency**, and the euro budgeted amount is in the list.
