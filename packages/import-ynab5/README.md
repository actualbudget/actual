
This is a **beta** importer for YNAB5 (nYNAB) data.

To run:

```
npx @actual-app/import-ynab5 <path-to-ynab5-file>
```

Read below for how to get your YNAB5 file.

Almost everything should be working now.

## TODO
 - There might be a way to set carryover using internal categories from YNAB (Deferred Income Subcategory and Immediate Income Subcategory)
 - Docs of how credit cards translate from Actual to YNAB
 - Maybe something else I'm missing
 - Remove ynab transfer payees not used by actual

## How to use the importer

To use the importer, you will first need to export your budget, then have the correct software installed, and then run the importer.

**Note: currently this does not work under WSL in Windows. Run this directly in Windows.**

### Exporting from YNAB

In order to export your budget from YNAB, you will need an API key.

If you haven't already got an API key, you'll need to:

  * Sign in to the YNAB web app
  * Go to the "Account Settings" page, then to the "Developer Settings" page
  * Under the "Personal Access Tokens" section, click "New Token"
  * Enter your password and click "Generate" to get a new access token

The API key is only shown once, so make sure you copy it down somewhere!  More information on how to access the YNAB API can be found at https://api.youneedabudget.com/

Now open a terminal window / command prompt, and enter:

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" https://api.youneedabudget.com/v1/budgets
```

This will get the list of all the budgets you have.  You'll need to find the `id` of the budget you want to export and use it to perform the following API request:

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" https://api.youneedabudget.com/v1/budgets/<BUDGET ID> --output budget.json
```
### Getting the right tools installed

For the importer to run, you will need `nodejs` installed.  Details on doing that are too long for this README, but you can find details at https://nodejs.org/.

Once you have `nodejs` installed, you'll need to get download this importer.  If you're familiar with GitHub and Git then you probably have everything setup to easily clone this repository.  If not, the easiest way to get this importer is to use the `Code` button and then use the `Download ZIP` file.

Once you have downloaded the zip file, unzip it on your computer to extract the files.  Then in a terminal / command prompt, navigate into the directory and type the command:

```bash
npm i
```

This will install the required libraries for the importer.

### Running the importer

* Have _Actual_ running locally on your computer
* Open a terminal / command prompt in the unzipped directory from the previous steps
* Run the following command, substituting the `/path/to` with where ever you saved the `budget.json` file:

```bash
npx @actual-app/import-ynab5 /path/to/budget.json
```

If you have checked out this code and running it locally, do `node index.js` instead of the `npx` command.

### Refresh the cache

Once the import is complete, it may not show all the up-to-date information correctly.  In order to refresh the view:

* Click the ⚙️ icon next to the budget name
* Click Advanced -> Reset budget cache
* Restart _Actual_


## Contributions
If you would like to contribute, check out the [documentation for the API](https://actualbudget.github.io/docs/Developers/using-the-API), specifically about [importers](https://actualbudget.github.io/docs/Developers/using-the-API#writing-data-importers). All of the available methods can be found [here](https://actualbudget.github.io/docs/Developers/API).
