# Migrating from nYNAB

In order to export your budget from YNAB, you will need to use one of two methods.

## 3rd Party nYnab Exporter

This is the easiest method available. While we don't maintain this tool, https://json-exporter-for-ynab.netlify.app will handle authorizing with your account to export your nYNAB budget into JSON.

## Export Using API Key

If you don't want to use a third party tool, you will need an API key.

### Step 1. Get API key

If you don't already have an API key, you'll need to:

    Sign in to the YNAB web app
    Go to the "Account Settings" page, then to the "Developer Settings" page
    Under the "Personal Access Tokens" section, click "New Token"
    Enter your password and click "Generate" to get a new access token

:::caution
The API key is only shown once, so make sure you copy it down somewhere! More information on how to access the YNAB API can be found at https://api.youneedabudget.com/
:::

### Step 2. Get budget ID

Now open a terminal window / command prompt, and enter:

```
curl -H "Authorization: Bearer <ACCESS_TOKEN>" https://api.youneedabudget.com/v1/budgets
```

This will get the list of all the budgets you have. You'll need to find the id of the budget you want to export.

:::note

It might help to use pretty formatting to find the budget id by piping to `jq` (which can be installed with homebrew `brew install jq`):

```
curl -sH "Authorization: Bearer <ACCESS_TOKEN>" https://api.youneedabudget.com/v1/budgets | jq -r '.data.budgets | sort_by(.last_modified_on) | reverse | .[] | "\(.name): \(.id)"'
```

If you receive an error message like: `Invoke-WebRequest : Cannot bind parameter 'Headers'`, this is because curl is probably aliased to the "Invoke-WebRequest" Powershell commandlet. Use `curl.exe` instead of just `curl` in the commands below to fix this.

:::

### Step 3. Download entire plan

Use the budget id to perform the following API request:

```
curl -H "Authorization: Bearer <ACCESS_TOKEN>" https://api.youneedabudget.com/v1/budgets/<BUDGET ID> --output budget.json
```

### Import the JSON File

- Open Actual
- Select the drop down menu and **Close File**
- Select **Import file**

![](/img/migrating/actual-import-1.webp)

- Select **nYnab**

![](/img/migrating/actual-import-2.webp)

- Choose the exported JSON file

### Cleanup

#### Credit Cards (Fix Overspending)

If you import credit cards with previous debt, you must handle these differently. Otherwise, your budget months will show overspending. Actual does not handle carrying over debt the same way, but offers a more manual approach.

1. From the Budget screen, create a category named `Credit Card` (perhaps under a Category Group of `Debt`).
2. Change all overspent transactions to have their category be this `Credit Card` category.
3. On the first month of overspending for this category, click on the Balance (it should show red) and select `Rollover overspending`.
4. Next, you must assign money each historical month to cover any payments of the `Credit Card` category. Open YNAB and look through each month to find the "extra" amount assigned to the card. (To find the "extra," open YNAB and look through each month. Find the amount assigned to the card in excess of any additional monthly spending, which is how much was used to pay the debt on the credit card.) Put this amount in your `Credit Card` category in Actual.
5. If your budget isn't zeroing out yet, follow the instructions below in _Hold For Next Month_.

A full description of how to carry over debt can be found in [our Carrying Debt article.](https://actualbudget.org/docs/budgeting/credit-cards/carrying-debt)

#### Hold for Next Month (Fix Money Leftover in To Budget)

nYNAB calculates its `Ready to Assign` value differently than Actual's `To Budget` value.
There is no need to worry, we can make them match exactly with a simple change.
This is purely a visual change and doesn't affect the budget itself.

You will likely see money leftover in each of the imported months in your `To Budget`.
This extra comes from nYNAB including funds budgeted in future months when calculating its `Ready to Assign` value.
Actual does not include those funds by default, but offers a way to manually reserve funds for use in future months.
This is affectively the same thing nYNAB does, but in a manual form.
To `hold` the leftover funds for the next month follow these steps:

1. Click on your `To Budget` value for the month.
2. Select `Hold for next month`.
3. Fill in how much you would like to reserve for the future. By default the current `To Budget` value is filled in. Using this value will bring your `To Budget` to zero.
4. Click `Hold`.
5. Repeat for all desired months.

A full description of how funds rollover and the `hold` feature can be found in [this article.](../budgeting/#how-money-rolls-over)

#### Duplicate Categories or Groups

Actual does not allow duplicate category groups, or duplicate categories within a group.
This happens sometimes in YNAB especially if you have an old hidden category or group that has been forgotten about.
Actual is automatically rename these duplicates by appending a `-1` to the end of the name (potentially higher numbers if you have multiple duplicates).
Make sure to show hidden categories to see if you have any of these duplicates.
To see your hidden categories select the "Toggle Hidden Categories" option in the kebab menu next to the "Categories" header.

**To Fix duplicate groups**:

1. Move any categories inside the duplicate group to a different group.
2. Delete the duplicate group by selecting "Delete" in the menu next to the group name.

**To Fix Duplicate Categories**:

1. Find the duplicate category and select "Delete" in the menu next to the category name.
2. Choose what category to move any transactions to that are part of this duplicate category.
