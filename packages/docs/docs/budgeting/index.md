# How Budgeting Works

The purpose of a budget is to answer simple questions: how much money did I save last month? Do I have enough money to make this purchase? Answering these is simple in an ideal world, but the complexity of real life sometimes makes it hard to see clearly.

There are many approaches to budgeting. Some of the approaches that seem simple at first end up causing more work to keep an accurate budget, or make it easy for hidden expenses to drain your savings.

We find the best way to track your money is rooted in something called **[envelope budgeting](/docs/getting-started/envelope-budgeting.md)**. Instead of predicting how much you'll make and spend and trying to reconcile that with what actually happened, envelope budgeting embraces real income as the source of your budget instead. This means you can only budget money that you already have.

You can think of categories as little funds that you deposit money into. Combined with our rollover system, it provides an intuitive way to handle a lot of things that come up in life. And you know it's always accurately depicting your finances — there's no made up numbers.

Like the tactile feedback of a vibration under your finger, this system tells you when things are right or wrong and provides easy ways to fix it.

## Creating a budget

If you are **creating a budget for the first time**, here's how that works:

1. Your total **account balance** is available to budget. It knows how much cash you have currently, and that is all you can currently budget. (Remember, your budget is always based on your current money!)
2. Click on the **budgeted** column of a category and enter a number for what you think you'll spend that month. **Tip**: don't overthink it. You can always adjust it later.
3. Continue to budget until the **To budget** amount is **0**.
4. You can also [customize the categories](./categories.md).

## The budgeting workflow

Here's the important part: **your budget is not static**. It's not something you set and forget. Maybe you check in and realize your food budget is busted because you hosted a dinner party. No problem — just move money from somewhere else to cover it.

Maybe when the next month starts, you see that your budget didn't really work. Make a new budget based off what you learned!

At a high-level, using the budget looks like this:

1. Every so often, import new transactions and categorize them.
2. Check your budget. If you've already overspent somewhere, you can move money from another category to cover it, or you can wait to cover it next month.
3. If there's any new income, either add it to your current budget or (most likely) hold it for next month.
4. At the end of the month, create a new budget for next month. Ideally, you will use income available from last month to cover the new budget. You will quickly see how much you saved by seeing the leftover **To budget** amount after budgeting for the new month.
5. Move your leftover saved amount into a general savings category or another specific category that you are saving up for.

## How money rolls over

### Income

When you add income for a month, it becomes immediately available to budget. You will see it in the **Available Funds** number at the top of the month. If you don't budget it for this month, it will roll over to the next month and appear in the same **Available Funds** number for that month. You can hover over that number and a popup will show which income came from previous months and the current month.

Most likely, a common workflow will be to "hold" income you make this month for next month's budget. **Optionally, to hold money instead of budgeting it for a month:**

1. Click the **To Budget** amount.
2. Select **Hold for next month** in the menu.

![hold funds](/img/how-it-works/buffer-1.webp)

3. Press <Key k="enter" /> to hold all available money, or enter a custom amount to hold.

This doesn't do anything except take out money from the **To Budget** amount for that month, allowing you to "zero it out" and mark it to be used for later. That money will appear in next month's **To Budget**.

Using Hold for Next Month will ensure that the funds are no longer available to budget in the current month but can still be allocated to the budget in any subsequent month. This will be particularly useful for those who are looking to stop living paycheck to paycheck and instead gradually get one month ahead i.e. living on last month's income rather than this month's.

You can also just leave the **To Budget** amount alone.

It is possible to hold money multiple months ahead. If you do this, those dollars will be taken out of the current month's To Budget, and made available in the next month's To Budget. This can be done for multiple months in a row, if you want to hold the income for 2 or more months. If you need to use that money in the current month to cover over spending, use the **Reset Next Months Buffer** button to bring that money to the current month. This needs to be done for each month there is a hold.

:::note
If you enter a new month and have a negative "To Be Budgeted" amount and you're sure it should be positive, try resetting next month's buffer to bring money that may be held back to the current month.
:::
:::note
If you hold funds regularly, you can [automatically hold funds from specific income categories](./#automatic-holding-of-funds).
:::

### Overspending

When you overspend in a category, that needs to rollover as well. You spent money that wasn't budgeted, so now you need to go back and take it out from somewhere. Doing this keeps your budget intact.

One way to do this would be to simply roll it over into next month's budget for that category, subtracting it from the available amount. This hardly ever works in real life — if you have a food budget it's highly unlikely you'll be able go under it next month just because you overspent on it this month.

Usually you have a couple places that you draw money from to cover overspending. To make it easy, **all overspending is automatically taken out of next month's To budget amount**, and category balances are reset to zero. This makes it easy to make up for it by reducing your budget in some other category (like savings).

If there is money leftover in a category at the end of a month, it simply rolls over into the category's balance next month.

## Working with the budget

### Moving money around

You can move money between categories, as well as between the **To budget** amount and categories.

1. Click an amount in the **Balance** column for a category.
2. Select **Transfer to another category**.
3. Enter an amount you would like move, select the target category (or **To budget**), and click **Transfer**.
4. Your budget will be updated with the new amounts.

You can also click the **To budget** amount and transfer to a category.

### Creating new budgets for the next month

You need to create a new budget each time a new month begins. It wouldn't make sense for categories to be budgeted for that month already since cash needs to come from somewhere. Hopefully, by the time a new month rolls around you've got enough income from last month to create another budget month:

1. One option is to go through all of the **Budgeted** amounts and enter amounts again.
2. To speed this up, use budget shortcuts. Click the 3-dot menu in the top-right of a budget month and select **Copy last month's budget** to use the same budget as last month.
3. Other options in the menu will fill in the budget with various amounts.

### Rollover negative category balances

Sometimes you want to keep a negative balance in a category across months. The most common reason is to keep track of reimbursable expenses.

1. Click an amount in the **Balance** column for a category.
2. Select **Rollover overspending**
3. For all future months, a negative balance will stay in the category

### Automatic Holding of Funds

Sometimes, you want to be consistently holding funds for future months.
For example, if you use the "Month Ahead" strategy and reserve all income from the current month for the next month, keeping the held funds up to date and accurate can be a lot of work.
You can automate holding funds from specific income categories for future months by clicking the income total and enabling the auto hold for that category.

![Auto hold funds menu](/img/how-it-works/auto-hold.webp)

When the _auto hold_ function has been enabled for an income category, this will be indicated by an arrow.
The income category will be set for automatic holding starting from the current month and the following 12 months.
If wanted, the _auto hold_ functionality can be turned off by clicking the income balance and choosing "Disable auto hold".

![Auto hold indicator](/img/how-it-works/auto-hold-carryover.webp)

If you need to modify the _held funds_ later in the month, you can disable the auto hold for the current month by clicking the budget value and choosing "Disable current auto hold."
You may then set the held funds like normal and the _auto hold_ will still be set in the future.

![Auto hold disable current month](/img/how-it-works/auto-hold-disable.webp)
