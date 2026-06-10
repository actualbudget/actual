# Balance Forecast Report

<ExperimentalFeatureWarning issueId="7669" />

## What it is

The Balance Forecast report projects future account balances from your posted transaction history and upcoming scheduled transactions. Use it to spot possible shortfalls, compare date ranges, and see how scheduled income, bills, and transfers may affect your balances over time.

![Balance Forecast report showing projected balances over time](/img/experimental/balance-forecast-report/balance-forecast-report-overview.png)

## How balances are predicted

The report starts by resolving the selected accounts, filters, and forecast date range. It then calculates a starting balance from posted transactions before the forecast begins.

For future dates, Actual expands scheduled transactions into simulated occurrences up to the forecast end date. Schedule rules are applied to those simulated transactions, and transfer schedules generate matching transfer legs when both sides can be assigned to accounts.

For each forecast day, Actual updates the running balance with posted transactions on that day plus simulated scheduled transactions on that day. Monthly granularity shows the same running balance grouped by month.

## Important information

- The forecast is only as accurate as your schedules and the assumptions they represent.
- Account filters limit the forecast to the selected accounts.
- Report filters affect which posted transactions and scheduled transactions are included.
- Schedules without an account can be included when forecasting the total budget balance without an explicit account filter. They cannot be assigned to a specific real account.
- Transfers are included when the forecast can resolve the relevant account information.

## Display options

- **Start / End**: pick the forecast date range.
- **Quick ranges**: choose future presets from the report header.
- **Granularity**: switch between monthly and daily views.
- **Filters**: use the Filter button to narrow the transactions and schedules included in the forecast.
- **Save widget**: save the current report settings back to the dashboard widget.

## Quick troubleshooting

- **Forecast looks flat**: check whether the selected range is too long or whether the balance changes are small relative to the overall account balance.
- **Schedules are missing**: verify that the schedules are active and have enough account information for the selected account scope.
- **Balance looks wrong**: check account filters, report filters, transfer schedules, and whether the relevant future transactions are scheduled.

## Related

- [Reports index](../reports/index.md) — other report types and tips.
- [Schedules](../schedules.md) — manage the scheduled transactions used by the forecast.
