# The Budget

This view lets you manage your budget. You'll find more information about envelope budgeting with Actual in [Budgeting](/docs/budgeting/).

![Budget overview](/img/a-tour-of-actual/tour-budget-overview.webp)

The maximum number of months you can see at any one time is defined by the width of your screen.

You can choose how many months to display by clicking on the corresponding number of calendar icons in the top left corner.

![Budget calendar icons](/img/a-tour-of-actual/tour-budget-calendar.webp)

Based on this, you can then choose which months to show:

![Budget months to show](/img/a-tour-of-actual/tour-budget-calendar-choose.webp)

## The Month header

At the top of each month, you have a couple of choices in the user interface.

- Clicking on the note icon lets you add a note. Actual fully supports Markdown and the note will be rendered according to your Markdown when the cursor is hovering over the note.
- You can minimize the header by clicking on the chevrons (seen in the yellow box).
- Clicking on the three vertical dots lets you execute the following functions on that month's budget categories:
  - Copy last month's budget.
  - Set budgets to zero.
  - Set budgets to 3 month average.
  - Set budgets to 6 month average.
  - Set budgets to 12 month average.

![Budget header expanded](/img/a-tour-of-actual/tour-budget-top-expanded.webp)

When the top is minimized, you can still access the same functionality as when the top section is expanded.

![Budget header minimized](/img/a-tour-of-actual/tour-budget-top-minimized.webp)

Here's the rendered Markdown when you hover over the note.

![Budget header note with Markdown](/img/a-tour-of-actual/tour-budget-top-note-hover.webp)

## The Budget Table

### Left side - category section

The budget detail section lists all your categories and their grouping. The image below shows two expense category groups, _Usual Expenses_ and _Bills_, along with the income categories.

Clicking on the three vertical dots (in the yellow box) allows you to toggle hidden categories, expand all or collapse all category groups.

When you hover over a category group (outlined by the green box), you can add a new category to the group by clicking the + icon or add a note by clicking the note icon. All notes on the Budget page support full Markdown. The dropdown will allow you to toggle between hide or show the _category group_, rename or delete the group.

Categories (as seen in the purple box) have the same functionality as groups: hide, rename and delete. You can also add a note here, with information specific to the category.

![Budget table detail](/img/a-tour-of-actual/tour-budget-details.webp)

### The middle - the budget section

This is the juicy part of the user interface; this is where you work with your budgeted numbers.

We have three columns under a month heading: _Budgeted_, _Spent_, and _Balance_.

- _Budgeted_ is how much money we allocated to this category that month.
- The _Spent_ column displays how much we spent in a month.
- The _Balance_ is the difference between the _Budgeted_ and the _Spent_ columns + what was left over from the previous month (as a rule of thumb).

You work with the _Budgeted_ column to manipulate your budget: You can enter a number or use a dropdown which will populate the entry based on a
_copy of last month's budget_, or the previous 3-month, 6-month or yearly average. Notes can be added to each budget entry, also.
