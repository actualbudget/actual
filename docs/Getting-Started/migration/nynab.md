---
title: 'Migrating from nYNAB'
---

## Method 1: 3rd Party nYnab exporter

While we don't maintain this tool, you can also use https://json-exporter-for-ynab.netlify.app to export your budget from nYNAB into jSON.

### Import json file

- Open Actual
- Select the drop down menu and **Close File**
- Select **Import file**

![](/img/migrating/actual-config-10.png)

- Select **nYnab**

![](/img/migrating/actual-config-12.png)

- Choose the exported json file

## Method 2: Beta export and import tools

This is a beta importer for YNAB5 (nYNAB) data.

To run:

```
npx @actual-app/import-ynab5 <path-to-ynab5-file>
```

**_Read below for how to get your YNAB5 file._**

<!-- Almost everything should be working now.

    There might be a way to set carryover using internal categories from YNAB (Deferred Income Subcategory and Immediate Income Subcategory)
    Docs of how credit cards translate from Actual to YNAB
    Maybe something else I'm missing
    Remove ynab transfer payees not used by actual -->

### How to use the importer

To use the importer, you will first need to export your budget, then have the correct software installed, and then run the importer.

:::note
Currently this does not work under WSL in Windows. Run this directly in Windows.
:::

### Exporting from YNAB

In order to export your budget from YNAB, you will need an API key.

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

### Getting the right tools installed

For the importer to run, you will need nodejs installed. Details on doing that are too long for this README, but you can find details at https://nodejs.org/.

Once you have nodejs installed, you'll need to download this importer. If you're familiar with GitHub and Git then you probably have everything setup to easily clone this repository. If not, the easiest way to get this importer is to use the Code button and then use the Download ZIP file.

Once you have downloaded the zip file, unzip it on your computer to extract the files. Then in a terminal / command prompt, navigate into the directory and type the command:

```
npm i
```

This will install the required libraries for the importer.

#### Running the importer

- Have Actual running locally on your computer
- Open a terminal / command prompt in the unzipped directory from the previous steps
- Run the following command, substituting the /path/to with where ever you saved the budget.json file:

```
npx @actual-app/import-ynab5 /path/to/budget.json
```

If you have checked out this code and running it locally, do

```
node index.js
```

instead of the npx command.
Refresh the cache.

Once the import is complete, it may not show all the up-to-date information correctly. In order to refresh the view:

- Click the gear icon next to the budget name
- Click Advanced -> Reset budget cache
- Restart Actual

### Contributions

If you would like to contribute, check out the documentation for the API, specifically about importers. All of the available methods can be found here.
