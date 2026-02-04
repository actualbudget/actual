# The Budget

This view lets you manage your budget for various months. You'll find more information about how to do budgeting with Actual
in the [Budgeting](/docs/budgeting/) part of this manual.

![](/img/a-tour-of-actual/tour-budget-overview.webp)

The number of months you can see at any one time is defined by the width of your screen.

However, you can select fewer months than the screen can display by clicking on the corresponding numbers of calendar icons in the top left corner.

![](/img/a-tour-of-actual/tour-budget-calendar.webp)

Based on this, you can then choose which months to show:

![](/img/a-tour-of-actual/tour-budget-calendar-choose.webp)

## The Month header

At the top of each month, you have a couple of choices in the user interface.

- Clicking on the note icon lets you add a note. Actual fully supports Markdown and the note will be
  rendered according to your Markdown when the cursor is hovering over the note
- You can minimize the header by clicking on the chevrons (seen in the yellow box).
- Clicking on the three vertical dots lets you execute the following functions on that month's budget categories:
  - Copy last month's budget.
  - Set budgets to zero.
  - Set budgets to 3 month average.
  - Set budgets to 6 month average.
  - Set budgets to 12 month average.

![](/img/a-tour-of-actual/tour-budget-top-expanded.webp)

When the top is minimized, you can still access the same functionality as when the top section is expanded.

![](/img/a-tour-of-actual/tour-budget-top-minimized.webp)

## The Budget Table

### Left side - category section

The budget detail section lists all your categories and their grouping. The image below shows two expense category
groups, _Really Important_ and _Daily Expenses_, along with the income categories. You can minimize a category group, as seen
with _Daily expenses_.

Clicking on the three vertical dots (in the yellow box) allows you to Toggle hidden categories or expand or collapse all category groups.

When you hover over a category group (outlined by the green box), you can add a note by clicking the note icon. As with the note icon in the top section,
we also have full Markdown support here. The dropdown will allow you to add a new category, toggle hide or show the _category group_, rename a group,
and delete the category group.

Let's look at a category (as seen in the purple box). We have the same functionality as on the group level: hide, rename and delete. And, of course, you
can also add a note here, with information specific to the category.

![](/img/a-tour-of-actual/tour-budget-details.webp)

### The middle - the budget section

This is the juicy part of the user interface; this is where you work with your budgeted numbers.

We have three columns under a month heading: _Budgeted_, _Spent_, and _Balance_.

- _Budgeted_ is how much money we allocated to this category that month.
- The _Spent_ column displays how much we spent in a month.
- The _Balance_ is the difference between the _Budgeted_ and the _Spent_ columns + what was left over from the previous month (as a rule of thumb).

You work with the _Budgeted_ column to manipulate your budget: You can enter a number or use a dropdown which will populate the entry based on a
_copy of last month's budget_, or the previous 3 or 6-month average, and finally a yearly average.
