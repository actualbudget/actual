# Budget Automation

:::warning
This is an **experimental feature**. That means we're still working on finishing it. There may be bugs, missing functionality or incomplete documentation, and we may decide to remove the feature in a future release. If you have any feedback, please [use the feedback issue on github](https://github.com/actualbudget/actual/issues/7692) or post a message in the Discord.
:::

:::warning
All functionality described here may not be available in the latest stable release. See [Experimental Features](/docs/experimental/) for instructions to enable experimental features. Use the `edge` images for the latest implementation.
:::

Budget automations allow you to automate your budgeting step every month.
With budget automations, there is no need to manually fill in each category each month.
With one click you can fill in your entire budget based on the automations you have added. At the end of the month, another click can clean up what’s leftover!

Here are a few examples of what you can do, all with a single click!

- Budget $ 100 every month
- Budget $ 50 every other week
- Refill a category to $ 300 at the start of a month
- Add all leftover funds to a savings category
- Budget 10% of your income for savings or charity
- Budget the average you spend over the last 6 months
- Save up for a big purchase many months or years in the future, and let Actual dynamically figure out how much to budget every month
- And much more!

## Notes Templates & UI Migration

For any given category, there is one source of truth for Budget automations, either the UI or the notes, not both.

If you have a notes template, the first time you open the UI (clock icon) you will be presented with migration automation(s). Click to show the original notes templates at the top of the form for comparison.

![alt-text-here](/img/goal-template/migration.webp)

Make any changes you feel are needed, then _Save_ the form to complete the migration. The notes can now be deleted.

## Creating Automations {/_ #create-automations _/}

Click on the clock icon that appears when you hover over a category name.

![alt-text-here](/img/goal-template/automation-icon.webp)

![alt-text-here](/img/goal-template/new-automation.webp)

From this opening view, you can

A. Add a new budget automation

B. Add a long-term goal

C. Add month-end cleanup to the category

:::info
Balance caps can only be added to existing budget automations
:::

You can have multiple automations!

![alt-text-here](/img/goal-template/multiple-automations.webp)

:::tip
The projected amount to be budgeted will be shown in the top right of the automation form. This will update with the category’s automations.
:::

### Priorities {/_ #priorities _/}

Most of the budget automations will have a priority field that you can use to set the order in which the automations are run, from lowest to highest.

- Negative priorities are not allowed.
- All priority 0 are run first, then 1, 2, 30, 36, etc. So the automation that has the highest priority in importance actually has the lowest priority **number**.
- All priorities with the same number will run in database order. To ensure the budget fills in the exact order you wish, give each automation a different priority number.

:::warning
Priority 0 automations will budget funds even if they are not available in **To Budget**. Priorities other than 0 will **not** budget more funds than are available.
If you have multiple _Cover schedule_ or _Save by date_ automations in a single category, their priorities **must** match.
:::

:::tip
When you first start using priorities, space them 10 numbers apart so you have room to insert additional priorities later.
:::

### Fixed Amount {/_ #fixed-amount _/}

![alt-text-here](/img/goal-template/fixed-amount-automation.webp)

This is the simplest type of automation. The amount (A) will be budgeted at the cadence you choose (B & C) with the starting date you set (D).

:::info
For weeks or days, the entire month will be budgeted based on the number of weeks/days in that month.
For weeks, the number of weeks in a month is based on the weekday of your start date. Our start date above is on a Saturday. There are 5 Saturdays in May 2026, so the automation projects a budget of 250.00.
:::

:::tip
You can give different priorities to multiple _Fixed amount_ automations in the same category and they will be respected when the budget fills. For example, if you want only half of your $500 food budget to fill at month start, create two $250 automations in the **Food** category, one with a low priority and one with a priority higher than the last priority that available funds will fill at month start. When you have more funds later in the month, run automations again for that category and the automation will fill it.
:::

### Save by Date {/_ #save-by-date _/}

![alt-text-here](/img/goal-template/save-by-date-automation.webp)

Use this automation to save up the desired amount (A) by a specific month (B).

The automation determines how much to budget each month to meet your savings goal. If you add or remove funds along the way, it recalculates the remaining monthly amounts so you still reach your target on time.

Options:

- **Repeat** (C). You can repeat the automation if your target is cyclical, such as bills due quarterly or yearly. If you need to repeat based on a number of days or weeks, use the _Fixed amount_ automation.
- **Allow early spending** (D). This option allows you to spend funds along the way. Starting in the month you choose, you can spend from the category without the automation recalculating the remaining monthly amounts. By the target date, the remaining balance will be the amount you did not spend earlier. This option is handy for times when spending happens months before the event, like travel savings, wedding plans or the birthday gifts in our example.

:::warning
All _Save by date_ automations in the same category must have the same priority.
:::

### Cover Schedule {/_ #cover-schedule _/}

![alt-text-here](/img/goal-template/schedule-automation.webp)

This automation budgets based on a schedule previously added to actual.
Pick a schedule (A) and a mode (B).

There are two modes:

- **Save for the next occurrence.** The automation budgets a portion of the scheduled amount each month so the full amount is ready when needed.
- **Cover each occurrence when it occurs.** The automation budgets for the schedule only in the month it occurs. It will budget the full scheduled amount.

You can adjust the schedule in the schedule editor and the automation will stay up to date automatically.

:::warning
All _Cover schedule_ automations in the same category must have the same priority.
:::

### % of Income {/_ #percentage _/}

![alt-text-here](/img/goal-template/percentage-automation.webp)

This automation budgets a percentage of income from this month or last month, or a percentage of available funds from this month.

When you click in the Category field, you will be presented with current choices to base the percentage on.

![alt-text-here](/img/goal-template/percentage-category.webp)

- **Total of all income.** This month or Last month. The _Inflow to Budget, Received_ column in the budget will be used.
- **Available funds to budget.** This month only. The available amount after Priority 0 and other automations with lower or equal priorities have run will be used.
- **Specific income categories.** This month or Last month. The percentage will be based on the single income category you choose.

### From History {/_ #from-history _/}

![alt-text-here](/img/goal-template/historical-automation.webp)

For this automation, you can choose to budget based on historical data.
Choose a mode (A) and the number of months back (B).

Modes:

- **Copy a previous month.** This will copy the **budget** from a previous month.
- **Average of previous months.** This will average the **spending** from the previous number of months you choose.

### Refill to Cap

![alt-text-here](/img/goal-template/refill-automation.webp)

This automation requires a [Balance cap](#balance-cap) and will refill the category to the cap.

Click on _Add balance limit_ and you will be taken to the Balance cap automation. After you add a balance cap, the refill automation will be active.

![alt-text-here](/img/goal-template/refill-active.webp)

### Whatever is Left {/_ #remainder _/}

![alt-text-here](/img/goal-template/remainder-automation.webp)

After all of the other automations have run, the leftover of **To Budget** will be doled out by these remainder automations based on the weights you choose. They run last, in a separate pass.

- You can have as many remainder automations as you like.
- Remainder automations will respect any balance caps in place.
- If you want **To Budget** = 0.00 after these run, make sure at least one of them is in a category without a balance cap.

#### Weights {/_ #remainder-weights _/}

The sum of the weights of all remainder automations is used to determine the split amounts:
`budgeted_amount = available_funds / sum_of_weights * category_weight`
If a category has a balance cap, the automation will fill to the cap, subtract that amount from the available funds, then make another pass.

Example:

Starting with $100 leftover in **To Budget** and 0.00 in all of our three categories below.
**Snack Fund** has a balance cap of 40.00.

Pass 1: Snacks, 100 / 6 \* 3 = 50 (exceeds the cap, so Snack Fund receives 40.00, To Budget is now 60)

Pass 2: Vacation, 60 / 3 _ 1 = 20 (Vacation Fund receives 20.00)
Investment, 60 / 3 _ 2 = 40 (Investment Fund receives 40.00)

| Category        | Weight | Balance cap? | Amount applied |
| --------------- | :----: | :----------: | :------------: |
| Snack Fund      |   3    |  Yes, 40.00  |     40.00      |
| Vacation Fund   |   1    |      No      |     20.00      |
| Investment Fund |   2    |      No      |     40.00      |

## Balance cap {/_ #balance-cap _/}

![alt-text-here](/img/goal-template/balance-cap.webp)

Budget automations will not add funds above the cap you set. If the category balance exceeds the cap, the next budgeting pass will remove the excess. To keep any extra funds in the category, enable Retain existing funds over the cap. When this option is turned on, the next budgeting pass will leave the excess in place.

All automations in the category will be subject to the cap.

Examples:

Here’s an interesting example of budgeting money for a meal out every Saturday night and weekday work lunches in the same category.

- The Saturday night meals are budgeted at 50.00/week starting on a Saturday.
- The weekday lunches are budgeted at 35.00/week starting on a Monday.
- The Balance cap is set at 85.00 week based on Mondays.

June, 4 Saturdays and 5 Mondays:

![alt-text-here](/img/goal-template/june-restaurants.webp)

July, 4 Saturdays and 4 Mondays:

![alt-text-here](/img/goal-template/july-restaurants.webp)

August, 5 Saturdays and 5 Mondays:

![alt-text-here](/img/goal-template/august-restaurants.webp)

October, 5 Saturdays and 4 Mondays. Our budget looks different as the Balance cap is based on the 4 Mondays! So, the budget covers 4 Saturday meals and 4 work weeks.

![alt-text-here](/img/goal-template/october-restaurants.webp)

Here’s another example. We get our paycheck on Friday, every other week. We want to budget $300 from each paycheck to groceries, but not in months with 3 paychecks, so we place a 600.00 balance cap on our category and start the _Fixed amount_ automation on a payday.

There are 3 paydays in July, but the Balance cap holds our grocery budget at 600.00:

![alt-text-here](/img/goal-template/july-food.webp)

## Long-term Goals and Budget Indicators {/_ #long-term-indicators _/}

### Budget Indicator {/_ #budget-indicator _/}

After automations run, each category’s budget indicator appears as the color of its balance text. Hover over a balance to see the matching tooltip.

The example below shows these states: normal (no automation), empty (no automation), projected budget met (green), projected budget not met (orange), and negative balance (red).

![alt-text-here](/img/goal-template/budget-indicators.webp)

The tooltip will give you more information about your budget and balance:

![alt-text-here](/img/goal-template/fully-funded-automation.webp)

![alt-text-here](/img/goal-template/underfunded-automation.webp)

### Long-term Goal {/_ #long-term-goal _/}

![alt-text-here](/img/goal-template/long-term-automation.webp)

Long-term goals change how the budget indicator works. Instead of being based on the budgeted amount, the long-term goal will indicate how much progress you have made toward a desired target. Importantly, if you have met your projected budget for the month but are shy of your long-term goal the balance will remain orange.

Once you hit your goal, the balance will turn green. Note that if you remove funds and fall short, it will turn orange again.

:::tip

- The long-term goal does not automatically add funds or stop funds from being added after the goal has been hit. To stop automated funds from being added after you reach the goal, add a _Balance cap_ to the category.
- You can have a long-term goal without any other automations and budget manually toward your goal. You will still need to run the automations on the category to see the indicator and tooltip.
  :::

The tooltip will give you information regarding your progress:

![alt-text-here](/img/goal-template/long-term-underfunded.webp)

![alt-text-here](/img/goal-template/long-term-fully-funded.webp)

![alt-text-here](/img/goal-template/long-term-overfunded.webp)

## Running automations {/_ #run-automations _/}

### How to apply the automations {/_ #applying-automations _/}

#### Apply all automations {/_ #apply-all-automations _/}

In the budget header menu you will see the following options:

![Apply options on month level](/img/goal-template/goal-template-2.webp)

- **Check templates** will test all automations.

- **Apply budget template** will run all automations in categories that currently have 0.00 budgeted. This will leave any existing budget amounts intact.

- **Overwrite with budget template** will fill in all budget cells using automations and overwrite any already existing budget amounts. This is the recommended method if you are using priorities greater than 0.

#### Apply automations selectively {/_ #apply-selective-automations _/}

- **Single Category**: Use the "Overwrite with template" option shown below from the budget field drop-down menu to apply automations to just that category. This will overwrite any existing budgeted amount.

![Apply templates to single category](/img/goal-template/apply-template-category.png)

- **Apply automations to a single category group**: Use the "Overwrite with templates" option shown below from the category group drop-down menu to apply all automations to categories in a specific group. If you are viewing multiple months, it will apply them to the month furthest to the left in your budget view. This will overwrite any existing budgets in the categories in the group.

![Apply templates to a group of categories](/img/goal-template/apply-template-group.png)

---

## Adjustments {/_ #adjustments _/}

Yearly expenses (e.g. insurance, property rates, etc.) increase year on year. Often the amount is unknown until close to the due date. This creates a budget crunch - if your $ 1,000 insurance jumps 20% ($ 1,200), you need to make up that extra $ 200 in just a month or two.

This feature adds adjustments to the template (either percentage or fixed), letting you gradually save the expected increase throughout the year. By proactively budgeting a percentage/fixed change for these yearly increases, you avoid last-minute scrambling when renewal notices arrive with higher amounts.

| Syntax                                                                       | Description                                                                                               |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `#template schedule {SCHEDULE NAME} [{increase/decrease} {number\|number%}]` | Fund the upcoming scheduled transaction over time, increasing or decreasing the amount by the given value |

As an example, assume the amount scheduled for 'Insurance' the prior year was $ 1000 and $ 83.33 was budgeted monthly; the below will apply.

| Category  | Template line                                 | Monthly Budget | Annual Budget |
| --------- | --------------------------------------------- | :------------: | :-----------: |
| Insurance | `#template schedule Insurance [increase 20%]` |     $ 100      |    $ 1200     |
| Insurance | `#template schedule Insurance [increase 500]` |     $ 125      |    $ 1500     |

When "Insurance" comes due at the end of the year, $1200 will be available for the first example, or $1500 for the second example.

#### Available Variations

Below is a table of the variations of the Schedule template.

| Syntax                                                                       | Description                                                                                           | Example Application                                             |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `#template schedule {SCHEDULE NAME}`                                         | Fund upcoming scheduled transactions over time                                                        | Monthly schedules, or larger non-monthly scheduled transactions |
| `#template schedule full {SCHEDULE NAME}`                                    | Fund upcoming scheduled transaction only on needed month                                              | Small schedules that are non-monthly                            |
| `#template schedule {SCHEDULE NAME} [{increase/decrease} {number\|number%}]` | Fund upcoming scheduled transaction over time, increasing or decreasing the amount by the given value | Yearly renewals where the amount changes                        |

### Average Type

This template allows you to budget based on the average amount spent over a number of months, adding flexibility beyond the menu built-ins (3 months, 6 months).

You can also adjust the budgeted amount from the average by a percentage or by a fixed whole number. This functionality may be useful when you want to budget an average, but bump it up or down a bit to account for inflation or to slowly wean off a category you'd like to spend less on. (See also [adjustments](#adjustments))

| Syntax                                                                      | Description                                                                                                                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `#template average {number} months`                                         | Budget the average amount spent over the last `{number}` months. Can set the number to any number > 0. Matches the existing option on the budget page but with flexible month ranges |
| `#template average {number} months [{increase/decrease} {number\|number%}]` | Budget the average amount spent over a period, with an adjustment                                                                                                                    |

#### Examples

As an example, assume the spend for the category was [\$40, \$50, \$60] for the past 3 months; here are some example usages.

| Template line                               | Budgeted Amount |
| ------------------------------------------- | :-------------: |
| `#template average 3 months`                |      \$ 50      |
| `#template average 3 months [increase 20%]` |      \$ 60      |
| `#template average 3 months [decrease 10%]` |      \$ 45      |
| `#template average 3 months [increase 11]`  |      \$ 61      |
| `#template average 3 months [decrease 1]`   |      \$ 49      |

## Month-end Cleanup {/_ #month-end-cleanup _/}
