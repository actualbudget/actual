# End of Month Cleanup

:::warning
This is an **experimental feature**. That means we’re still working on finishing it. There may be bugs, missing functionality or incomplete documentation, and we may decide to remove the feature in a future release. If you have any feedback, please [open an issue](https://github.com/actualbudget/actual/issues) or post a message in the Discord.
:::

Create a template by adding a note to a category and adding a line that begins with `#cleanup`.

![](/img/monthly-cleanup/cleanup-02.png)

You are welcome to have other lines in your note including goal templates, but the #cleanup line must match the syntax.

:::note
Enable this feature alongside the **Goals** experimental feature by enabling **Goal templates** in the **Settings** menu.
:::

## How to use the End of Month Cleanup script

There are different ways to interact with the cleanup script, and a few of the examples will be given. But first, let's explore the syntax.

<!-- prettier-ignore -->
|Syntax|Description|Application|
|---|---|---|
|#cleanup source|This is a source of money to be reused at the end of the month|Electricity is intentionally over budgeted each month and the excess is used to pay down debt|
|#cleanup sink|This is a category where extra money will be moved. Weight: 1|This can be a vacation, debt, or other savings category where you want to accelerate the savings rate|
|#cleanup sink 2|This is a category where extra money will be moved. Weight: 2|This can be a vacation, debt, or other savings category where you want to accelerate the savings rate|

The feature works sequentially in the following manner after pressing the **End of month cleanup** button .

![](/img/monthly-cleanup/cleanup-01.png)

1.  Any `#cleanup source` entries will be found and all extra money in those categories will be returned to **To Budget**.
    - A source category that has a negative balance will be ignored.
2.  **Overspent** categories that do NOT use **Rollover Overspending** will be found and will attempt to cover the overspending from **To Budget**.
3.  Any `#cleanup sink` entries will be found and redistribute the remaining **To Budget** amounts based on the weight given.

## Calculating the weights of 'sink' categories

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

- Add the `#cleanup source` note is in the categories where you can find some extra money.
- Add a `#cleanup sink` line to your **Holiday Celebration** category.
- Add a `#cleanup sink 2` line to your **Vacation** category.

The **Holiday Celebration** category has a default weight of 1 while the **Vacation** category was specified as a weight of 2. Both numbers could have been specified with weights of 34 and 66 to give a close approximation of 1/3 and 2/3 where 34 + 66 = 100% to achieve a similar result.

**I want to pay down my debt as quickly as possible. I have a large debt category where I rollover my overspending so I can budget an additional payment each month.**

- Add the `#cleanup source` note is in the categories where you can find some extra money.
- Add the `#cleanup sink` note to your debt category. If this is your only priority, only put the note in this category.

All of your extra money will be used to cover your overspent categories first and all remaining money will go to the **Debt** category to budget for an extra payment.

**I have a category specifically meant to cover overspending for the month. Can I use this tool with that category?**

YES!

- Add both lines, `#cleanup source` and `#cleanup sink` to your buffer category.

The script will remove all of your buffer funds, cover your overspending, and put your buffer funds back into the buffer for next time. You can also add a `#template` goal to this category so you can fill it back up next month!
