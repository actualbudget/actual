# Settings

The settings screens in Actual provide you with a number of options for managing the look and feel of your budget along with some more system specific settings.

You can access the Settings screen by clicking the down arrow by your budget name or going to the sidebar and clicking More > Settings.

![](/img/using-actual/settings-1.webp)

### Formatting

The formatting options allow you to select the following:

- Your preferred date format
- Your preferred number format
- Your preferred first day of the week

![](/img/using-actual/settings-formatting.webp)

### Encryption

End-to-end encryption allows you to encrypt the data on your remote server with a password. If you don't trust the server's owners, enable this setting to fully encrypt the data. Read more about this feature on the [Syncing Across Devices page.](../getting-started/sync/#end-to-end-encryption)

![](/img/using-actual/settings-encryption.webp)

### Export

This section allows you to download a `.zip` archive of all of your server data for easy backup or migration.

![](/img/using-actual/settings-export.webp)

## Advanced Settings

![](/img/using-actual/settings-advanced.webp)

### Budget ID

Your Budget ID is a unique identifier that identifies the specific budget file that you have open. You can have many budgets per install of Actual and this allows you to identify which budget the data relates to.

### Reset Budget Cache

Resetting the Budget Cache clears all cached values and will completely re-calculate your entire budget. Many of these values are cached on your browser to improve performance.

### Reset Sync

Actual's sync function is quite complicated and is is covered in detail [here](../getting-started/sync.md#what-does-resetting-sync-mean). This is typically the last-resort to fix any potential issues with sending budget files between other devices.

### Repair Split Transactions

If you are experiencing bugs relating to split transactions and the "Reset budget cache" button above does not help, this tool may fix them.

### Experimental Features

Be careful with this section; you might encounter irrecoverable errors if you enable these settings. But if you want to test out some bleeding-edge features, here's your place to do it. We _highly_ recommend backing up your budget before continuing, just in case. As of the [latest release](../releases.md), the current available experimental features are:

- Monthly spending
- Budget mode toggle
- Goal templates
- SimpleFIN sync
