# Balance Forecast in Account Graph

<ExperimentalFeatureWarning issueId="7669" />

## What it is

The balance graph at the top of an account page shows the balance day by day, from the oldest transaction until the last posted or scheduled transaction. Posted history is drawn as a solid line and the projection from today onwards as a dashed line, so you can see how your balance will evolve with your schedules.

The graph works for individual accounts and for the All, On budget, Off budget and Closed account views.

Below the graph, a smaller copy shows the whole period with a window over the part that is shown. Drag the window to move it, drag its edges to choose where the graph starts and ends, or click outside it to center it there. Double-click the window to go back to the default: the last year and the whole projection. The percentage compares the balances at the start and end of the shown period.

When hovering the graph, the marker moves between the days where the balance changes.

## Balance on a date

Click the graph to see the account as it will be (or was) on that day:

- A **Balance on** pill appears next to the account balance with the balance at the end of that day. It matches the value shown by the graph.
- The transaction list only shows transactions up to that date, including scheduled transactions, even if they are further away than the upcoming length.
- When the extra balances are expanded, the **Cleared total** and **Uncleared total** are calculated up to that date. Scheduled transactions are part of the uncleared total.

Click the same day again, or the cross on the pill, to go back to the regular view. The account balance itself and reconciliation are never affected by the chosen date.

## How balances are predicted

The projection uses the same engine as the [Balance Forecast report](./balance-forecast-report.md): scheduled transactions are expanded into their future occurrences, schedule rules are applied, transfers move money between both accounts, and occurrences that were already posted are not counted twice.

The graph projects at least as far as the upcoming length configured on the Schedules page, and further if there are posted transactions dated later or a later date has been picked.

## Important information

- The forecast is only as accurate as your schedules. Spending that is not scheduled is not part of the projection.
- The graph marks the lowest projected balance with a dot and shows its date and amount, as long as it is lower than today's balance.
