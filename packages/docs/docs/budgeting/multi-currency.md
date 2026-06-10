# Multi-Currency

Actual supports budgets with accounts in more than one currency. Your budget has one **base currency** used for budgets, reports, dashboards, rules, and category math. Each account can also have its own **account currency**, which is the currency you normally see and enter transactions in for that account.

For example, you can keep your budget in BRL, have one checking account in BRL, and another account in USD. The USD account register shows USD amounts, while the budget and reports continue to use BRL.

:::important
All budgeting and reporting is done in the **base currency**. Budget checks, category balances, available amounts, overspending checks, reports, dashboards, rules, and mixed-account totals never use the native account currency as their source of truth.

Native currency is used for account-register display and account-level workflows, such as entering transactions in the account currency and comparing an account to a statement. The converted base `amount` is what Actual uses for budget math.
:::

## Concepts

### Base currency

The base currency is the reporting currency for the budget file. Actual uses it for:

- budgeted, spent, and balance amounts
- available-to-spend and overspending checks
- reports and dashboards
- category totals
- rules that depend on transaction amounts
- mixed-account views such as **All accounts**

If a transaction is entered in a foreign-currency account, Actual converts it to the base currency before it affects the budget. This means every budget decision is evaluated in one currency: the base currency.

The base currency is selected from the enabled currencies in **More > Exchange Rates**.

### Account currency

Each account has a currency. Existing accounts default to the budget base currency unless you convert them.

When you view a single account, Actual shows the account's native currency. When you view mixed-account pages, Actual may show base currency or native currency depending on the page:

- **All accounts** shows base currency.
- **On budget** or **Off budget** from Account Type grouping shows base currency.
- **On budget** or **Off budget** from Currency grouping shows only accounts in that currency and shows native currency.
- A single account page shows that account's native currency.

### Native and base amounts

Transactions store both amounts:

- `native_amount`: the amount in the account currency
- `amount`: the converted amount in the base currency

This lets the account register match the real-world account statement while keeping the budget and reports consistent in the base currency.

The native amount is not used for budget checks. For example, if your base currency is BRL and you spend 20 USD from a USD account with an exchange rate of 1 USD = 5 BRL, Actual records 20 USD as the native amount and 100 BRL as the base amount. The category spending and available balance use 100 BRL.

## Exchange Rates

Exchange rates are managed from **More > Exchange Rates**.

An exchange rate has:

- **From currency**
- **To currency**
- **Date/time**
- **Rate**
- **Source**

Manual rates are supported first. Automatic rate providers can be added later without changing the basic model.

### How Actual chooses a rate

Actual uses effective date/time exchange rates. For a transaction dated October 10, 2026, Actual uses the newest exchange rate at or before that transaction's effective time.

If a transaction only has a date, Actual treats the lookup as the end of that day. This lets manually entered daily rates keep working while still allowing future provider-backed rates to update multiple times per day.

Example:

| Rate date/time      | Rate            |
| ------------------- | --------------- |
| 2026-10-09T00:00:00 | 1 USD = 5 BRL   |
| 2026-10-11T00:00:00 | 1 USD = 5.2 BRL |

A transaction dated 2026-10-10 uses the 2026-10-09 rate. The later 2026-10-11 rate is ignored for that transaction.

When multiple rates exist on the same day, Actual uses the latest one that is not after the transaction time. A date-only transaction uses the latest rate on that day.

### Reverse rates

Actual can use reverse rates. If you need BRL to USD, but only have USD to BRL, Actual uses `1 / rate`.

Because of this, you cannot save the opposite direction for the same date/time. For example, if `USD -> BRL` exists for `2026-10-10T15:00:00`, Actual will not allow `BRL -> USD` for that same date/time.

### Missing rates

If you save a transaction that needs an exchange rate and no usable rate exists, Actual asks you to add one.

The missing-rate dialog shows:

- the needed date/time
- the source currency
- the destination currency
- a numeric exchange rate field

If you click **OK**, Actual saves the exchange rate and continues saving the transaction. If you click **Cancel**, the transaction is not saved and Actual shows an error notification. The notification includes an action to reopen the missing-rate dialog.

### Imports and bank sync

When imported or synced transactions require missing exchange rates:

- CSV import marks the affected row with an error and disables importing that row.
- OFX import tells you that the import contains transactions needing exchange rates.
- Bank sync reports that some transactions could not be fully applied because exchange rates are missing.

## Adding Currencies

1. Go to **More > Exchange Rates**.
2. Enable the currencies you want to use.
3. Choose a base currency from the enabled currencies.
4. Add exchange rates for the currency pairs you use.

The first enabled currency is not automatically made the base currency. Until you select one, Actual shows a **Set base currency** action.

You can change the base currency later from the same page. Changing the base currency recalculates base amounts using exchange rates and keeps transactions explainable through stored rate metadata.

## Adding Accounts

When creating a new account, Actual selects the budget base currency by default. You can choose another enabled currency if the account is held in that currency.

For base-currency accounts:

- the native amount and base amount are the same
- the exchange rate is `1`

For foreign-currency accounts:

- you enter transactions in the account currency
- Actual converts the transaction to the base currency using the effective exchange rate
- the account page shows the native amount
- budgets, budget checks, category balances, reports, dashboards, and rules use the base amount

## Transfers

Transfers between accounts in the same currency behave like normal transfers.

For cross-currency transfers, Actual stores each side in the correct native currency and keeps both sides connected as one transfer.

Example:

- Base currency: BRL
- USD exchange rate: 1 USD = 5 BRL
- Transfer: 1000 BRL from a BRL account to a USD account

Actual stores:

- BRL account side: 1000 BRL native, 1000 BRL base
- USD account side: 200 USD native, 1000 BRL base

The USD account register shows 200 USD. Mixed-account views and reports use 1000 BRL.

## Sidebar Grouping

The account sidebar can group accounts by:

- **Currency**
- **Account Type**

When grouped by **Currency**, accounts appear under each currency first, then under **On budget** and **Off budget**. Clicking an **On budget** or **Off budget** section in this mode filters the account page to that currency and shows native values.

When grouped by **Account Type**, accounts appear under **On budget** and **Off budget**. Account names include a small currency label. Clicking these sections shows all accounts of that type in the base currency.

## Editing Exchange Rates

You can edit or delete exchange rates from **More > Exchange Rates**.

You can delete an exchange rate only when no transaction uses it.

If you edit a rate that transactions use, Actual warns you how many transactions will be recalculated. If you confirm, Actual updates the rate and recalculates the affected transaction base amounts. If you cancel, the exchange rate is not changed.

## Converting Existing Accounts

Existing users can convert an account to another currency with the account currency conversion flow.

The conversion supports two modes:

- **Reinterpret as native**: existing transaction amounts become native amounts, and Actual recalculates base amounts from historical rates.
- **Preserve base history**: existing base amounts stay unchanged, and Actual derives native amounts from historical rates.

Before converting, Actual previews:

- affected transaction count
- date range
- source currency
- target currency
- exchange-rate coverage

If any historical rate is missing, Actual reuses the missing-rate dialog.

Accounts with transactions cannot have their currency changed directly. Use the conversion flow so the transaction history remains consistent.

## Disabling Currencies

You can disable enabled currencies that are not the base currency.

When disabling a currency, Actual asks for confirmation and explains that accounts using that currency will be converted to the current base currency. The base currency itself cannot be disabled.

## FX Adjustments

Small exchange-rate fluctuations can make a foreign-currency account's displayed balance differ from a statement balance. Actual handles this with visible adjustment transactions instead of silent balance overrides.

Use an FX adjustment when you need to bring an account to a known statement balance. Actual creates an explicit transaction using the effective exchange rate for the chosen date. The adjustment is visible, undoable, synced, and included in the account history.

## FAQ

### Does multi-currency change my budget currency?

No. Budgets, reports, dashboards, category math, and every budget check use the base currency.

### Why does my USD account show USD but reports show BRL?

The account page shows native account amounts. Reports use the base currency so totals from multiple currencies can be added together.

### Why does All accounts show base currency?

All accounts can include accounts in different currencies. Actual shows base currency there so the numbers can be summed meaningfully.

### Why does a currency-grouped On budget page show native currency?

When you click **On budget** inside a currency group, Actual filters the page to accounts in that currency. Since all accounts on that page share one currency, Actual can show native values.

### What happens if an exchange rate is missing?

Actual prompts you to add the missing rate. If you cancel, the transaction is not saved.

### Can Actual use the opposite exchange rate?

Yes. If Actual needs BRL to USD and only USD to BRL exists, it uses `1 / rate`.

### Can I enter both directions for the same date/time?

No. Since Actual can calculate the reverse direction, saving both directions for the same date/time would create ambiguity.

### Can I change the base currency later?

Yes. Change it from **More > Exchange Rates**. Actual recalculates base amounts using exchange rates and keeps the rate metadata on transactions.

### Can I delete an exchange rate?

Yes, but only if no transaction uses that specific rate.

### What happens when I edit an exchange rate used by transactions?

Actual warns you how many transactions will be recalculated. If you confirm, those transactions are recalculated. If you cancel, the rate is not changed.

### Are imported transactions converted automatically?

They are converted when a usable exchange rate exists. If a rate is missing, CSV import marks the row as invalid, OFX import reports the issue, and bank sync reports the missing-rate failure.

### Do rules use native or base amounts?

Rules and budget logic use base amounts. Account registers show native amounts when the page represents a single account currency.

### Are budget checks ever done in native currency?

No. Budget checks are always done in the base currency. Native currency is for account display, entry, and account-level balance context only.

### Should I use FX adjustments to hide exchange-rate changes?

No. FX adjustments are meant to make balance differences explicit. They create visible transactions so the account history remains explainable.
