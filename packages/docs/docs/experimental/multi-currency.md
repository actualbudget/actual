# Multiple Currencies

<ExperimentalFeatureWarning issueId="5191" />

## What It Is

Accounts can hold different currencies, for example a Canadian budget with a US dollar account and a Colombian peso account. Every amount is stored only in the currency of its account. Exchange rates are used to show those amounts, and to add them up, in the budget's default currency. Transactions keep the amount they were entered with, so changing a rate never changes them.

## Turning It On

1. Go to **Settings → Experimental** and turn on **Currency support**, then **Multiple currencies** below it.
2. Go to **Settings → General → Currency** and choose the **Default currency**, the currency your budget is kept in.

Until a default currency is chosen, nothing changes.

![Settings → Experimental with Currency support and Multiple currencies turned on](/img/experimental/multi-currency/multi-currency-experimental-settings@2x.webp)

Any currency Actual offers can be used, both as the default currency and for accounts, including currencies without decimals such as the Japanese yen or the Korean won.

## Account Currencies

Open an account's menu and choose **Account settings** to pick its currency. You can also choose one when adding an account.

<img width="520" alt="The settings of a US dollar account: its currency and how its balance is shown" src="/img/experimental/multi-currency/multi-currency-account-settings@2x.webp" />

With multiple currencies on, every account has a currency of its own:

- When **Multiple currencies** is turned on, or the default currency is chosen for the first time, accounts without a currency get the default one, closed accounts included.
- New accounts get the default currency unless you choose another.
- **Settings → General → Currency** lists your open accounts in the default currency until you dismiss the list. Check that none of them actually holds another currency.

Changing the currency of an account that already has transactions relabels its amounts: they stay exactly as recorded and are read in the new currency. Nothing is converted, so only do this to correct an account set to the wrong currency.

:::note

Changing the budget's default currency never changes the currency of an account. See [Changing the Default Currency](#changing-the-default-currency).

:::

## Exchange Rates

Rates are managed on the **Exchange Rates** page, under **Settings** or pinned to the sidebar. Enter what one unit of a currency is worth in another, for example 1 USD = 1.38 CAD. The reverse direction is worked out for you, and so are conversions through a third currency, such as USD to COP through CAD.

Each currency pair has its own tab, for example **USD → CAD**, where you add and edit the rates of that pair only. To start a new pair, use the **New pair** tab. A pair is entered in one direction only: once there is a USD → CAD tab, CAD → USD rates are worked out from it.

![The Exchange Rates page with a tab per currency pair and the USD → CAD rates](/img/experimental/multi-currency/multi-currency-exchange-rates@2x.webp)

To delete many rates at once, tick them in the table and choose **Delete** from the selection menu. To delete a whole pair, use **Delete pair…** above its table or right-click its tab; Actual asks you to confirm first.

Rates are typed with your number format, like amounts, and must be between 0.000000001 and 1,000,000,000. Importing a file shows how many rates were new, updated or already up to date, and which rows were skipped.

Each rate has a date. A conversion uses the latest rate on or before the date it needs, so you can keep a history of rates. A rate on or before the date, even through a third currency, is used before a later rate of the pair itself.

To add many rates at once, use the **Import and export** tab with a CSV file. The first row names the columns `date`, `from`, `to` and `rate`:

```
date,from,to,rate
2026-10-01,USD,CAD,1.3862
2026-10-01,CAD,COP,3000
```

Rates in the file are plain numbers with a dot as the decimal mark and no thousands separators. Files separated by semicolons or tabs may use a decimal comma instead, such as `1,3862`. Each row needs as many values as the first row; other rows are reported and skipped.

The same tab exports all your rates in this format, for example to move them to another budget.

Until a currency has a rate, its amounts count 1:1 against the default currency, the same way they added up before the feature existed. Such amounts are marked with ≈.

## How Amounts Are Shown

Amounts in the default currency show no symbol unless you choose otherwise in **Settings → General → Currency**: you already know they are your own money, the same way a price tag at home says $100 rather than CAD$100. Amounts in another currency always show its code, for example `USD$760.03`, so what is different stands out and can't be confused with default-currency amounts.

Inside a foreign account, amounts are always entered in the account's currency. The column headers of the transaction table show it, for example **Payment (USD)**, and each transaction shows its amount in that currency; hover it to see its value in the default currency. On a phone, transactions show their amount in that currency too, and the value in the default currency is shown under the amount when you open one. Reconciling a foreign account works in its currency too: its balances, and the bank balance you enter, keep all of that currency's decimals.

![A US dollar account: its balance in USD and CAD, both balances in its chart, and amounts in USD](/img/experimental/multi-currency/multi-currency-foreign-account@2x.webp)

**Hide decimals** applies to amounts in the default currency, including accounts set to it explicitly. Amounts in other currencies always show their decimals. Amounts in another currency without decimals, such as the yen in a budget in dollars, are shown in whole units, and amounts converted into a currency without decimals are rounded to whole units.

With **Show balances of other currencies as**, you can choose how the balance of a foreign account is shown: in its header, its running balance and its chart. It applies to all accounts from settings, and **Show balance as** in an account's settings overrides it for that account:

- **Original currency**: `USD$760.03`
- **Converted to default currency**: `1,053.62`
- **Both**: `USD$760.03 (1,053.62)`

![The currency settings: default currency, how balances of other currencies are shown, which rate converts past amounts and the symbol for CAD amounts](/img/experimental/multi-currency/multi-currency-currency-settings@2x.webp)

Converted amounts are never editable. An amount marked with ≈ is approximate: there is no exchange rate for it yet, or only one from a later date.

The balance chart of a foreign account follows the same choice. With **Both**, the two balances are drawn on top of each other, each on its own scale, so pesos and dollars are both readable and you can see how the value of money held in another currency changed. Each month is valued with the **Convert past amounts with** setting: the latest rate, or the rate on each date. Charts of several accounts together, such as All accounts, show converted balances.

When you export transactions to a CSV file, amounts keep the currency of their account. Once an exported account has a currency of its own, the file gets a **Currency** column; other exports are unchanged.

## Totals, Reports and the Budget

- **Account totals**, such as All accounts, On budget or account groups, convert every account at the latest rate and update as soon as a rate changes.
- **Reports** follow the **Convert past amounts with** setting, and so do the balance chart, running balances and the value in the default currency shown for a transaction:
  - **Latest rate** values past amounts at today's rate.
  - **Rate on each date** values them at the rate of their date. The net worth report then shows how exchange rates moved your net worth over time. This is only accurate when there are rates on or before every transaction date; the reports page warns when a currency has transactions older than its first rate.
- **The budget** converts spending and income of foreign on-budget accounts with the rate of each transaction's date, whatever the setting, unless the category budgets that currency on its own line (see [Budgeting in More Than One Currency](#budgeting-in-more-than-one-currency)). Months before a pair's first rate use its earliest rate. Adding or changing a rate revalues the budget.
- **Formula cards** convert `QUERY` and `BALANCE_OF` results into the default currency, following the **Convert past amounts with** setting.

<img width="220" alt="The sidebar with each account in its own currency and the totals converted to CAD" src="/img/experimental/multi-currency/multi-currency-sidebar-totals@2x.webp" />

Because the budget uses the rate of each transaction's date, while account totals use the latest rate, the two can differ for foreign on-budget accounts. That difference is the exchange gain or loss on money held in another currency. The budget also converts each transaction on its own, so it can be a cent off the converted account balance.

## Budgeting in More Than One Currency

Any category can be budgeted in more than one currency, income ones too. For example, in a Canadian budget, Food can have CAD 400 for groceries at home and USD 150 for trips, and the USD 150 stays USD 150 whatever the exchange rate does.

To add a currency, open the menu of a category and choose **Add currency**. Pick the currency, the currencies of your accounts come first, and the month it starts in. The category then shows its total in the default currency, followed by a line for its own budget and one for each currency you added.

<img width="512" alt="Adding a currency to the General category: the currency, with those of your accounts first, and the month it starts in" src="/img/experimental/multi-currency/multi-currency-category-currency-add@2x.webp" />

![Food in a Canadian budget: its total in CAD, then CAD 400 budgeted for itself and USD 150 budgeted, spent and kept in US dollars](/img/experimental/multi-currency/multi-currency-category-currencies@2x.webp)

- **Spending and income** of an account in the currency of a line show up in that line, in that currency, never converted: a salary paid in US dollars, or the starting balance of a US dollar account, shows up in the USD line of its category. Amounts in a currency without its own line show up in the category's own line, converted as before. Months before the first month of a line stay as they were.
- **To Budget** stays in the default currency. Budgeting USD 150 takes its value from To Budget at that month's rate, and income received in US dollars adds its value at that rate: the latest rate on or before the last day of the month. The current and later months follow the latest rate; a past month keeps its last rate.
- **The balance** of a line stays in its currency: budget USD 150, spend USD 45, and USD 105 is left. Overspending returns to To Budget at that month's rate, unless rollover is on for that line.
- **Moving money** between a line and another category or To Budget, or covering overspending, converts it at the month's rate. You type the amount in the currency it comes from.
- **Removing a currency** from the menu of its line moves its budget into the category, converted at each month's rate, so To Budget doesn't change. Its spending shows up in the category again.
- **Reports**, formula cards and the category picker count the total of the category, in the default currency.

<img width="320" alt="The same category on a phone, with a row for CAD and one for USD under it" src="/img/experimental/multi-currency/multi-currency-category-currencies-mobile@2x.webp" />

Budget templates fill in the category's own budget only. While **Multiple currencies** is turned off, the lines are left out of the budget; turning it back on brings them back.

## Transfers Between Currencies

When you send money from an account in one currency to an account in another, each side keeps its own amount: what left one account and what arrived in the other. Services such as Wise or a bank each apply their own rate and fees, so the two amounts rarely match the exchange rate exactly. With multiple currencies turned off, transfers copy the same amount to both sides, as before.

![The Currency transfer dialog asking how much arrived in the US dollar account, with the rate of the transfer, the exchange rate and the fees](/img/experimental/multi-currency/multi-currency-transfer-dialog@2x.webp)

- **Choosing a transfer payee** for an account in another currency asks how much arrived (or left) on the other side. The amount is filled in with the exchange rate of the transaction's date, so you only change it when your bank or service gave you a different one. The dialog shows the rate of this transfer, the exchange rate of the day, and the fees and spread that the difference amounts to. Closing it, or leaving the page, keeps the exchange rate of the day.
- **Editing one side later** never changes the other side's amount, because what arrived doesn't change when you correct what left. Only a change of sign is followed. Setting one side to zero leaves the other side as it is, and when both sides are edited together, each keeps what you set.
- **Moving a transfer** to another account in the same currency as before keeps the amount; moving it to an account in another currency asks again.
- **Duplicating a transfer** keeps the other side's amount from the original.
- **Transfers created for you**, by schedules, rules, bank sync or when closing an account into one with another currency, use the exchange rate of their date. Without a rate the amount counts 1:1. A transfer created without an amount gets the exchange rate of its date once it gets one.
- **Make transfer** links two existing transactions in different currencies when one is money out and the other money in, keeping both amounts as they are.
- Hover the information icon next to the payee of a transfer between currencies to see what arrived on the other side and the rate it amounts to. On mobile, it is shown under the payee.

![Hovering a transfer shows what left the other account and the rates](/img/experimental/multi-currency/multi-currency-transfer-details@2x.webp)

<img width="320" alt="On a phone, the transfer details sit under the payee" src="/img/experimental/multi-currency/multi-currency-transfer-mobile@2x.webp" />

Fees and spread aren't recorded as a separate expense. They are only there to tell you what the transfer cost: what your bank or service took out and paid in are the amounts that count, and the exchange rate of the day measures how far apart they are. A promotional rate, such as a first-transfer offer, can even show a negative cost, a gain. Totals and reports convert each side on its own, so the cost shows up as the difference in value between what left and what arrived. The budget doesn't count transfers between on-budget accounts, so that difference also adds to the gap between the budget and the account totals described above.

## Known Limitations

- Amounts outside the transactions and balances of an account, such as in rules, schedules and filters, use the format of the default currency. In a budget in yen, an amount in dollars there shows without its cents until you edit it; it is always kept as you entered it.
- Rates can't be fetched automatically yet.
