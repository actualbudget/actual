# The Budget

This view lets you manage your budget. You'll find more information about envelope budgeting with Actual in [Budgeting](../budgeting/index.md).

![The Budget page showing October and November side by side](/img/a-tour-of-actual/tour-budget-overview@2x.webp)

The maximum number of months you can see at any one time is defined by the width of your screen.

You can choose how many months to display by clicking on the corresponding number of calendar icons in the top left corner.

<img width="92" alt="Four calendar icons, two of them highlighted to show two months" src="/img/a-tour-of-actual/tour-budget-month-count@2x.webp" />

Based on this, you can then choose which months to show:

<img width="574" alt="The month picker with October and November selected" src="/img/a-tour-of-actual/tour-budget-month-picker@2x.webp" />

## The Month header

At the top of each month, you have a couple of choices in the user interface.

<img width="650" alt="The October and November headers with the note, minimize and menu buttons labeled" src="/img/a-tour-of-actual/tour-budget-header-expanded@2x.webp" />

- **A. Notes.** Clicking on the note icon lets you add a note. Actual fully supports Markdown and the note will be rendered according to your Markdown when the cursor is hovering over the note.
- **B. Minimize.** You can minimize the header by clicking on the chevrons, which appear when you hover over the month.
- **C. Menu.** Clicking on the three vertical dots lets you execute the following functions on that month's budget categories:
  - Copy last month's budget.
  - Set budgets to zero.
  - Set budgets to 3 month average.
  - Set budgets to 6 month average.
  - Set budgets to 12 month average.

When the top is minimized, you can still access the same functionality as when the top section is expanded.

<img width="650" alt="The minimized October and November headers, showing only the amount to budget" src="/img/a-tour-of-actual/tour-budget-header-minimized@2x.webp" />

Here's the rendered Markdown when you hover over the note.

<img width="413" alt="A month note with a heading, bold text and a bulleted list rendered from Markdown" src="/img/a-tour-of-actual/tour-budget-header-note@2x.webp" />

## The Budget Table

### Left side - category section

The budget detail section lists all your categories and their grouping. The image below shows two expense category groups, _Usual Expenses_ and _Bills_, along with the income categories.

<img width="856" alt="The budget table with the category menu, the Bills group and the Internet category labeled" src="/img/a-tour-of-actual/tour-budget-table@2x.webp" />

- **A. Category menu.** Clicking on the three vertical dots allows you to toggle hidden categories, expand all or collapse all category groups.
- **B. Category group.** When you hover over a category group, you can add a new category to the group by clicking the + icon or add a note by clicking the note icon. All notes on the Budget page support full Markdown. The dropdown will allow you to toggle between hide or show the _category group_, rename or delete the group.
- **C. Category.** Categories have the same functionality as groups: hide, rename and delete. You can also add a note here, with information specific to the category.

### The middle - the budget section

This is the juicy part of the user interface; this is where you work with your budgeted numbers.

We have three columns under a month heading: _Budgeted_, _Spent_, and _Balance_.

- _Budgeted_ is how much money we allocated to this category that month.
- The _Spent_ column displays how much we spent in a month.
- The _Balance_ is the difference between the _Budgeted_ and the _Spent_ columns + what was left over from the previous month (as a rule of thumb).

You work with the _Budgeted_ column to manipulate your budget: You can enter a number or use a dropdown which will populate the entry based on a
_copy of last month's budget_, or the previous 3-month, 6-month or yearly average. Notes can be added to each budget entry, also.
