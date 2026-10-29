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

After you create the BNP Paribas account, the header shows the dollar balance.

<img width="860" alt="BNP Paribas header showing a balance of $2,200.00" src="/img/budgeting/multi-currency-eur-balance@2x.png" />

The register lists that starting balance as 2,200.00. The sidebar uses the same dollar figure.

Adding a payment in the euro or peso account does not save. Actual reports that something internally went wrong. Enter the rent, the gifts, and the remittances in Checking, in dollars. The foreign accounts hold the starting balance.
