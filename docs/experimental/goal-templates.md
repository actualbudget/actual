# Budget Templates

:::warning
This is an **experimental feature**. That means we’re still working on finishing it. There may be bugs, missing functionality or incomplete documentation, and we may decide to remove the feature in a future release. If you have any feedback, please [open an issue](https://github.com/actualbudget/actual/issues) or post a message in the Discord.
:::
:::warning
All functionality described here may not be available in the latest stable release. Use the `edge` images for the latest implementation.
:::

Budget templates allow you to automate your budgeting step every month.
For example, a template like `#template 100` in a Food category will automatically budget $ 100 in your Food category when templates are run.
With budget templates there is no need to manually fill in each category each month.
With one click you can fill in your entire budget based on the templates you have added.

Here are a few examples of what you can do with templates, all with a single click!
* Budget $ 100 every month
* Budget $ 50 every other week
* Refill a category to $ 300 at the start of a month
* Add all leftover funds to a savings category
* Budget 10% of your income for savings or a tithe
* Budget the average you spend over the last 6 months
* Save up for a big purchase many months in the future, and dynamically figure out the budget needs
* And much more!

## Using Templates

### How to add a template
Create a template by adding a note to a category and adding a line that contains `#template` or `#goal` with the appropriate syntax.
The example below shows the most basic template syntax `#template 72.99`.
This will budget $ 72.99 when templates are run without having to manually type in the amount.

![How to add a template](/img/goal-template/goal-template-1.png)

### How to apply the templates

#### Apply all templates

In the budget month menu you will see the following options:

![Apply options on month level](/img/goal-template/goal-template-2.png)

* **Check templates** will test all `#template and #goal` lines for proper syntax.

* **Apply budget template** will run all templates in categories that currently have 0 budgeted.
This will leave any existing budget amounts intact.

* **Overwrite with budget template** will fill in all budget cells using the templates and ignore any already existing budget amounts.
This is the recommended method if you are using template priorities.

#### Apply only specific templates

You can also apply selections of templates if you want.

* **Single Category**: Use the "Apply budget template" option shown below from the budget field drop down to apply templates to just that category.
This will overwrite any existing budgeted amount.

![Apply templates to single category](/img/goal-template/apply-template-category.png)

* **Apply templates to a single category group**: Use the "Apply budget templates" option shown below from the category group drop down to apply all templates to categories in a specific group.
It will apply to the month furthest to the left in your budget view if viewing multiple months.
This will overwrite any existing budgets in the categories in the group.

![Apply templates to a group of categories](/img/goal-template/apply-template-group.png)

### Goal Indicators
After having run the templates in a given month and category, the status of a respective category goal will be indicated as a text color of the category balance.
The image below shows an example of categories in the following states: normal (no goal set), empty (no goal set), goal met(green), goal not met(orange), and a negative balance(red).

![Goal indicator colors example](/img/goal-template/templates-colors.png)

#### Goal Indicator Information
If you hover over the balance value in a templated category, a tooltip will appear with info on the status of that category with respect to its template.

![Goal indicator information tooltip](/img/goal-template/goal-indicator.png)

### Multiple Template Lines

You can add multiple `#template` lines for a single category note. Each line will be added together.

For example:

**Streaming Services: 42.97**

    Netflix
    #template 24.99
    Disney Plus
    #template 9.99
    Amazon Prime
    #template 7.99

**100 every month and an additional 10 every fortnight**

    #template 10 repeat every 2 weeks starting 2025-01-04
    #template 100

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

        #template 300
        #template-1 150 up to 200
       
    - **Expected budgeted amount is 450** 
    **No maximum category balance exists**

        #template 150 up to 500
        #template-1 300



### Notes on all templates

- All templates are a single line in the category notes.  Depending on your screen size, they may visually render as multiple lines.  When adding a template, do not put a return (or "enter") within a single template, or the parsing will not properly handle your template.
- Don't add a currency symbol to your template amounts.
- Number formats that use comma for the decimal separator are not supported (e.g., 123,45). You must use 123.45.
- Thousands separators are not supported (e.g., 1,234). You must use 1234.
- By default, templates do not consider available funds when being applied. Use template priorities to ensure only the amount available to budget is assigned.

## Available Templates

There are many types of templates you can use to tailor how categories get filled to match your personal budgeting needs.

### Simple Type
The simple template type is the most basic type of template.
The base template will budget the amount you ask it to.
Simple!
This template also has a few variations making it likely the most used template out of the available options.

Below is an example of how it works.
The template budgets just what you ask, no matter how much the respective category has in its balance.

<!-- prettier-ignore -->
|Syntax|Budgeted Amount|
|---|:---:|
|#template 50| $ 50 |

There is also a useful variation of a simple template.
This variation will put a **limit** on how much the balance of a category can be that month.
Here are some examples of how this is used

<!-- prettier-ignore -->
|Syntax| Previous Balance | Budgeted Amount | New Balance |
|---|:---:| :---: |:---:|
|#template 50 up to 100| $ 80 | $ 20 | $ 100 |
|#template 50 up to 100| $ 20 | $ 50 | $ 70 |
Isn't that neat!
This is especially useful for budget categories that have month to month variation in spending such as groceries.
You can budget the same amount per month, but save up from one month to the next without having to worry about building up more funds than you need.

The last variation of the simple template is sometimes referred to as a "refill".
With this style the template budgets whatever it takes to hit a "full" amount.
Here is how it works:

<!-- prettier-ignore -->
|Syntax| Previous Balance | Budgeted Amount | New Balance |
|---|:---:| :---: |:---:|
|#template up to 150| $ 10 | $ 140  | $ 150 |
|#template up to 150| $ -20 | $ 170  | $ 150 |
Cool, right! This is another way to gracefully handle categories that have month to month variation.
This will always give you the same amount available each month no matter what you spend the previous month and not ever build up more funds than you need.
This variation along with the previous variation, are probably the most used templates.
They are simple enough to use easily, but are robust enough to make budgeting much simpler.

**Notes**:
- A single category with two templates that use `up to` is not supported.
- If any single template contains an `up to`, the whole category will be subject to that limit even if there are later templates and priorities. This excludes remainders which will run after the limit is applied.


#### All Variations
There is more flexibility with the limit part of the template.
By default, the limit (the "up to" part of the template) is based per month.
You can modify the limit to be per week or per day if that matches your needs better.
You can also modify the limit to not ever remove funds over your limit.
This can be useful if you get refunds or reimbursements that you would like to have remain inside a category even if over your limit.
Below is examples of these different variations of simple templates.

<!-- prettier-ignore -->
|Syntax|Description|Example Application|
|---|---|---|
|#template 50|Budget 50 each month|Regular monthly bills, such as internet|
|#template 50 up to 300|Budget 50 each month up to a maximum of 300|Funding rainy day categories, such as replacement shoes and bicycle repairs
|#template up to 150|Budget up to 150 each month, and remove extra funds over 150|Variable expenses, such as petrol and groceries|
|#template up to 150 hold|Budget up to 150 each month, but retain any funds over 150 |Variable expenses that may get refunds or reimbursements|
|#template up to 5 per day |Budget up to 5 per day that month, and remove extra funds | Setting a daily coffee budget|
|#template up to 100 per week starting 2024-10-07 |Budget 100 per week starting on Mondays, and remove extra funds| Setting a weekly grocery budget |

### By Type

The **By** type of template is for saving up funds _by_ a certain month.
For example, it is January and you are trying to save for a new car by the end of the year.
If the new car will cost $ 10,000 and you plan to buy it in December, you will use something like the following:

<!-- prettier-ignore -->
|Syntax| Budgeted Amount |
|---|:---:|
|#template 10000 by 2025-12 | $ 833.33 |
That example is pretty basic.
The by template is smarter than just 10000/12.
Lets say the example is the same, but you already have $ 1,500 saved.
In that case you get this.

<!-- prettier-ignore -->
|Syntax| Previous Balance | Budgeted Amount | New Balance |
|---|:---:| :---: |:---:|
|#template 10000 by 2025-12 |$ 1,500 | $ 708.33 | $ 2,208.33 |

Nice!
This even works if you add more funds later.
The template will always divide up the remaining amount you need by the remaining number of months.
If you need to pull funds away from your car savings to cover an emergency house repair, the template will budget more in the coming months to say on track.
If you have extra funds one month and add that to your car savings, the template will budget less in the coming months since you need less.

**Note**: The date must be in YYYY-MM format.

#### Repeated savings
The By template can also repeat if your savings is cyclical, such as yearly taxes or insurance.
The repeat period can be both a number of months or number of years.
If you need to repeat based on a number of weeks, use the Week template.
In that case use the following variation:
<!-- prettier-ignore -->
|Syntax| Budgeted Amount | Note |
|---|:---:| --- |
|#template 500 by 2025-03 repeat every year | $ 166.66  | Assuming starting in January 2025 |
|#template 500 by 2025-03 repeat every year | $ 41.66  | All months after March 2025 |

#### By Spend
The By template can be extended to allow some of the funds to be spent along the way.
This is most commonly used for holiday savings where you will spend some of the money in the months leading up to the holiday.
An example of this is buying Christmas gifts in November and December.
The table below shows how this works.
<!-- prettier-ignore -->
|Syntax| Budgeted Amount | Spent so far| New Balance| Note |
|---|:---:| :---: | --- | --- |
|#template 500 by 2025-12 spend from 2025-11| $ 41.66  | 0 | previous + $ 41.66| Assuming starting in January 2025, all months before December |
|#template 500 by 2025-12 spend from 2025-11| $ 41.66  | $ 100 | $ 400 | Assuming the beginning of December, but have not spent anything in December yet |

#### Available Variations
Below is a table of the variations of the By template.

<!-- prettier-ignore -->
|Syntax|Description|Example Application|
|---|---|---|
|#template 500 by 2027-03|Break down large, less-frequent expenses into manageable monthly expenses|Saving for a replacement car in a few years
|#template 500 by 2025-03 repeat every 6 months|Break down large, less-frequent expenses into manageable monthly expenses|Biannual credit card fees
|#template 500 by 2025-03 repeat every year|Break down large, less-frequent expenses into manageable monthly expenses|Annual insurance premium
|#template 500 by 2025-03 repeat every 2 years|Break down large, less-frequent expenses into manageable monthly expenses|Domain name renewal|
|#template 500 by 2024-12 spend from 2024-03|Budget 500 by December. Any spending between March and December is OK.|Christmas presents, overseas holiday, or any other expenses that I will be partially paying for before the target period ends.|
|#template 500 by 2024-12 spend from 2024-03 repeat every year| |	
|#template 500 by 2024-12 spend from 2024-03 repeat every 2 years| |	

### Week Type
If you have bills that cycle weekly, or like to base your budget on weeks, this is the template for you!
This template is like the simple template but it uses weeks instead of months.
You set the start day, and every 7 days starting from that day, you will get the requested amount budgeted.
See the table below for examples.

<!-- prettier-ignore -->
|Syntax| Budgeted Amount | Note |
|---|:---:| :---: |
|#template 10 repeat every week starting 2025-01-06 | $ 40 | When budgeting in January 2025 |
|#template 10 repeat every week starting 2025-01-06 | $ 50 | When budgeting in March 2025 |

As you can see, the template will budget based on the number of weeks that start on the desired day, starting on your start date.

The Week template also supports limits the same way the simple template does.
For example if you budget in January with limited template:
<!-- prettier-ignore -->
|Syntax| Previous Balance | Budgeted Amount | New Balance |
|---|:---:| :---: |:---:|
|#template 10 repeat every week starting 2025-01-06 up to 55 | $ 20 | $ 35 | $ 55 |

**Notes**:
- The date must be in YYYY-MM-DD format.
- A single category with two templates that use `up to` is not supported.
- If any single template contains an `up to`, the whole category will be subject to that limit even if there are later templates and priorities. This excludes remainders which will run after the limit is applied.

#### Available Variations
Below is a table of the variations of the Week template.
<!-- prettier-ignore -->
|Syntax|Description|Example Application|
|---|---|---|
|#template 10 repeat every week starting 2025-01-03|Budget 10 a week|
|#template 10 repeat every week starting 2025-01-03 up to 80|Budget 10 a week, up to a maximum of 80|
|#template 10 repeat every 2 weeks starting 2025-01-04|Budget 10 fortnightly|
|#template 10 repeat every week starting 2025-01-04 up to 20 per week starting 2025-01-04 hold |Budget 10 every week, up to a maximum of 20 for each week and retain extra above that level|

### Percent Type
The percent template allows you to assign a percent of your income or available funds to a certain category.
Below are the most basic examples.
All the examples assume the following amounts of income in the listed income categories or to budget amount:
* Paycheck - $ 1900
* Dividends - $ 100
* To Budget - $ 1500

<!-- prettier-ignore -->
|Syntax| Budgeted Amount | Note |
|---|:---:| :---: |
|#template 10% of all income | $ 200 | Use the total of your income categories in the calculation |
|#template 10% of Paycheck | $ 190 | Budget 10% of your paycheck |
|#template 10% of available funds | $ 150 | Budget 10% of the current to budget funds |

#### Previous Flag
The percent template can also be pointed to the previous month's income if you are using a month ahead budgeting strategy.
Below is an example of how to do that.

<!-- prettier-ignore -->
|Syntax| Budgeted Amount | Note |
|---|:---:| :---: |
|#template 10% of previous all income | $ 200 | Use the total of your income categories from the previous month |
|#template 10% of previous Paycheck | $ 190 | Budget 10% of last month's paycheck |

The previous option is not available when using the percent of available funds template.

#### Available Variations
Below is a table of the variations of the Percent template.

|Syntax|Description|Example Application|
|---|---|---|
|#template 15% of all income|Budget 15% of all income categories| Using a "pay yourself first" strategy|
|#template 10% of Paycheck|Budget 10% of the "Paycheck" income category| Using a "pay yourself first" strategy, but have income categories you want to ignore|
|#template 15% of previous all income|Budget 15% of all income categories using last month's income|Using a "pay yourself first" strategy in conjunction with a "month ahead" strategy |
|#template 10% of previous Paycheck|Budget 10% of last month's "Paycheck" income category| Using a "pay yourself first" strategy in conjunction with a "month ahead" strategy, but have income categories you want to ignore|
|#template 12% of available funds|Budget 12% of your "To Budget" funds available at the current priority level| |

### Schedule Type
The Schedule template allows you to automatically budget based on the schedules you have added to Actual.
This includes sub-monthly, month, extra-monthly schedules.
This is the most common template outside of the Simple template.
Below is an example of the syntax for a $ 100 per month schedule called "Internet", and a $ 2,400 per year schedule called "Taxes".

<!-- prettier-ignore -->
|Syntax| Budgeted Amount | Note |
|---|:---:| :---: |
|#template schedule Internet | $ 100 | Budget for the "Internet" schedule |
|#template schedule Taxes | $200 | Build up funds for the schedule that is a year out |

The function of the schedule template is very similar to the By template, but you don't need to adjust both a schedule and a template individually.
You can adjust the schedule in the schedule editor and the template will stay up to date automatically.

**Note** The schedule name is defined in the **Schedules** editor. **Take great care to copy across these schedule names EXACTLY** or the template will not be able to find the schedule.

#### Full Flag
There is one additional option to the Schedule template, the "Full" flag.
The "Full" flag tells the template to not build up funds over time and budget the full schedule amount in the needed month.
This is useful for small schedules that you don't need to build up over time since the amount is small.
This can also help make stacking Schedule templates easier to track.
Below is an example of using the "Full" flag assuming a once per year schedule for $15 called "Simplefin" due in May.

<!-- prettier-ignore -->
|Syntax| Budgeted Amount | Note |
|---|:---:| :---: |
|#template schedule full Simplefin | $ 0 | Budget in all months except May |
|#template schedule full Simplefin | $ 15 | Budget in May |

#### Available Variations
Below is a table of the variations of the Schedule template.
<!-- prettier-ignore -->
|Syntax|Description|Example Application|
|---|---|---|
|#template schedule {SCHEDULE NAME}|Fund upcoming scheduled transactions over time|Monthly schedules, or larger non-monthly scheduled transactions|
|#template schedule full {SCHEDULE NAME}|Fund upcoming scheduled transaction only on needed month| Small schedules that are non-monthly|

### Average Type
The Average template allows you to budget the average amount spend over a number of months.
This is the same function provided by the menu in the budget table but it can be used in a single category automatically where the menu option must be applied to the whole budget or a single category.
The table below shows how to use the Average template.
<!-- prettier-ignore -->
|Syntax|Description|Example Application|
|---|---|---|
|#template average 6 months | Budget the average amount spent over the last 6 months. Can set the number to any number > 0. Matches the existing option on the budget page but with flexible month ranges | Try to budget only what you need to spend based on the last 6 months of spending data |

### Copy Type
The Copy template will copy the budget amount from some number of months prior.
This is useful if your spending is inconsistent per month, but cyclical over a period of months.
The table below shows how to use the Copy template.

<!-- prettier-ignore -->
|Syntax|Description|Example Application|
|---|---|---|
|#template copy from 12 months ago | Budget the same amount as was budgeted 12 months ago. Number of months is adjustable | Your power bill fluctuates throughout the year, but is about the same in equivalent months between years. |

### Remainder Type

The remainder template is run differently to the other templates. Any remainder templates will be forced to run last in their own pass. This way the amount left to budget is whatever remains after all other templates have had a chance to run. Below are a few considerations when using the remainder template:

- You can use as many remainder templates as you want.
- Remainder templates don't have a priority as they are always run last.
- The remainder template supports weights to control the distribution of funds across multiple categories. See the examples on how this is done.
- If no weight is provided, the weight will be defaulted to 1.
- The amount budget by the remainder template is calculated as: `budgeted_amount=available_funds/sum_of_weights * category_weight`
- Remainder templates don't set a goal with the goal indication on the category balance.
- Remainder templates don't affect a goal set by previous templates.

#### Examples

All of the examples below use the case of 100 leftover when the remainder pass is run.

1. Add all remaining funds to a single category.

| Category | Template line       | Amount applied |
| -------- | ------------------- | -------------- |
| Savings  | #template remainder | 100            |

2. Split funds evenly between two categories.

| Category      | Template line       | Amount applied |
| ------------- | ------------------- | -------------- |
| Savings       | #template remainder | 50            |
| Vacation Fund | #template remainder | 50            |

3. Split funds with one category receiving extra.

| Category      | Template line         | Amount applied |
| ------------- | --------------------- | -------------- |
| Savings       | #template remainder 2 | 66.66         |
| Vacation Fund | #template remainder   | 33.34         |

4. Spread funds over many categories.

| Category        | Template line         | Amount applied |
| --------------- | --------------------- | -------------- |
| Savings         | #template remainder 3 | 50            |
| Vacation Fund   | #template remainder   | 16.66         |
| Investment Fund | #template remainder 2 | 33.34         |


### Goal Directive

This option is unique enough to warrant its own directive, `#goal`, instead of the standard `#template` option.
The `#goal` option overrides how the goal indicator typically functions.
In the standard `#templates`, the goal indication colors are based on the current month's budgeted value.
When using the `#goal` option, the indication is based on the total balance.
This shifts the indication to a long-term goal you are saving up to instead of just the current monthly portion.
A few examples have been given to illustrate this difference.

#### Notes on The Goal Directive
* The `#goal` templates are run the same way as the regular `#templates`.
* If there is a `#goal` directive in a category, the goal indicator for that category will be based on the goal, not the templates.
* The `#goal` directive will not budget any funds, and funds budgeted by hand will not get reset by running templates.
* A `#goal` line can be stacked with `#templates` to automatically budget the category (via the templates) but override how the category goal is indicated (the goal template).
* There is no priority on a `#goal`.

#### Examples
All examples assume that 400 was carried over from the previous month

**1. I'm saving for a large purchase, but I'm still determining how much I can allocate each month.**
In this case, a balance greater than or equal to 500 will set the balance green, marking a met goal.
If you run the template, you get the following:

| Template Line(s) | Amount budgeted | Balance(color) |
|:---|:--:|---:|
| `#goal 500` | 0 | 400(yellow) |

If you were able to budget 100 this month, you would then hit your goal and get a green indication.

| Template Line(s) | Amount budgeted | Balance(color) |
|:---|:--:|---:|
| `#goal 500` | 100 | 500(green) |

**2. I'm saving for a purchase, but I will budget 50 a month until I reach my goal.**
In this example, a template is used to automatically budget 50 into the category when templates are run.
The `#goal` line will override the goal indication from the `#template` line, and only go green when a balance of 500 is reached.
If you run templates, you get the following:

| Template Line(s) | Amount budgeted | Balance(indication color) |
|:---|:---:|---:|
| `#template 50` `#goal 500` | 50 | 450(yellow) |

If you have some extra funds after templates are run and can budget that last 50, you get the following:

| Template Line(s) | Amount budgeted | Balance(indication color) |
|:---|:---:|---:|
| `#template 50` `#goal 500` | 100 | 500(green) |

