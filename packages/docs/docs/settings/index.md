# Settings

The Settings screen in Actual provides you with a number of options for managing the look and feel of your budget along with some more system specific settings. Most settings are self-explanatory.

You can access the Settings screen by clicking the down arrow by your budget name or going to the sidebar and clicking More > Settings.

There is an option to "Display a notification when updates are available" here.

![Image of Settings top pf page](/img/using-actual/actual-settings.png)

### Themes

Themes change the user interface colors

### Formatting

The formatting options allow you to select the following:

- Your preferred date format
- Your preferred number format
- Your preferred first day of the week
- The option to "Hide decimal places"

![Image of Formatting setting](/img/using-actual/settings-formatting.png)

### Language

The language choice alters the display language of all text. If you encounter a translation error, feel free to make a suggestion on [Weblate](https://hosted.weblate.org/projects/actualbudget/actual/).

![Image of language setting](/img/using-actual/actual-languages.png)


### Authentication Method

OpenID can be enabled here. [Learn more](/docs/config/oauth-auth)

![Image of OpenID setting](/img/using-actual/actual-openid.png)

### Encryption

End-to-end encryption allows you to encrypt the data on your remote server with a password. If you don't trust the server's owners, enable this setting to fully encrypt the data. [Learn more](/docs/getting-started/sync/#end-to-end-encryption)

![Image of Encryption setting](/img/using-actual/settings-encryption.png)

### Budgeting Method

Either Envelope or Tracking Budgeting methods are available in Actual. Envelope Budgeting is recommended and most of the documentation refers to this method.

[Learn more about Envelope Budgeting](/docs/getting-started/envelope-budgeting)
<br />
[Learn more about Tracking Budgeting](/docs/getting-started/tracking-budget)
<br />
<br />
![Image of budgeting methods setting](/img/using-actual/actual-budget-method.png)

### Export

This section allows you to download a `.zip` archive of all of your server data for easy backup or migration. [Learn more](/docs/backup-restore/backup)

![Image of Export setting](/img/using-actual/settings-export.png)

## Advanced Settings

Click on the `Show advanced settings` link to open the advanced section of the Settings page.

### Budget ID

You can have many budgets per install of Actual, each has it's own IDs.
IDs are the names Actual uses to identify your budget internally. The Budget ID is used to identify your budget file. If you are using a server, the Sync ID is used to access the budget on the server.

![Image of BudgetID setting](/img/using-actual/actual-budgetid.png)

### Reset Budget Cache

**Reset budget cache** will clear all cached values for the budget and recalculate the entire budget. All values in the budget are cached for performance reasons, and if there is a bug in the cache you won’t see correct values. There is no danger in resetting the cache. 

![Image of Reset Cache setting](/img/using-actual/actual-budget-cache.png)

### Reset Sync

Actual's sync function is quite complicated and is covered in detail [here](../getting-started/sync.md#what-does-resetting-sync-mean). Use this if there is a problem with syncing and you want to start fresh.

**Note:** Resetting sync will also significantly reduce your budget file size. This is because Actual stores all mutations in the budget file by default, causing it to grow over time. When you reset sync, all those historical changes are compressed into a single file.

![Image of Reset Sync setting](/img/using-actual/actual-reset-sync.png)

### Repair Split Transactions

If you are experiencing bugs relating to split transactions or transfers and the “Reset budget cache” button above does not help, this tool may fix them.

![Image of Repair Splits setting](/img/using-actual/actual-repair.png)

### Experimental Features

This section is where you can enable features that are still in development and testing.
See [Experimental features](../experimental) for more information.

![Image of Experimental setting](/img/using-actual/actual-experimental.png)
