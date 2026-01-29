# Budget Templates

:::warning
This is an **experimental feature**. That means we're still working on finishing it. There may be bugs, missing functionality or incomplete documentation, and we may decide to remove the feature in a future release. If you have any feedback, please [open an issue](https://github.com/actualbudget/actual/issues) or post a message in the Discord.
:::
:::warning
All functionality described here may not be available in the latest stable release. See [Experimental Features](/docs/experimental/) for instructions to enable experimental features. Use the `edge` images for the latest implementation.
:::

Budget templates allow you to automate your budgeting step every month.
For example, a template like `#template 100` in a Food category will automatically budget $ 100 in your Food category when templates are run.
With budget templates there is no need to manually fill in each category each month.
With one click you can fill in your entire budget based on the templates you have added.

Here are a few examples of what you can do with templates, all with a single click!

- Budget $ 100 every month
- Budget $ 50 every other week
- Refill a category to $ 300 at the start of a month
- Add all leftover funds to a savings category
- Budget 10% of your income for savings or a tithe
- Budget the average you spend over the last 6 months
- Save up for a big purchase many months in the future, and dynamically figure out the budget needs
- And much more!

## Using Templates

### How to add a template

Create a template by adding a note to a category and adding a line that contains `#template` or `#goal` with the appropriate syntax.
The example below shows the most basic template syntax `#template 72.99`.
This will budget $ 72.99 when templates are run without having to manually type in the amount.

![How to add a template](/img/goal-template/goal-template-1.webp)

### How to apply the templates

#### Apply all templates

In the budget month menu you will see the following options:

![Apply options on month level](/img/goal-template/goal-template-2.webp)

- **Check templates** will test all `#template and #goal` lines for proper syntax.

- **Apply budget template** will run all templates in categories that currently have 0 budgeted.
  This will leave any existing budget amounts intact.

- **Overwrite with budget template** will fill in all budget cells using the templates and ignore any already existing budget amounts.
  This is the recommended method if you are using template priorities.

#### Apply only specific templates

You can also apply selections of templates if you want.

- **Single Category**: Use the "Overwrite with template" option shown below from the budget field drop-down menu to apply templates to just that category.
  This will overwrite any existing budgeted amount.

![Apply templates to single category](/img/goal-template/apply-template-category.png)

- **Apply templates to a single category group**: Use the "Overwrite with templates" option shown below from the category group drop-down menu to apply all templates to categories in a specific group.
  It will apply to the month furthest to the left in your budget view if viewing multiple months.
  This will overwrite any existing budgets in the categories in the group.

![Apply templates to a group of categories](/img/goal-template/apply-template-group.png)

### Goal Indicators

After having run the templates in a given month and category, the status of a respective category goal will be indicated as a text color of the category balance.
The image below shows an example of categories in the following states: normal (no goal set), empty (no goal set), goal met(green), goal not met(orange), and a negative balance(red).

![Goal indicator colors example](/img/goal-template/templates-colors.webp)

This goal value is based on the maximum amount that the templates in a category request to be budgeted.

#### Goal Indicator Information

If you hover over the balance value in a templated category, a tooltip will appear with info on the status of that category with respect to its templates.

#### Long term goals

By default, the goal information displayed in the goal indicator is shown on a monthly basis. It's what fully budgeting your templates would require for **this month**. The indicator color is based on the `Budgeted` amount and whether it meets the amount requested by the category templates.

If you would like the goal and associated indication color to be based on the category `Balance` instead of the budgeted amount, see the [Goal Directive option](#goal-directive).
This is a special template that overrides the goal amount and bases the goal indicator on category balance.

![Goal indicator information tooltip](/img/goal-template/goal-indicator.webp)

### Multiple Template Lines

You can add multiple `#template` lines for a single category note. Each line will be added together.

For example:

**Streaming Services: 42.97**

```
Netflix
#template 24.99
Disney Plus
#template 9.99
Amazon Prime
#template 7.99
```

**100 every month and an additional 10 every fortnight**

```
#template 10 repeat every 2 weeks starting 2025-01-04
#template 100
```

### Template Priorities

Templates can be given a priority flag to change the order that the templates get applied to your budget. Set a priority by adding `-X` to the `#template` flag. EX `#template-4` will be priority level 4. Any template with a priority other than 0 will not apply more funds than are available.

#### Notes on Priorities

- Lower priority values get run first. EX 0 is run first, then 1, then 2, etc.
- A `#template` with no priority flag defaults to priority 0 and is the same as a standard template.
- Negative priorities are not allowed and will result in the template being skipped.
- Template application order is based on the database order, not the view order. To guarantee a specific fill order use separate priorities for each category.
- If you have multiple `schedule` or `by` template lines in a single category, they will be forced to match the same priority level as the line run first.
- It is recommended to use the "overwrite with budget template" option when applying templates if you use priorities.
  - **Expected budgeted amount is 200**
    **Expected maximum category balance is 200**

    ```
    #template 300
    #template-1 150 up to 200
    ```

### Notes on all templates

- All templates are a single line in the category notes. Depending on your screen size, they may visually render as multiple lines. When adding a template, do not put a return (or "enter") within a single template, or the parsing will not properly handle your template.
- Don't add a currency symbol to your template amounts.
- Number formats that use comma for the decimal separator are not supported (e.g., 123,45). You must use 123.45.
- Thousands separators are not supported (e.g., 1,234). You must use 1234.
- By default, templates do not consider available funds when being applied. Use template priorities to ensure only the amount available to budget is assigned.
- If you have the "Hide decimal places" setting enabled, templates will round away all decimal amounts. This way, you won't have funds budgeted that you can't see on your budget table.

## Available Templates

There are many types of templates you can use to tailor how categories get filled to match your personal budgeting needs.

### Simple Type

The simple template type is the most basic type of template.
The base template will budget the amount you ask it to.
Simple!
This template also has a few variations making it likely the most used template out of the available options.

Below is an example of how it works.
The template budgets just what you ask, no matter how much the respective category has in its balance.

| Syntax         | Budgeted Amount |
| -------------- | :-------------: |
| `#template 50` |      $ 50       |

There is also a useful variation of a simple template.
This variation will put a **limit** on how much the balance of a category can be that month.
Here are some examples of how this is used

| Syntax                   | Previous Balance | Budgeted Amount | New Balance |
| ------------------------ | :--------------: | :-------------: | :---------: |
| `#template 50 up to 100` |       $ 80       |      $ 20       |    $ 100    |
| `#template 50 up to 100` |       $ 20       |      $ 50       |    $ 70     |

Isn't that neat?
This is especially useful for budget categories that have month-to-month variation in spending such as groceries.
You can budget the same amount per month, but save up from one month to the next without having to worry about building up more funds than you need.

The last variation of the simple template is sometimes referred to as a "refill".
With this style the template budgets whatever it takes to hit a "full" amount.

Here is how it works:

| Syntax                | Previous Balance | Budgeted Amount | New Balance |
| --------------------- | :--------------: | :-------------: | :---------: |
| `#template up to 150` |       $ 10       |      $ 140      |    $ 150    |
| `#template up to 150` |      $ -20       |      $ 170      |    $ 150    |

Cool, right? This is another way to gracefully handle categories that have month-to-month variation.
This will always give you the same amount available each month no matter what you spend the previous month and not ever build up more funds than you need.
This variation along with the previous variation, are probably the most used templates.
They are simple enough to use easily, but are robust enough to make budgeting much simpler.

**Notes**:

- **No more than one** template that uses `up to` is allowed in any single category.
- If a category contains an `up to X`, the whole category will be subject to that limit even if there are other templates and priorities.

#### All Variations

There is more flexibility with the limit part of the template.
By default, the limit (the `up to X` part of the template) is based per month.
You can modify the limit to be per week or per day if that matches your needs better.
You can also modify the limit to not ever remove funds over your limit.
This can be useful if you get refunds or reimbursements that you would like to have remain inside a category even if over your limit.
Below is examples of these different variations of simple templates.

| Syntax                                             | Description                                                     | Example Application                                                         |
| -------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `#template 50`                                     | Budget 50 each month                                            | Regular monthly bills, such as internet                                     |
| `#template 50 up to 300`                           | Budget 50 each month up to a maximum of 300                     | Funding rainy day categories, such as replacement shoes and bicycle repairs |
| `#template up to 150`                              | Budget up to 150 each month, and remove extra funds over 150    | Variable expenses, such as petrol and groceries                             |
| `#template up to 150 hold`                         | Budget up to 150 each month, but retain any funds over 150      | Variable expenses that may get refunds or reimbursements                    |
| `#template up to 5 per day`                        | Budget up to 5 per day that month, and remove extra funds       | Setting a daily coffee budget                                               |
| `#template up to 100 per week starting 2024-10-07` | Budget 100 per week starting on Mondays, and remove extra funds | Setting a weekly grocery budget                                             |

### By Type

The **By** type of template is for saving up funds _by_ a certain month.
For example, it is January and you are trying to save for a new car by the end of the year.
If the new car will cost $ 10,000 and you plan to buy it in December, you will use something like the following:

| Syntax                       | Budgeted Amount |
| ---------------------------- | :-------------: |
| `#template 10000 by 2025-12` |    $ 833.33     |

That example is pretty basic.
The by template is smarter than just 10000/12.
Lets say the example is the same, but you already have $ 1,500 saved.
In that case you get this.

| Syntax                       | Previous Balance | Budgeted Amount | New Balance |
| ---------------------------- | :--------------: | :-------------: | :---------: |
| `#template 10000 by 2025-12` |     $ 1,500      |    $ 708.33     | $ 2,208.33  |

Nice!
This even works if you add more funds later.
The template will always divide up the remaining amount you need by the remaining number of months.
If you need to pull funds away from your car savings to cover an emergency house repair, the template will budget more in the coming months to stay on track.
If you have extra funds one month and add that to your car savings, the template will budget less in the coming months since you need less.

**Note**: The date must be in YYYY-MM format.

#### Repeated savings

The By template can also repeat if your savings is cyclical, such as yearly taxes or insurance.
The repeat period can be both a number of months or number of years.
If you need to repeat based on a number of weeks, use the Week template.
In that case use the following variation:

| Syntax                                       | Budgeted Amount | Note                              |
| -------------------------------------------- | :-------------: | --------------------------------- |
| `#template 500 by 2025-03 repeat every year` |    $ 166.66     | Assuming starting in January 2025 |
| `#template 500 by 2025-03 repeat every year` |     $ 41.66     | All months after March 2025       |

#### By Spend

The By template can be extended to allow some of the funds to be spent along the way.
This is most commonly used for holiday savings where you will spend some of the money in the months leading up to the holiday.
An example of this is buying Christmas gifts in November and December.
The table below shows how this works.

| Syntax                                        | Budgeted Amount | Spent so far | New Balance        | Note                                                                            |
| --------------------------------------------- | :-------------: | :----------: | ------------------ | ------------------------------------------------------------------------------- |
| `#template 500 by 2025-12 spend from 2025-11` |     $ 41.66     |      0       | previous + $ 41.66 | Assuming starting in January 2025, all months before December                   |
| `#template 500 by 2025-12 spend from 2025-11` |     $ 41.66     |    $ 100     | $ 400              | Assuming the beginning of December, but have not spent anything in December yet |

#### Available Variations

Below is a table of the variations of the By template.

| Syntax                                                             | Description                                                                                               | Example Application                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `#template 500 by 2027-03`                                         | Break down large, less-frequent expenses into manageable monthly expenses                                 | Saving for a replacement car in a few years                                                                          |
| `#template 500 by 2025-03 repeat every 6 months`                   | Break down large, less-frequent expenses into manageable monthly expenses                                 | Biannual credit card fees                                                                                            |
| `#template 500 by 2025-03 repeat every year`                       | Break down large, less-frequent expenses into manageable monthly expenses                                 | Annual insurance premium                                                                                             |
| `#template 500 by 2025-03 repeat every 2 years`                    | Break down large, less-frequent expenses into manageable monthly expenses                                 | Domain name renewal                                                                                                  |
| `#template 500 by 2024-12 spend from 2024-03`                      | Budget 500 by December. Any spending between March and December is OK                                     | Christmas presents, overseas holiday, or any other expenses where spending will start before the target period ends. |
| `#template 500 by 2024-12 spend from 2024-03 repeat every year`    | Budget 500 by December. Any spending is OK starting in March and repeat this template every year          | Christmas presents, etc.                                                                                             |
| `#template 500 by 2024-12 spend from 2024-03 repeat every 2 years` | Budget 500 by December. Any spending is OK starting in March and repeat this template in 2026 (skip 2025) | Christmas travel every other year                                                                                    |

### Periodic Type

If you have bills that are due on a regular interval, such as biweekly, every 6 weeks, quarterly, or once per year, this is the template for you!
This template is similar to the simple template, but it will be based on a defined period rather than being budgeted on a monthly basis.
You set a period and the start date, and every period, starting from your start date, you will budget the requested amount.
Periods can be set for any number of days, weeks, months, or years.
See the table below for examples.

| Syntax                                                    | Budgeted Amount |              Note               |
| --------------------------------------------------------- | :-------------: | :-----------------------------: |
| `#template 10 repeat every week starting 2025-01-06`      |      $ 50       |  When budgeting in March 2025   |
| `#template 100 repeat every 2 months starting 2025-01-01` |       $0        | When budgeting in February 2025 |
| `#template 100 repeat every 2 months starting 2025-01-01` |      $100       |  When budgeting in March 2025   |

As you can see, the template will be budgeted based on the defined period.

The Periodic template also supports limits the same way the simple template does.
For example, if you budget in January with a limiting template:

| Syntax                                                        | Previous Balance | Budgeted Amount | New Balance |
| ------------------------------------------------------------- | :--------------: | :-------------: | :---------: |
| `#template 10 repeat every week starting 2025-01-06 up to 55` |       $ 20       |      $ 35       |    $ 55     |

#### Available Variations

Below is a table of the variations of the Periodic template.

| Syntax                                                            | Description                                      | Example Application                           |
| ----------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------- |
| `#template 10 repeat every day starting 2025-01-01`               | Budget 10 per day                                | Budget for lunches                            |
| `#template 50 repeat every 30 days starting 2025-01-01`           | Budget 50 every 30 days                          | A bill that is not quite monthly              |
| `#template 10 repeat every day starting 2025-01-01 up to 400`     | Budget 10 per day, up to a maximum of 400        | Budget for lunches, but don't budget too much |
| `#template 50 repeat every week starting 2025-01-03`              | Budget 50 a week                                 | Budget for a weekly date night                |
| `#template 50 repeat every week starting 2025-01-03 up to 300`    | Budget 10 a week, up to a maximum of 80          | Weekly date night, but don't budget too much  |
| `#template 10 repeat every 2 weeks starting 2025-01-04`           | Budget 10 fortnightly                            | Add to a savings category for every paycheck  |
| `#template 500 repeat every 3 months starting 2025-01-01`         | Budget 100 per quarter                           | Taxes that are quarterly                      |
| `#template 1500 repeat every year starting 2025-03-01`            | Budget 1500 every March                          | Yearly insurance premiums                     |
| `#template 1500 repeat every year starting 2025-05-01 up to 2000` | Budget 1500 every March, up to a maximum of 2000 | A summer spending budget                      |
| `#template 1500 repeat every 2 years starting 2025-01-01`         | Budget 1500 in January every other year          |

**Notes**:

- The starting date must be in YYYY-MM-DD format.
- **No more than one** `up to` template is allowed in a single category.
- All limit variations described in the [Simple template](#simple-type) are supported.
- If any single template contains an `up to`, the whole category will be subject to that limit even if there are other templates and priorities.

### Percent Type

The percent template allows you to assign a percent of your income or available funds to a certain category.
Below are the most basic examples.
All the examples assume the following amounts of income in the listed income categories or to budget amount:

- Paycheck - $ 1900
- Dividends - $ 100
- To Budget - $ 1500

| Syntax                             | Budgeted Amount |                            Note                            |
| ---------------------------------- | :-------------: | :--------------------------------------------------------: |
| `#template 10% of all income`      |      $ 200      | Use the total of your income categories in the calculation |
| `#template 10% of Paycheck`        |      $ 190      |                Budget 10% of your paycheck                 |
| `#template 10% of available funds` |      $ 150      |         Budget 10% of the current to budget funds          |

#### Previous Flag

The percent template can also be pointed to the previous month's income if you are using a month ahead budgeting strategy.
Below is an example of how to do that.

| Syntax                                 | Budgeted Amount |                              Note                               |
| -------------------------------------- | :-------------: | :-------------------------------------------------------------: |
| `#template 10% of previous all income` |      $ 200      | Use the total of your income categories from the previous month |
| `#template 10% of previous Paycheck`   |      $ 190      |               Budget 10% of last month's paycheck               |

The previous option is not available when using the percent of available funds template.

#### Available Variations

Below is a table of the variations of the Percent template.

| Syntax                                 | Description                                                             | Example Application                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `#template 15% of all income`          | Budget 15% of all income categories                                     | Using a "pay yourself first" strategy                                                                                |
| `#template 10% of Paycheck`            | Budget 10% of the "Paycheck" income category                            | Using a "pay yourself first" strategy, ignoring other income categories                                              |
| `#template 15% of previous all income` | Budget 15% of all income categories using last month's income           | Using a "pay yourself first" strategy in conjunction with a "month ahead" strategy                                   |
| `#template 10% of previous Paycheck`   | Budget 10% of last month's "Paycheck" income category                   | Using a "pay yourself first" strategy in conjunction with a "month ahead" strategy, ignoring other income categories |
| `#template 12% of available funds`     | Budget 12% of "To Budget" funds available at the current priority level |                                                                                                                      |

### Schedule Type

The Schedule template allows you to automatically budget based on the schedules you have added to Actual.
This includes sub-monthly, month, and extra-monthly schedules.
This is the most common template outside of the Simple template.
Below is an example of the syntax for a $ 100 per month schedule called "Internet", and a $ 2,400 per year schedule called "Taxes".

| Syntax                        | Budgeted Amount |                            Note                            |
| ----------------------------- | :-------------: | :--------------------------------------------------------: |
| `#template schedule Internet` |      $ 100      |             Budget for the "Internet" schedule             |
| `#template schedule Taxes`    |      $ 200      | Build up funds for the "Taxes" schedule that is a year out |

The function of the schedule template is very similar to the By template, but you don't need to adjust both a schedule and a template individually.
You can adjust the schedule in the schedule editor and the template will stay up to date automatically.

:::warning

The schedule name is defined in the **Schedules** editor. **Take great care to copy across these schedule names EXACTLY** or the template will not be able to find the schedule.

:::

#### Full Flag

There is one additional option to the Schedule template, the "Full" flag.
The "Full" flag tells the template to not build up funds over time and budget the full schedule amount in the needed month.
This is useful for small schedules that you don't need to build up over time since the amount is small.
This can also help make stacking Schedule templates easier to track.
Below is an example of using the "Full" flag assuming a once-per-year schedule for $ 15 called "Simplefin" due in May.

| Syntax                              | Budgeted Amount |              Note               |
| ----------------------------------- | :-------------: | :-----------------------------: |
| `#template schedule full Simplefin` |       $ 0       | Budget in all months except May |
| `#template schedule full Simplefin` |      $ 15       |          Budget in May          |

#### Adjustments

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

### Copy Type

The Copy template will copy the budget amount from some number of months prior.
This is useful if your spending is inconsistent per month, but cyclical over a period of months.
The table below shows how to use the Copy template.

| Syntax                              | Description                                                                          | Example Application                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `#template copy from 12 months ago` | Budget the same amount as was budgeted 12 months ago. Number of months is adjustable | Your power bill fluctuates throughout the year, but is about the same in equivalent months between years. |

### Remainder Type

The remainder template will run differently from the other templates. Any remainder templates will be forced to run last in their own pass.
This way, the amount left to budget is the amount that remains after all other templates have had a chance to run.

Remainders will respect limits set by an `up to`.
This limit can be set by the remainder template or by any other template that supports limits.
If all remainder templates are in a category with a limit, there may be funds left over after they have run.
To avoid having funds leftover after the remainder templates have run, always have at least one remainder template that is not limited by an `up to`.

Remainder templates allow an optional weight.
The weight will affect how funds are distributed among multiple remainder templates.
The templates with a higher weight will receive more funds than those with a lower weight.

#### Examples

All of the examples below use the case of 100 leftover when the remainder pass is run.

1. Add all remaining funds to a single category.

| Category | Template line         | Amount applied |
| -------- | --------------------- | :------------: |
| Savings  | `#template remainder` |      100       |

2. Split funds evenly between two categories.

| Category      | Template line         | Amount applied |
| ------------- | --------------------- | :------------: |
| Savings       | `#template remainder` |       50       |
| Vacation Fund | `#template remainder` |       50       |

3. Split funds with one category receiving extra.

| Category      | Template line           | Amount applied |
| ------------- | ----------------------- | :------------: |
| Savings       | `#template remainder 2` |     66.66      |
| Vacation Fund | `#template remainder`   |     33.34      |

4. Spread funds over many categories, but some have limits.

| Category        | Template line                    | Amount applied |
| --------------- | -------------------------------- | :------------: |
| Snack Fund      | `#template remainder 3 up to 40` |     40.00      |
| Vacation Fund   | `#template remainder`            |     21.66      |
| Investment Fund | `#template remainder 2`          |     38.34      |

Notes on using the remainder template:

- You can use as many remainder templates as you want.
- Remainder templates don't have a priority as they will always run last.
- If no weight is provided, the weight will be defaulted to 1.
- Unless the budgeted amount is greater than the set limit, the amount budgeted by the remainder template is calculated as: `budgeted_amount = available_funds / sum_of_weights * category_weight`. If a category hits its limit, the excess funds will be distributed to the other remaining templates based on their weight.
- Remainder templates don't set a goal with the goal indication on the category balance.
- Remainder templates don't affect a goal set by previous templates.
- The remainder template supports all `up to` options given in the [Simple type examples](#simple-type)

### Goal Directive

This option is unique enough to warrant its own directive, `#goal`, instead of the standard `#template` option.
The `#goal` option overrides how the goal indicator typically functions.
In the standard `#templates`, the goal indication colors are based on the current month's budgeted value.
When using the `#goal` option, the indication is based on the total balance.
This shifts the indication to a long-term goal you are saving up to instead of just the current monthly portion.
A few examples have been given to illustrate this difference.

#### Examples

All examples assume that 400 was carried over from the previous month

**1. I'm saving for a large purchase, but I'm still determining how much I can allocate each month.**
In this case, a balance greater than or equal to 500 will set the balance green, marking a met goal.
If you run the template, you get the following:

| Template Line(s) | Amount budgeted | Balance (color) |
| :--------------- | :-------------: | :-------------: |
| `#goal 500`      |        0        |  400 (yellow)   |

If you were able to budget 100 this month, you would then hit your goal and get a green indication.

| Template Line(s) | Amount budgeted | Balance (color) |
| :--------------- | :-------------: | :-------------: |
| `#goal 500`      |       100       |   500 (green)   |

**2. I'm saving for a purchase, but I will budget 50 a month until I reach my goal.**
In this example, a template is used to automatically budget 50 into the category when templates are run.
The `#goal` line will override the goal indication from the `#template` line, and only go green when a balance of 500 is reached.
If you run templates, you get the following:

| Template Line(s)                  | Amount budgeted | Balance (color) |
| :-------------------------------- | :-------------: | :-------------: |
| `#template 50` <br /> `#goal 500` |       50        |  450 (yellow)   |

If you have some extra funds after templates are run and can budget that last 50, you get the following:

| Template Line(s)                  | Amount budgeted | Balance (color) |
| :-------------------------------- | :-------------: | :-------------: |
| `#template 50` <br /> `#goal 500` |       100       |   500 (green)   |

#### Notes on The Goal Directive

- The `#goal` templates are run the same way as the regular `#templates`.
- If there is a `#goal` directive in a category, the goal indicator for that category balance will be based on the goal, not the templates.
- The `#goal` directive will not budget any funds.
- A `#goal` line can be stacked with `#templates` to automatically budget the category (via the templates) but override how the category goal is indicated (the goal template).
- There is no priority on a `#goal`.
