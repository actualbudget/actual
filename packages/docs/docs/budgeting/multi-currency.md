# Multi-currency

This example budget is for a family that has a Paris apartment they sublease to a brother-in-law and parents they visit in Mexico. The budget uses US dollars. BNP Paribas holds euros for the Paris rent and sublease receipts. BBVA México holds pesos for visits, gifts and remittances to the parents. The budget total stays in dollars. A foreign account shows its own currency. A saved exchange rate converts its transactions into dollars. Résidences Saint-Martin SARL, the landlord, and the family members in this example are fictional.

<ExperimentalFeatureWarning issueId="5191" />

## Turn on currency support

Open **Settings**, then **Experimental**. Turn on **Currency support**, then **Multiple currencies**.

The Multiple currencies note says: "Experimental preview. Requires a budget currency. Accounts in other currencies are not available yet." The Add account dialog does let you choose another currency. Use that dialog.

<img width="643" alt="Currency support and Multiple currencies turned on" src="/img/budgeting/multi-currency-experimental@2x.png" />

## Set the budget currency

With Currency support on, open **Settings**, then **General**. Under Currency, set **Default currency** to **USD - US Dollar ($)**. The Currency settings appear only while Currency support is on.

Actual recommends a backup before it changes the currency. Backup confirmation is optional. Choose **Continue**.

That setting also updates the number format. You can change the symbol position and whether decimal places are shown on the same screen. If Currency support is turned off later, amounts keep the currency's decimal places but show no currency symbol.

<img width="656" alt="Currency settings with the default currency set to USD - US Dollar ($)" src="/img/budgeting/multi-currency-currency@2x.png" />

## The family example

The registers show five months of the family budget, from June through October 2026, with opening balances on May 31. Each month, BNP Paribas pays €950 to Résidences Saint-Martin SARL and receives €950 from Thomas Martin, the brother-in-law. The entries offset, leaving the opening €2,000 balance. Rent uses Paris rent, and the receipt uses Sublease income.

<img width="860" alt="BNP Paribas with five months of Paris rent and matching sublease income, keeping a 2000 euro balance" src="/img/budgeting/family-bnp-history.png" />

Each month, BBVA México sends an 800 peso remittance to Elena García and a 150 peso gift to José García. Both use Family support. After five months, the 5,000 peso opening balance falls to 250 pesos.

<img width="860" alt="BBVA México with five months of remittances and gifts for Elena and José García, leaving 250 pesos" src="/img/budgeting/family-bbva-history.png" />

The workflow examples below use separate checkpoints so each calculation can be followed on its own.

## Save exchange rates

With Multiple currencies on, **General** shows **Exchange rates** under the currency block.

The rate is the foreign currency per 1 dollar. Save 0.909091 for euros, and 20 for pesos. Those mean 1 dollar is 0.909091 euros, and 1 dollar is 20 pesos.

Choose the currency. Set **Kind** to **Standing rate** or **One-day rate**, set the date, enter the rate, and click **Save rate**. A one-day rate is for that UTC day. A standing rate applies from its date when no fetched rate is available. You can keep both on the same date. Saving the same currency, kind, and date again asks you to replace the saved rate.

**Rate in use today** names the rate on file. For pesos, both lines read `standing rate 20 from 2026-10-31`: the rate a new transaction today would use, and the rate Estimates and To Budget would use. **Edit** loads a saved row back into the form. **Remove** deletes it.

<img width="632" alt="Exchange rates with a standing 0.909091 euro rate and a standing 20 peso rate per 1 dollar" src="/img/budgeting/multi-currency-rates@2x.png" />

## Create the accounts

**Add account** takes the starting balance in the account's own currency. When a rate is saved for today, the dialog shows the dollar amount.

Create three accounts:

1. **Checking**, currency USD, starting balance 2500. This is everyday spending in dollars.
2. **BNP Paribas**, currency **EUR - Euro (€)**, balance 2000. The dialog previews $2,200.00 in the budget currency, with 1 EUR worth approximately 1.10 USD.
3. **BBVA México**, currency **MXN - Mexican Peso ($)**, balance 5000. At 1 MXN = 0.05 USD, that starting balance is $250.00.

<img width="550" alt="Add account for BNP Paribas in euros, with a 2000 euro balance shown as $2,200.00" src="/img/budgeting/multi-currency-add-account@2x.png" />

If no rate is saved for today, the dialog adds **Base amount** and says: "No exchange rate is saved for today. Enter the starting balance in the budget currency."

The BNP Paribas account then shows €2,000.00. Its register lists the starting balance as a 2,000.00 deposit. **All accounts** in the sidebar counts the $2,200.00 dollar amount. The peso account uses $, so its 5,000.00 peso balance looks like $5,000.00. That row is pesos. **All accounts** is dollars.

## Enter a payment

Open the BNP Paribas account and click **Add New**. Enter the payee **Résidences Saint-Martin SARL** and a payment of 950.00. That amount is euros. **Add** opens **Convert to budget currency**.

The dialog shows -€950.00, then -$1,045.00 at the saved standing rate from 2026-10-31, with EUR first. Leave **Base amount** and the rate empty. That uses the amount shown. Click **Save**.

The new row stays open after the payment is saved. Click **Cancel** to close it.

<img width="506" alt="Convert to budget currency for a 950 euro rent payment, shown as -$1,045.00 at 1 USD = 0.909091 EUR" src="/img/budgeting/multi-currency-convert@2x.png" />

The account balance is then €1,050.00: the 2,000.00 starting balance minus the 950.00 rent. The register shows the payment as 950.00.

<img width="860" alt="BNP Paribas with a balance of €1,050.00, a 950.00 rent payment to Résidences Saint-Martin SARL, and a 2,000.00 starting balance" src="/img/budgeting/multi-currency-eur-register@2x.png" />

A saved amount in the euro or peso account cannot be changed, split, or scheduled.

## On a phone

A narrow window uses the phone layout. The BBVA México account below uses the same five-month history as the desktop register. Its balance is 250 pesos, with the monthly 800 peso remittances and 150 peso gifts grouped by date. The **+** button adds a payment and opens **Convert to budget currency**.

<img width="390" alt="Phone view of BBVA México with a 250 peso balance and remittances and gifts grouped by month from June through October" src="/img/budgeting/family-bbva-mobile-history.png" />

The payment detail below returns to the separate BNP Paribas rent-entry checkpoint. Open the rent payment. The amount is -€950.00, with -$1,045.00 under it. The screen says: "Editing foreign amounts is not available yet."

<img width="390" alt="Phone transaction for Résidences Saint-Martin SARL showing -€950.00 and -$1,045.00, with editing unavailable" src="/img/budgeting/multi-currency-mobile-payment@2x.png" />

## Import a file

Open the BNP Paribas account and click **Import**. Choose a CSV, QIF, OFX, QFX, or CAMT file whose amounts are already in euros. Leave **Multiply amount** off. That option scales the numbers in the file, and this account reads them as euros.

The preview shows -€950.00 for the October 31 rent, with -$1,045.00 under it. That dollar amount is the saved rate for that date. Press **Import**.

<img width="860" alt="Import preview of a 950 euro rent payment to Résidences Saint-Martin SARL, with -$1,045.00 under the euro amount" src="/img/budgeting/multi-currency-import@2x.png" />

If a date in the file has no saved rate, the dialog says: "No exchange rate is saved for 2026-10-30. Enter a rate, used from 2026-10-30 until you save another rate." The rate defaults to dollars per 1 euro, with a swap button for the reciprocal direction. **Save rate** stores a standing rate from that date. The preview can then convert the rows.

<img width="860" alt="Import dialog asking for a euro rate from 2026-10-30, with two 950 euro rent rows" src="/img/budgeting/multi-currency-import-rate@2x.png" />

## Link a bank account

With **Currency support** and **Multiple currencies** enabled, GoCardless, SimpleFIN, Pluggy.ai, Akahu and Enable Banking use the currency reported for each bank account. The link dialog formats the reported balance in that currency.

Choose a new on-budget or off-budget account in the link dialog to create it in the bank account's currency automatically. For example, linking a euro account creates an account in EUR, and linking a peso account creates one in MXN. Actual also records the currency's decimal precision, so a JPY account uses whole yen and a KWD account uses three decimal places. Imported transactions retain their native amounts alongside their booked value in the budget currency.

To link an existing account, its currency must match. A bank account in euros can be linked to BNP Paribas, and a bank account in pesos can be linked to BBVA México. The list offers compatible accounts only; Actual also checks the currency when saving the link. Later syncs do not change an existing account's currency.

If the provider does not report a usable currency, Actual offers the budget-currency account flow instead of guessing a foreign currency. An unsupported foreign currency cannot create a new foreign account. With Multiple currencies turned off, bank linking keeps the existing budget-currency behavior.

If the first link needs a missing exchange rate or starting balance, Actual asks for it before creating the account or importing any transactions.

If the bank does not report a balance in that currency, the link dialog says: "The bank did not report a balance in this account's currency. Enter the balance on the starting date, then try again."

Downloaded transactions in some other currency are left out. Actual reports the count: "downloaded transactions were in another currency and were skipped."

If a download needs a rate that is not saved, Actual says: "An exchange rate is needed before these transactions can be added." **Add exchange rate** opens the same form as import. The rate defaults to budget units per 1 account-currency unit, saved from the earliest missing date. Saving it downloads again.
