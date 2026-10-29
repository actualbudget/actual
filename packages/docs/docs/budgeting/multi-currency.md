# Multi-currency

This example budget is for a family that has a Paris apartment they sublease to a brother-in-law and parents they visit in Mexico. BNP Paribas is their euro bank, and BBVA México is their peso bank. Résidences Saint-Martin SARL, the landlord, and the family members in this example are fictional.

A budget has one currency. This page uses US dollars. The BNP Paribas account is in euros, for rent in France. The BBVA México account is in Mexican pesos, for gifts and remittances. Balances on the budget are shown in dollars. A saved exchange rate converts a foreign starting balance into that dollar amount.

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

After you create the BNP Paribas account, the header shows the dollar balance.

<img width="860" alt="BNP Paribas header showing a balance of $2,200.00" src="/img/budgeting/multi-currency-eur-balance@2x.png" />

The register lists that starting balance as 2,200.00. The sidebar uses the same dollar figure.

Adding a payment in the euro or peso account does not save. Actual reports that something internally went wrong. Enter the rent, the gifts, and the remittances in Checking, in dollars. The foreign accounts hold the starting balance.
