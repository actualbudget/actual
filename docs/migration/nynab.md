# Migrating from nYNAB

In order to export your budget from YNAB, you will need to use one of two methods.

## 3rd Party nYnab Exporter

This is the easiest method available. While we don't maintain this tool, https://json-exporter-for-ynab.netlify.app will handle authorizing with your account to export your nYNAB budget into JSON.

## Export Using API Key

If you don't want to use a third party tool, you will need an API key.

If you haven't already got an API key, you'll need to:

    Sign in to the YNAB web app
    Go to the "Account Settings" page, then to the "Developer Settings" page
    Under the "Personal Access Tokens" section, click "New Token"
    Enter your password and click "Generate" to get a new access token

:::caution
The API key is only shown once, so make sure you copy it down somewhere! More information on how to access the YNAB API can be found at https://api.youneedabudget.com/
:::

Now open a terminal window / command prompt, and enter:

:::note

If you receive an error message like: `Invoke-WebRequest : Cannot bind parameter 'Headers'`, this is because curl is probably aliased to the "Invoke-WebRequest" Powershell commandlet. Use `curl.exe` instead of just `curl` in the commands below to fix this.

:::

```
curl -H "Authorization: Bearer <ACCESS_TOKEN>" https://api.youneedabudget.com/v1/budgets
```

This will get the list of all the budgets you have. You'll need to find the id of the budget you want to export and use it to perform the following API request:

```
curl -H "Authorization: Bearer <ACCESS_TOKEN>" https://api.youneedabudget.com/v1/budgets/<BUDGET ID> --output budget.json
```

### Import the JSON File

- Open Actual
- Select the drop down menu and **Close File**
- Select **Import file**

![](/img/migrating/actual-import-1.png)

- Select **nYnab**

![](/img/migrating/actual-import-2.png)

- Choose the exported json file
