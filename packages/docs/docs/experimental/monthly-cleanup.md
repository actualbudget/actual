# End of Month Cleanup

:::warning
This is an **experimental feature**. That means we're still working on finishing it. There may be bugs, missing functionality or incomplete documentation, and we may decide to remove the feature in a future release. If you have any feedback, please [open an issue](https://github.com/actualbudget/actual/issues) or post a message in the Discord. See [Experimental Features](/docs/experimental/) for instructions to enable experimental features.
:::

Create a template by adding a note to a category and adding a line that begins with `#cleanup`.

![](/img/monthly-cleanup/cleanup-02.webp)

You are welcome to have other lines in your note including goal templates, but the #cleanup line must match the syntax.

:::note
Enable this feature alongside the **Goals** experimental feature by enabling **Goal templates** in the **Settings** menu.
:::

## How to Use the End of Month Cleanup Script

There are different ways to interact with the cleanup script, and a few of the examples will be given. But first, let's explore the syntax.

### Global Source and Sinks

Global source and sink definitions can affect the whole budget.

| Syntax          | Description                                                    | Application                                                                                           |
| --------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| #cleanup source | This is a source of money to be reused at the end of the month | Electricity is intentionally over budgeted each month and the excess is used to pay down debt         |
| #cleanup sink   | This is a category where extra money will be moved. Weight: 1  | This can be a vacation, debt, or other savings category where you want to accelerate the savings rate |
| #cleanup sink 2 | This is a category where extra money will be moved. Weight: 2  | This can be a vacation, debt, or other savings category where you want to accelerate the savings rate |

### Local Group Source and Sinks

Local groups can be defined to target certain categories for more refined control. You can have many groups by changing the group name.

| Syntax                  | Description                                                                              | Application                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| #cleanup _Group_ source | This is a source of money to be reused at the end of the month with any Group categories | A reimbursement holding category exists for making small loans to family or friends          |
| #cleanup _Group_ sink   | This is a category where extra money will be moved into from the Group source. Weight: 1 | This can be a category specific to a person or a business where reimbursements are expected. |
| #cleanup _Group_ sink 2 | This is a category where extra money will be moved into from the Group source. Weight: 2 | This can be a category specific to a person or a business where reimbursements are expected. |

The feature works sequentially in the following manner after pressing the **End of month cleanup** button .

![](/img/monthly-cleanup/cleanup-01.webp)

1. Local groups are applied first. Overspent categories are not automatically filled at this step and the group source funds will be distributed.
1. Any `#cleanup source` entries will be found and all extra money in those categories will be returned to **To Budget**.
   - A source category that has a negative balance will be ignored.
1. **Overspent** categories that do NOT use **Rollover Overspending** will be found and will attempt to cover the overspending from **To Budget**.
1. Any `#cleanup sink` entries will be found and redistribute the remaining **To Budget** amounts based on the weight given.

## Calculating the Weights of 'Sink' Categories

The sum of the weights of the `sink` categories are used to determine the amount that will be used when applying the **To Budget** amount to each.
Suppose there are 5 categories that are identified as `sink` categories with the following syntax:

- Category 1: `#cleanup sink`
- Category 2: `#cleanup sink`
- Category 3: `#cleanup sink 2`
- Category 4: `#cleanup sink 2`
- Category 5: `#cleanup sink 4`

The sum of the weights are `1 + 1 + 2 + 2 + 4 = 10`

The result will be:

- Categories 1 and 2 will receive `1 / 10` or 10% of the **To Budget** amount
- Categories 3 and 4 will receive `2 / 10` or 20% of the **To Budget** amount
- Category 5 will receive `4 / 10` or 40% of the **To Budget** amount

## Examples

**I leave money in my To Budget balance all month, can this help cover my overspending?**

- If you don't use any `#cleanup` lines, the script will still try to cover overspending using the available **To Budget** amounts. This doesn't move any money out of any category, and only covers overspending.

**I want to recover money from my utility bills because they're variable and I always over budget and use that money to cover my overspent categories.**

- Place the `#cleanup source` text in the utility bill categories. When clicking the **End of month cleanup** button, the extra money will be returned to **To Budget** to use for covering the overspent categories. The money will remain in **To Budget** until you decide where it should go.

**I'm behind on saving for our big Holiday celebration and would like to catch up faster. I would also like to save a little extra for vacation. I would like to put 1/3 in savings for the Holiday and 2/3 for vacation of any extra money I can find.**

- Add the `#cleanup source` note in the categories where you can find some extra money.
- Add a `#cleanup sink` line to your **Holiday Celebration** category.
- Add a `#cleanup sink 2` line to your **Vacation** category.

The **Holiday Celebration** category has a default weight of 1 while the **Vacation** category was specified as a weight of 2. Both numbers could have been specified with weights of 34 and 66 to give a close approximation of 1/3 and 2/3 where 34 + 66 = 100% to achieve a similar result.

**I want to pay down my debt as quickly as possible. I have a large debt category where I rollover my overspending so I can budget an additional payment each month.**

- Add the `#cleanup source` note in the categories where you can find some extra money.
- Add the `#cleanup sink` note to your debt category. If this is your only priority, only put the note in this category.

All of your extra money will be used to cover your overspent categories first and all remaining money will go to the **Debt** category to budget for an extra payment.

**I have a category specifically meant to cover overspending for the month. Can I use this tool with that category?**

YES!

- Add both lines, `#cleanup source` and `#cleanup sink` to your buffer category.

The script will remove all of your buffer funds, cover your overspending, and put your buffer funds back into the buffer for next time. You can also add a `#template` goal to this category so you can fill it back up next month!

**My utility bills fluctuate from month to month, but are always less than $500. Can I shift that $500 around in just the utility categories?**

Yes.

Method 1:

One way to do this is to have a Utilities holding category with $500 budgeted. Within that category, use `#cleanup utilities source` and `#cleanup utilities sink`. Within all of the remaining utilities categories (power, gas, water, etc), use `#cleanup utilities`. This adds the remaining categories to the `utilities` group. The script will fill any overspending from the holding category and return any remaining money to the holding category.

Method 2:

Another way to accomplish this is to budget what you think you will spend for each of the utilities in each category. For example:

- Power - $200
- Water - $150
- Gas - $150

In each category use `#cleanup utilities source` and `#cleanup utilities sink`. When the script is run, all of the remaining funds from each utilities category will be used to fund your overspent categories within the group and the leftover money will be evenly distributed to the utilities to carry over for the next month. Add a weight to the end of any of the categories if you would like to fund more.
