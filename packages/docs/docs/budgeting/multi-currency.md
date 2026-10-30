# Multi-currency

This example budget is for a family that has a Paris apartment they sublease to a brother-in-law and parents they visit in Mexico. The budget uses US dollars. BNP Paribas holds euros for the Paris rent and sublease receipts. BBVA México holds pesos for visits, gifts and remittances to the parents. The budget total stays in dollars. A foreign account shows its own currency. A saved exchange rate converts its transactions into dollars. Résidences Saint-Martin SARL, the landlord, and the family members in this example are fictional.

<ExperimentalFeatureWarning issueId="5191" />

## Turn on currency support

Open **Settings**, then **Experimental**. Turn on **Currency support**.

## Set the budget currency

With Currency support on, open **Settings**, then **General**. Under Currency, set **Default currency** to **USD - US Dollar ($)**. The Currency settings appear only while Currency support is on.

Actual recommends a backup before it changes the currency. Backup confirmation is optional. Choose **Continue**.

That setting also updates the number format. You can change the symbol position and whether decimal places are shown on the same screen. If Currency support is turned off later, amounts keep the currency's decimal places but show no currency symbol.

<img width="656" alt="Currency settings with the default currency set to USD - US Dollar ($)" src="/img/budgeting/multi-currency-currency@2x.png" />

## Turn on multiple currencies

Back in **Settings**, **Experimental**, turn on **Multiple currencies**. It stays off until the budget has a default currency.

<img width="643" alt="Currency support and Multiple currencies turned on" src="/img/budgeting/multi-currency-experimental@2x.png" />

## The family example

The registers show five months of the family budget, from June through October 2026, with opening balances on May 31. Each month, BNP Paribas pays €950 to Résidences Saint-Martin SARL and receives €950 from Thomas Martin, the brother-in-law. The entries offset, leaving the opening €2,000 balance. Rent uses Paris rent, and the receipt uses Sublease income.

<img width="860" alt="BNP Paribas with five months of Paris rent and matching sublease income, keeping a 2000 euro balance" src="/img/budgeting/family-bnp-history.png" />

Each month, BBVA México sends an 800 peso remittance to Elena García and a 150 peso gift to José García. Both use Family support. After five months, the 5,000 peso opening balance falls to 250 pesos.

<img width="860" alt="BBVA México with five months of remittances and gifts for Elena and José García, leaving 250 pesos" src="/img/budgeting/family-bbva-history.png" />

The workflow examples below use separate checkpoints so each calculation can be followed on its own.

## Save exchange rates

With Multiple currencies on, **General** shows **Exchange rates** under the currency block.

The rate field takes dollars per 1 unit of the chosen currency, and the swap button turns it around. In this example, 1 euro is 1.10 dollars, and 1 peso is 0.05 dollars.

Choose the currency, set the date, enter the rate, and click **Save fallback**. A fallback applies to its own day only. The examples on this page treat 2026-10-31 as today, and both fallbacks are saved for that day. Saving a second rate for the same currency and date says a fallback is already saved for that date and offers **Replace saved rate**.

**Rate in use today** names the rate that applies today. For pesos it reads "New transactions and valuations today use: manual fallback 0.05 for 2026-10-31." **Saved rates** lists each fallback as stored, in units per 1 dollar: 0.909090909090909 euros and 20 pesos. **Edit** loads a saved row back into the form. **Remove** deletes it.

<img width="672" alt="Exchange rates with fallbacks of 1.10 dollars per euro and 0.05 dollars per peso for 2026-10-31" src="/img/budgeting/multi-currency-rates@2x.png" />

## Create the accounts

**Add account** takes the starting balance in the account's own currency. When a rate is saved for today, the dialog shows the dollar amount.

Create three accounts:

1. **Checking**, currency USD, starting balance 2500. This is everyday spending in dollars.
2. **BNP Paribas**, currency **EUR - Euro (€)**, balance 2000. The dialog says "$2,200.00 in the budget currency, at 1 EUR = 1.1 USD".
3. **BBVA México**, currency **MXN - Mexican Peso ($)**, balance 5000. At 1 MXN = 0.05 USD, that starting balance is $250.00.

<img width="550" alt="Add account for BNP Paribas in euros, with a 2000 euro balance shown as $2,200.00" src="/img/budgeting/multi-currency-add-account@2x.png" />

If no rate is saved for today, the dialog adds **Base amount** and says: "No exchange rate is saved for today. Enter the starting balance in the budget currency."

The BNP Paribas account then shows €2,000.00. Its register lists the starting balance as a 2,000.00 deposit. **All accounts** in the sidebar counts the $2,200.00 dollar amount. The peso account uses $, so its 5,000.00 peso balance looks like $5,000.00. That row is pesos. **All accounts** is dollars.

## Enter a payment

Open the BNP Paribas account and click **Add New**. Enter the payee **Résidences Saint-Martin SARL** and a payment of 950.00. That amount is euros. **Add** opens **Convert to budget currency**.

The dialog shows -€950.00, then "-$1,045.00 at 1 EUR = 1.1 USD (fallback, manual, 2026-10-31)". The rate field starts with that day's fallback, 1.1. Leave **Base amount** empty and the rate as it is, then click **Save**.

The new row stays open after the payment is saved. Click **Cancel** to close it.

<img width="512" alt="Convert to budget currency for a 950 euro rent payment, shown as -$1,045.00 at 1 EUR = 1.1 USD" src="/img/budgeting/multi-currency-convert@2x.png" />

The account balance is then €1,050.00: the 2,000.00 starting balance minus the 950.00 rent. The register shows the payment as 950.00.

<img width="860" alt="BNP Paribas with a balance of €1,050.00, a 950.00 rent payment to Résidences Saint-Martin SARL, and a 2,000.00 starting balance" src="/img/budgeting/multi-currency-eur-register@2x.png" />

## Change a saved amount

Click the 950.00 rent payment and change it to 1,000.00. **Edit foreign amount** opens with -1,000.00. The line under it is "-$1,100.00 at 1 EUR = 1.1 USD (fallback, manual, 2026-10-31)", and the rate field starts at 1.1. Leave **Base amount** empty and the rate as it is, then click **Save**. The payment is 1,000.00. BNP Paribas is €1,000.00. **All accounts** is $3,850.00.

<img width="512" alt="Edit foreign amount for a 1,000.00 euro rent payment, shown as -$1,100.00 at 1 EUR = 1.1 USD" src="/img/budgeting/multi-currency-edit@2x.png" />

A transfer between two euro accounts uses this dialog too. It adds: "The other account of this transfer changes to match."

Click the 1,000.00 deposit from Checking and change the amount. The transfer fields open directly below the transaction being edited. **Received in BNP Paribas** is 1,000.00. Use the row's usual Date and Notes cells to edit those fields. **Sent from Checking** is 1,100.00 USD, and the rate field shows 1 EUR = 1.1 USD. Change the amounts here and click **Save**.

<img width="860" alt="Transfer fields above the BNP Paribas register, with 1,000.00 euros received and 1,100.00 dollars sent from Checking" src="/img/budgeting/multi-currency-exchange-edit@2x.png" />

On a phone, edit Date and Notes on the transaction screen. **Edit amount** opens **Edit transfer** for the amounts, rate and fee.

## Split a payment

On the rent row, open the category menu and choose **Split Transaction**. On desktop, the existing transaction table opens two split rows under the -1,000.00 euro total. Enter payments of 800 for rent and 200 for fees. Incomplete edits stay local until the parts add up to the total and you choose **Save splits**. **Cancel split edits** restores the stored family. Conversion and save controls appear directly below the edited total. An unchanged total keeps its recorded dollar valuation; a changed or zero total needs a budget amount or rate. On a phone, Split opens the split page. Its total, base amount and rate stay above the child allocations. Transfers cannot be split.

<img width="560" alt="Split transaction for a 1,000.00 euro total, with -800 for rent and -200 for fees" src="/img/budgeting/multi-currency-split@2x.png" />

## Move a payment to another account

Open **All accounts**. On the rent row, change the account to **Checking**. Accounts in another currency are listed under **Other currencies**.

**Move to Checking** says: "Now -950.00 EUR in BNP Paribas (-$1,045.00)." **Amount (USD)** is empty, and its placeholder is 1,045.00. Leave it empty to keep the dollar amount. The line under the field is: "Base amount after the move: -$1,045.00."

Type 1000 to record the amount Checking shows. The line changes to -$1,000.00. October already has money budgeted, so the dialog says: "This changes the budget for October 2026: uncategorized $45.00." Click **Move**.

<img width="512" alt="Move to Checking for the 950.00 euro rent, recorded as 1000 dollars, with a budget warning for October 2026" src="/img/budgeting/multi-currency-move@2x.png" />

The rent is then a 1,000.00 payment in Checking. Checking is $1,500.00. BNP Paribas is €2,000.00 again. **All accounts** is $3,950.00.

A payment that came from a schedule is unlinked when the new account uses another currency. The dialog says: "This transaction will no longer be linked to its schedule."

**Edit foreign amount**, **Split transaction**, and the transfer fields show the same budget warning when a dollar amount changes a month that already has money budgeted. On a phone, changing the account opens **Move to Checking**.

## Schedule a payment

Open **Schedules** and click **Add new schedule**. Name it **Paris rent**. Choose the payee **Résidences Saint-Martin SARL** and the account **BNP Paribas**. The amount is then in euros. Enter 950.00. The field shows -€950.00. Set the date to repeat every month.

<img width="694" alt="Schedule for Résidences Saint-Martin SARL in BNP Paribas, with an amount of -€950.00 repeating every month on the 31st" src="/img/budgeting/multi-currency-schedule@2x.png" />

On the scheduled date, Actual posts the payment and converts it with the rate for that date, here the fallback saved for 2026-10-31. 950.00 euros becomes $1,045.00 at 1 EUR = 1.1 USD.

If that date has no rate, the payment stays unposted. Actual says that some scheduled transactions were not posted, then gives the schedule name, the date, and that no rate exists for that currency. Post the schedule from the Schedules page to enter a rate or the amounts. For this rent, that opens **Convert to budget currency**. Enter a rate or a base amount, then save. Nothing is posted until then.

A remittance from BBVA México works the same way. 8000.00 pesos posts as $400.00 at 1 MXN = 0.05 USD.

A schedule stays in the currency of the account it was created for. To use an account in another currency, create a new schedule. The form says: "To use an account in another currency, create a new schedule."

## Link an existing exchange transfer

In **All accounts**, select the payment and deposit, then choose **Make transfer**. The two amounts in the budget currency must be equal and opposite. Actual keeps both recorded amounts in each account.

## Move euros between accounts

Create **Crédit Agricole** with a starting balance of 3,000.00. That is $3,300.00 at the day's fallback. Open Crédit Agricole and click **Add New**. In the payee field, choose **Make transfer**, then **BNP Paribas**. Enter a payment of 500.00. **Add** opens **Convert to budget currency**.

The dialog shows -€500.00, then "-$550.00 at 1 EUR = 1.1 USD (fallback, manual, 2026-10-31)". Leave **Base amount** empty and the rate as it is, then click **Save**.

Crédit Agricole is then €2,500.00. BNP Paribas receives a 500.00 deposit from Crédit Agricole. With the 2,000.00 starting balance and no other payments, the BNP Paribas balance is €2,500.00. **All accounts** does not change, because the dollars move with the euros.

<img width="860" alt="BNP Paribas at €2,500.00 after a 500.00 deposit from Crédit Agricole, with the 2,000.00 starting balance" src="/img/budgeting/multi-currency-transfer@2x.png" />

Choosing Checking or BBVA México from a euro account uses the exchange fields below, not **Convert to budget currency**.

## Transfer between currencies

Open **BNP Paribas** and click **Add New**. In the payee field, choose **Make transfer**, then **Checking**. Enter a deposit of 1,000.00.

The row shows the other side under the transaction. **Sent from Checking** is 1,100.00 USD. **Rate** shows 1 EUR = 1.1 USD, the day's fallback. **Fee** is empty. The gray amount and rate are estimates until you type over them. Click **Add transfer**.

<img width="860" alt="A 1,000.00 euro deposit into BNP Paribas from Checking, estimated as 1,100.00 dollars at 1 EUR = 1.1 USD" src="/img/budgeting/multi-currency-exchange@2x.png" />

BNP Paribas is then €3,000.00. The deposit row shows Checking, then $1,100.00. Checking is $1,400.00. **All accounts** stays $4,950.00.

A fee is optional. Choose EUR or USD next to **Fee**. The fee has to be smaller than the amount transferred, or Actual says: "The fee must be smaller than the amount transferred."

A payment of 100.00 from BNP Paribas to BBVA México uses the same row. Both accounts are in currencies other than the dollar, so saved endpoint rates supply the dollar valuation. There is no editable budget-value field; saving requires a valid saved valuation. The estimate is 2,200.00 pesos received and 110.00 dollars. The rate field shows 1 EUR = 22 MXN.

## Schedule a transfer

The payee list on a new schedule includes transfers. Open **Schedules** and click **Add new schedule**. Name it **Fund BNP Paribas**. In the payee field, under **Transfer To/From**, choose **Checking**. Choose the account **BNP Paribas**. The amount is in euros. Switch it to a deposit and enter 1,000.00. The field shows +€1,000.00. The date repeats every month on the 31st.

<img width="694" alt="Schedule Fund BNP Paribas, a monthly deposit of +€1,000.00 from Checking into BNP Paribas" src="/img/budgeting/multi-currency-schedule-exchange@2x.png" />

On 10/31/2026, Actual posts both sides at that day's fallback. BNP Paribas receives €1,000.00 and is €3,000.00. Checking sends $1,100.00 and is $1,400.00. **All accounts** stays $4,950.00.

If that date has no rate, the transfer stays unposted. Post it from the Schedules page. The dialog is **Post scheduled transfer**, with the same amount, rate, and fee fields as a transfer in the register. Nothing is posted until you click **Add transfer**. If you enter a fee there, type the other amount as well. Actual asks for the amount received or the amount sent, and it does not estimate that side once a fee is set.

## Import onto a scheduled transfer

A file can update that transfer instead of adding a second one. With **Fund BNP Paribas** already posted, open BNP Paribas and click **Import**. Choose a CSV for 10/31/2026 whose amount is 980.00 euros. Leave **Merge with existing transactions** on. The file date has to fall within a week of the transfer, and the amount has to be close to the schedule. This schedule is approximately €1,000.00, and a file amount within 7.5% of that matches.

The preview shows €980.00 from the file and the existing €1,000.00 under it.

<img width="800" alt="Import preview matching a 980.00 euro file row to the existing 1,000.00 euro transfer from Checking" src="/img/budgeting/multi-currency-import-exchange@2x.png" />

**Import** replaces the estimate. The deposit is then 980.00, and the row still shows $1,100.00 from Checking. BNP Paribas is €2,980.00. Checking stays $1,400.00. **All accounts** stays $4,950.00.

A transfer posted with a fee is left as entered. A reconciled transfer is left alone. A bank download that matches the transfer updates it the same way.

## On a phone

A narrow window uses the phone layout. The BBVA México account below uses the same five-month history as the desktop register. Its balance is 250 pesos, with the monthly 800 peso remittances and 150 peso gifts grouped by date. The **+** button adds a payment and opens **Convert to budget currency**.

<img width="390" alt="Phone view of BBVA México with a 250 peso balance and remittances and gifts grouped by month from June through October" src="/img/budgeting/family-bbva-mobile-history.png" />

The payment detail below returns to the separate BNP Paribas rent-entry checkpoint. Open the rent payment. The amount is -€950.00, with -$1,045.00 under it. **Edit amount** opens **Edit foreign amount**. **Split** opens the **Split transaction** page. If the screen has other unsaved changes, save them first. Actual says: "Save your other changes before editing the amount."

<img width="390" alt="Phone transaction for Résidences Saint-Martin SARL showing -€950.00, -$1,045.00, and Edit amount" src="/img/budgeting/multi-currency-mobile-payment@2x.png" />

## Import a file

Open the BNP Paribas account and click **Import**. Choose a CSV, QIF, OFX, QFX, or CAMT file whose amounts are already in euros. Leave **Multiply amount** off. That option scales the numbers in the file, and this account reads them as euros.

The preview shows -€950.00 for the October 31 rent, with -$1,045.00 under it, converted at the fallback for that date. Press **Import**.

<img width="860" alt="Import preview of a 950 euro rent payment to Résidences Saint-Martin SARL, with -$1,045.00 under the euro amount" src="/img/budgeting/multi-currency-import@2x.png" />

If a date in the file has no rate, the dialog says: "No exchange rate is available for 2026-10-30. Enter a rate to use for these days in this operation only." The rate field takes dollars per 1 euro, with a swap button for the reverse. **Use rate** converts those rows for this import. Actual does not save it as a fallback, so a later import on that day asks again.

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
