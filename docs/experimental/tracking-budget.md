# Tracking Budget

:::warning
This is an **experimental feature**. That means we’re still working on finishing it. There may be bugs, missing functionality or incomplete documentation, and we may decide to remove the feature in a future release. If you have any feedback, please [open an issue](https://github.com/actualbudget/actual/issues) or post a message in the Discord.
:::

## Enabling the Tracking Budget

The **Tracking Budget** feature can be switched on from the Experimental features section within the Settings page by enabling "Budget mode toggle".
Then scroll up in the settings menu and click "Switch to tracking budgeting".

![](/img/tracking-budget-7.png)

## Creating a Budget

There are several important differences between the **Tracking Budget** and the default **Envelope Budget** type.

- Category balances do not rollover from month to month
- "To Be Budgeted" has been replaced with a "Saved" metric
- Income is forecasted rather than using what is available

![](/img/tracking-budget-1.png)

If you are creating a budget for the first time, here's how it works:

1. Assign the amount of income you expect to receive in the current month.
2. Assign the amount of money you need for each of your categories.

Upon completion of these two tasks for the month, you will see the budgeted totals in the monthly header in gray. The expected savings you will incur for the month will show up in the **Projected Savings** field for the current or future month. When you receive new income or spend from your categories, enter those transactions in the account registers. Your budget is not static, so there will be times when you do not have enough budgeted for your spending. When one of your categories is overdrawn, increase the budgeted amount for that category so it is 0 or greater.

## The Monthly Summary Explained

As you can see in the following example, your total budgeted items show in the right hand side of the summary for both your **Income** and **Expenses** and your actual expenses and income are totaled in the left hand side of the summary. The **Projected Savings** field is calculated from your budgeted income minus budgeted expenses, so expect the **Projected Savings** to decrease when covering overspending.

![](/img/tracking-budget-2.png)

There are useful pie charts next to **Income** and **Expenses** to track your progress visually.

![](/img/tracking-budget-5.png)

- An incomplete green pie means your total expenses or income are less than your total amount budgeted for expenses or income, respectively.

![](/img/tracking-budget-4.png)

- A complete green pie chart means your spending and budget are exactly the same.

![](/img/tracking-budget-6.png)

- A pie chart that has turned red means you have overspent your total budget.

When a new month begins, your **Projected Savings** changes to **Saved** or **Overspent**, depending on your final transactions. The final savings amount calculated for this field is your actual income minus your actual expenses. If you hover your mouse over the **Saved** or **Overspent** text, you can view the breakdown of projected and actual savings for the month.

![](/img/tracking-budget-3.png)

## How Money Rolls Over

Money does not automatically carry over from month to month in the **Tracking Budget**. If you have overspending in any category, you may wish to carry this balance forward into the next month. This can be done by clicking on the **Balance** of the category and select **Rollover Overspending**.

:::note
If you utilize the **Rollover Overspending** feature on a category that is not over spent, the entire spent amount will be forwarded to the next month and the **Saved** amount will increase for the current month.
:::

## Working With the Budget

Some of the features of the **Envelope Budget** are available in the **Tracking Budget**.
:::note
Not all features of the **Envelope Budget** have been implemented in the **Tracking Budget**. If you find critical functionality missing that you need, please submit a request on [GitHub](/contact).
:::

- [Create new budgets for the next month](../budgeting/index.md#creating-a-budget)
- [Rollover negative category balances](../budgeting/index.md#rollover-negative-category-balances)
