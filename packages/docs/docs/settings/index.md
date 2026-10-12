# Settings

The Settings screen in Actual provides you with a number of options for managing the look and feel of your budget along with some more system specific settings. Most settings are self-explanatory.

You can access the Settings screen by clicking the down arrow by your budget name or going to the sidebar and clicking **Settings**.

There is an option to "Display a notification when updates are available" here.

![The Settings page with the General section open](/img/settings/settings-general@2x.webp)

### Notifications

The option **Show in-app notifications (release notes and announcements)** controls whether Actual shows you news from the project inside the app: the notification bell in the top bar, the Notifications page, and the message that appears after an update. It is on by default and applies to the device you change it on. See [Notifications](../notifications.md) for the full guide.

### Themes

Themes change the user interface colors. Pick from the built-in **Light**, **Dark**, **Midnight**, or **Auto** themes, or install a community-built theme from the catalog. See [Custom Themes](../custom-themes.md) for the full guide.

### Formatting

The formatting options allow you to select the following:

<img width="692" alt="The Formatting section with its four options labeled" src="/img/settings/settings-formatting@2x.webp" />

- **A. Number format.** Your preferred number format.
- **B. Hide decimal places.** Show whole amounts only.
- **C. Date format.** Your preferred date format.
- **D. First day of the week.** Controls how weeks are grouped.

### Language

The language choice alters the display language of all text. If you encounter a translation error, feel free to make a suggestion on [Weblate](https://hosted.weblate.org/projects/actualbudget/actual/).

<img width="664" alt="The Language section with the display language dropdown" src="/img/settings/settings-language@2x.webp" />

### Authentication Method

OpenID can be enabled here. [Learn more](../config/oauth-auth.md)

<img width="662" alt="The Authentication method row with the Start using OpenID button" src="/img/settings/settings-authentication@2x.webp" />

### Encryption

End-to-end encryption allows you to encrypt your budget data on the remote server with a password. If you don't trust the server's owners, enable this setting to encrypt your budget data. Note that [bank sync](../advanced/bank-sync.md) tokens are stored separately on the server and are not covered by this encryption. [Learn more](../getting-started/sync.md#end-to-end-encryption)

<img width="662" alt="The End-to-end encryption row with the Enable encryption button" src="/img/settings/settings-encryption@2x.webp" />

### Budgeting Method

Either Envelope or Tracking Budgeting methods are available in Actual. Envelope Budgeting is recommended and most of the documentation refers to this method.

[Learn more about Envelope Budgeting](../getting-started/envelope-budgeting.md)
<br />
[Learn more about Tracking Budgeting](../getting-started/tracking-budget.md)
<br />
<br />
<img width="664" alt="The Budget section with the button to switch budget type" src="/img/settings/settings-budget-type@2x.webp" />

### Export

This section allows you to download a `.zip` archive of all of your server data for easy backup or migration. [Learn more](../backup-restore/backup.md)

<img width="664" alt="The Data section with the Export data button" src="/img/settings/settings-export@2x.webp" />

## Advanced Settings

Click **Advanced** in the settings navigation to open the advanced section of the Settings page.

### Budget ID

You can have many budgets per install of Actual, each has it's own IDs.
IDs are the names Actual uses to identify your budget internally. The Budget ID is used to identify your budget file. If you are using a server, the Sync ID is used to access the budget on the server.

<img width="664" alt="The Budget file section showing the Budget ID and the Sync ID" src="/img/settings/settings-budget-id@2x.webp" />

### Reset Budget Cache

**Reset budget cache** will clear all cached values for the budget and recalculate the entire budget. All values in the budget are cached for performance reasons, and if there is a bug in the cache you won't see correct values. There is no danger in resetting the cache.

<img width="662" alt="The Budget cache row with the Reset budget cache button" src="/img/settings/settings-reset-cache@2x.webp" />

### Reset Sync

Actual's sync function is quite complicated and is covered in detail [here](../getting-started/sync.md#what-does-resetting-sync-mean). Use this if there is a problem with syncing and you want to start fresh.

**Note:** Resetting sync will also significantly reduce your budget file size. This is because Actual stores all mutations in the budget file by default, causing it to grow over time. When you reset sync, all those historical changes are compressed into a single file.

<img width="662" alt="The Sync row with the Reset sync button" src="/img/settings/settings-reset-sync@2x.webp" />

### Repair Split Transactions

If you are experiencing bugs relating to split transactions or transfers and the "Reset budget cache" button above does not help, this tool may fix them.

<img width="662" alt="The Split transactions and transfers row with the Repair transactions button" src="/img/settings/settings-repair-splits@2x.webp" />

### Experimental Features

This section is where you can enable features that are still in development and testing.
See [Experimental features](../experimental/index.md) for more information.

<img width="664" alt="The Experimental features section with its list of features" src="/img/settings/settings-experimental@2x.webp" />
