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

![](/img/filtering/filter.webp)

The great thing is that you are not limited to just one Filter. You can select multiple filters. In effect stacking one upon another. An example will help illustrate this.

There are further options within each area to narrow the filter further. Here are a couple to illustrate the choices – Dates and Categories:

The `matches` operator uses _[regular expressions](https://regextutorial.org/)_, the other condition types are further explained at [Rules Page](../budgeting/rules/#condition-types).

![](/img/filtering/conditions-1.webp)

![](/img/filtering/conditions-2.webp)

**Note**: There are further options available by clicking the down arrow under **Date** and **Amount**.

### Example

In this example we are finding out how much the Mercedes car cost to run during the 2024 calendar year. To enhance this analysis a tag of each vehicle owned was added to transactions in the "Car" category group. Alternatively, you could just be more granular in your creation of Categories.

![](/img/filtering/multiple-filters.webp)

Now we want to see the total spent on the Mercedes car in 2024. This is shown at the top center of the page.

![](/img/filtering/filtered-total.webp)

But what if we need to drill down further and calculate just the costs were for maintenance of this particular car? By selecting the applicable transactions a revised total appears as shown below. Alternatively just remove the non-applicable category filters.

![](/img/filtering/selected-total.webp)

In the above Example we used the **Date is greater than** and **Date is less than** filters to illustrate the fine tuning that is possible. However, in this example of a simple calendar year it would have been quicker simply to click on the down arrow below **Date** and select as follows:

![](/img/filtering/year-1.webp)

![](/img/filtering/year-2.webp)

### Saving Filters

To save a search, simply click on the **Unsaved filter** dropdown button above the transactions table and click **Save new filter**.

![](/img/filtering/save-filter.webp)

You'll then get a window that asks for you to name the saved filter. Type in whatever you wish the filter to be called and click the **Add** button.

![](/img/filtering/set-filter-name.webp)

When you want to re-visit a previously saved filter, go to the relevant account page, click on **Filter**, and select **Saved** in the dropdown.

![](/img/filtering/select-saved-1.webp)

A new window should pop-up giving you the ability to select which saved filter you wish to revisit. Simply click on the saved filter or type in the filter's name and click **Apply**.

![](/img/filtering/select-saved-2.webp)

The saved filter will then display in the transactions table.

#### Modifying and Deleting Saved Filters

You also have the ability to modify or delete any of your existing saved filters.

First, pull up your saved filter. If you wish to make any changes to the saved filter, you can do that now by adding additional filter conditions.

To modify or delete the filter, click on the top-right dropdown menu. It will present you with a few options based on what actions you've taken. If you've modified the saved filter, you'll have the ability to rename, update, revert, delete, or save a new filter based on the criteria you have established. If no changes to the filter were made, you can rename or delete the saved filter entirely.

![](/img/filtering/modify-saved.webp)

To clear out any filtered transactions, click on the dropdown menu in the top-right corner above your transactions table and click **Clear all conditions**.
