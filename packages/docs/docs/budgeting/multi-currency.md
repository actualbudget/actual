# Multi-currency

This example budget is for a family that has a Paris apartment they sublease to a brother-in-law and parents they visit in Mexico. BNP Paribas is their euro bank, and BBVA México is their peso bank. Résidences Saint-Martin SARL, the landlord, and the family members in this example are fictional.

A budget has one currency. This page uses US dollars, with a euro account for rent on an apartment in Paris and a peso account for gifts and remittances to parents. Actual stores every balance in dollars. The account name and a note say which currency you typed, and a rule converts that number into dollars.

<ExperimentalFeatureWarning issueId="5191" />

## Turn on formula mode and currency support

Open **Settings**, then **Experimental**. Turn on:

- Excel formula mode (Formula cards & Rule formulas)
- Currency support
- Multiple currencies

Leave **Rule action templating** off. Its note says to use Excel formula mode instead. See [Excel formula mode](../experimental/formulas.md#rule-formulas) for how formulas work.

**Multiple currencies** shows this note: "Experimental preview. Requires a budget currency. Accounts in other currencies are not available yet."

<img width="643" alt="Experimental settings with Excel formula mode, Currency support, and Multiple currencies turned on" src="/img/budgeting/multi-currency-experimental@2x.png" />

## Set the budget currency

With Currency support on, open **Settings**, then **General**. Under Currency, set **Default currency** to **USD - US Dollar ($)**. The Currency settings appear only while Currency support is on.

Actual recommends a backup before it changes the currency. Backup confirmation is optional. Choose **Continue**.

That setting also updates the number format. You can change the symbol position and whether decimal places are shown on the same screen. If Currency support is turned off later, amounts keep the currency's decimal places but show no currency symbol.

<img width="656" alt="Currency settings with the default currency set to USD - US Dollar ($)" src="/img/budgeting/multi-currency-currency@2x.png" />

## Name the accounts

**Add account** still saves the account in the budget currency. The currency menu stays on USD, and the dialog says accounts in other currencies are not available yet. Put the currency in the account name, and add a note with the code.

Create three accounts:

1. **Checking**, starting balance 2500. This is everyday spending in dollars.
2. **BNP Paribas (EUR)**, balance 0. Open the account, click the notes button beside the name, and set the note to `#currency:EUR`.
3. **BBVA México (MXN)**, balance 0, with the note `#currency:MXN`.

<img width="550" alt="Add account dialog for BNP Paribas (EUR), with the currency menu stuck on US dollars" src="/img/budgeting/multi-currency-add-account@2x.png" />

<img width="860" alt="BNP Paribas (EUR) account header with the note #currency:EUR" src="/img/budgeting/multi-currency-account-note@2x.png" />

The sidebar lists all three balances in dollars. The names are the only thing that separates the Paris rent money and the parents' pesos from Checking.

<img width="240" alt="Sidebar with Checking at $2,500.00, BNP Paribas (EUR) at $0.00, and BBVA México (MXN) at $0.00" src="/img/budgeting/multi-currency-accounts@2x.png" />

## Enter the foreign amount first

On **BNP Paribas (EUR)**, add a payment to the payee Résidences Saint-Martin SARL for 950.00. That number is the rent in euros.

On **BBVA México (MXN)**, add two payments to Elena García: 8000.00 for a remittance, and to José García: 1500.00 for a gift. Those numbers are pesos.

<img width="860" alt="BNP Paribas account with a 950.00 payment to Résidences Saint-Martin SARL, before conversion" src="/img/budgeting/multi-currency-eur-before@2x.png" />

Do this before you create the conversion rule. If the rule already exists, it runs while the amount is still 0, writes a note that contains `FX rate:`, and then will not convert the amount you meant to enter.

## Convert with a rule

Open **Settings**, then **Rules**, and choose **Create new rule**. Make one rule for each foreign account. [Rules](./rules/index.md) run in the order listed on that page. These two rules match different accounts, so that order does not matter here.

Set **Stage of rule** to **Post**.

Match all of these conditions:

- **account** is **BNP Paribas (EUR)** on one rule, and **BBVA México (MXN)** on the other
- **notes** does not contain `FX rate:`

Then add two actions. On each one, click the **ƒ** button so the field becomes a formula. A formula starts with `=`. In a rule, `amount` is the transaction amount in major units, such as 950.00, and a payment is negative. The formulas below keep that sign.

Write the note first, while `amount` is still the foreign number. Convert the amount second. If you swap them, the note records the dollar amount instead of the rent or the remittance.

For the BNP Paribas account, 1 euro is 1.10 dollars:

- set **notes** to `=CONCATENATE(FIXED(ABS(amount),2)," EUR (FX rate: 1.10)")`
- set **amount** to `=amount*1.10`

For the BBVA México account, 1 peso is 0.05 dollars:

- set **notes** to `=CONCATENATE(FIXED(ABS(amount),2)," MXN (FX rate: 0.05)")`
- set **amount** to `=amount*0.05`

The rule lists the saved payments that match. Select them, click **Apply actions**, then **Save**. Put your own rates in both formulas when these rates are wrong for you. The `FX rate:` text stops the rule from converting a payment a second time, so a new rate applies only to payments that do not already have that note.

<img width="860" alt="Post rule for BBVA México (MXN) with the notes and amount formulas, and two payments selected for Apply actions" src="/img/budgeting/multi-currency-rule@2x.png" />

## Check the register

After the rules run:

- 950.00 EUR at 1.10 becomes 1,045.00
- 8,000.00 MXN at 0.05 becomes 400.00
- 1,500.00 MXN at 0.05 becomes 75.00

The note keeps the foreign amount and the rate. The register shortens a long note, so the BNP Paribas row shows `950.00 EUR (FX rate: 1...`. Open the note to read the full rate.

<img width="860" alt="Résidences Saint-Martin SARL payment converted to 1,045.00, with the original 950.00 EUR and rate in the note" src="/img/budgeting/multi-currency-eur-register@2x.png" />

<img width="860" alt="Payments to Elena and José García converted to 75.00 and 400.00, with the peso amounts in the notes" src="/img/budgeting/multi-currency-mxn-register@2x.png" />

Checking is untouched. It was already in dollars, and neither rule matches it.
