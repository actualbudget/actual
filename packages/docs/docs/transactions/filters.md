# Filtering Transactions

### Introduction

Filtering is a little known tool in Actual but is really quite a powerhouse. Filters go well beyond the simple Search tool and will allow you to create all sorts of useful transaction summaries. This will help you view various aspects of your spending, extract data for tax filing and so on.

### Caveats

Inevitably, there are some restrictions but these offer a great opportunity for developers to improve Actual in the future:

1. The only way to print the filtered results is via a screen shot (unless you save to a spreadsheet as a CSV file first)
1. The columns of the filtered view cannot yet be sorted. But you can of course export the filtered results to a spreadsheet and play with them to your heart's content.
1. Split transactions do not behave well in the filtered view. The non-applicable part of the filtered results can end up getting added into the total.
1. Filters are just one way of searching and viewing your data. There is still great scope for the future development of graphical style reports in Actual.

### How to use the Filter tool

Well, having got that out of the way please don't let any of this put you off. Filters are a great tool – and there is lots more scope for further development.

First go to the relevant account screen and select **Filter**. You will see from this drop-down that there are a number of options to choose from:

<img width="290" alt="The Filter menu listing the fields you can filter by" src="/img/transactions/filters-field-list@2x.webp" />

The great thing is that you are not limited to just one Filter. You can select multiple filters. In effect stacking one upon another. An example will help illustrate this.

There are further options within each area to narrow the filter further. Here are a couple to illustrate the choices – Dates and Categories:

The `matches` operator uses _[regular expressions](https://regextutorial.org/)_, the other condition types are further explained at [Rules Page](../budgeting/rules/index.md#condition-types).

<img width="299" alt="The operators for a Date filter" src="/img/transactions/filters-date-operators@2x.webp" />

<img width="299" alt="The operators for a Category filter, with matches selected" src="/img/transactions/filters-category-operators@2x.webp" />

**Note**: There are further options available by clicking the down arrow under **Date** and **Amount**.

### Example

In this example we are finding out how much the Mercedes car cost to run during the 2025 calendar year. To enhance this analysis a tag of each vehicle owned was added to transactions in the "Car" category group. Alternatively, you could just be more granular in your creation of Categories.

<img width="860" alt="Four filters stacked: category group is Car, notes has any tag #mercedes and a date range covering the year" src="/img/transactions/filters-multiple@2x.webp" />

Now we want to see the total spent on the Mercedes car in 2025. This is shown as the filtered balance, next to the account balance at the top of the page.

![The filtered balance highlighted next to the account balance](/img/transactions/filters-filtered-total@2x.webp)

But what if we need to drill down further and calculate just the costs were for maintenance of this particular car? By selecting the applicable transactions a revised total appears as shown below. Alternatively just remove the non-applicable category filters.

![Two maintenance transactions selected, with the selected balance highlighted](/img/transactions/filters-selected-total@2x.webp)

In the above Example we used the **Date is greater than** and **Date is less than** filters to illustrate the fine tuning that is possible. However, in this example of a simple calendar year it would have been quicker simply to click on the down arrow below **Date** and select as follows:

<img width="299" alt="The Date filter with its field menu open and Year highlighted" src="/img/transactions/filters-year-option@2x.webp" />

<img width="299" alt="A Year filter set to is 2025" src="/img/transactions/filters-year-value@2x.webp" />

### Saving Filters

To save a search, simply click on the **Unsaved filter** dropdown button above the transactions table and click **Save new filter**.

<img width="222" alt="The Unsaved filter menu with Save new filter and Clear all conditions" src="/img/transactions/filters-save-filter@2x.webp" />

You'll then get a window that asks for you to name the saved filter. Type in whatever you wish the filter to be called and click the **Add** button.

<img width="349" alt="Naming the new saved filter, with the Add button" src="/img/transactions/filters-name-filter@2x.webp" />

When you want to re-visit a previously saved filter, go to the relevant account page, click on **Filter**, and select **Saved** in the dropdown.

<img width="291" alt="The Filter menu with Saved highlighted" src="/img/transactions/filters-select-saved@2x.webp" />

A new window should pop-up giving you the ability to select which saved filter you wish to revisit. Simply click on the saved filter or type in the filter's name and click **Apply**.

<img width="299" alt="The Saved filter picker with a saved filter chosen and the Apply button" src="/img/transactions/filters-saved-picker@2x.webp" />

The saved filter will then display in the transactions table.

#### Modifying and Deleting Saved Filters

You also have the ability to modify or delete any of your existing saved filters.

First, pull up your saved filter. If you wish to make any changes to the saved filter, you can do that now by adding additional filter conditions.

To modify or delete the filter, click on the top-right dropdown menu. It will present you with a few options based on what actions you've taken. If you've modified the saved filter, you'll have the ability to rename, update, revert, delete, or save a new filter based on the criteria you have established. If no changes to the filter were made, you can rename or delete the saved filter entirely.

<img width="860" alt="The menu for a modified saved filter: Rename, Update conditions, Revert changes, Delete, Save new filter and Clear all conditions" src="/img/transactions/filters-modify-saved@2x.webp" />

To clear out any filtered transactions, click on the dropdown menu in the top-right corner above your transactions table and click **Clear all conditions**.
