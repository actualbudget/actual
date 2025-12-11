# Settings

The Settings screen in Actual provides you with a number of options for managing the look and feel of your budget along with some more system specific settings. Most settings are self-explanatory.

You can access the Settings screen by clicking the down arrow by your budget name or going to the sidebar and clicking More > Settings.

There is an option to "Display a notification when updates are available" here.

![Image of Settings top pf page](/img/using-actual/actual-settings.webp)

### Themes

Themes change the user interface colors

### Formatting

The formatting options allow you to select the following:

- Your preferred date format
- Your preferred number format
- Your preferred first day of the week
- The option to "Hide decimal places"

![Image of Formatting setting](/img/using-actual/settings-formatting.webp)

### Language

The language choice alters the display language of all text. If you encounter a translation error, feel free to make a suggestion on [Weblate](https://hosted.weblate.org/projects/actualbudget/actual/).

![Image of language setting](/img/using-actual/actual-languages.webp)

### Authentication Method

OpenID can be enabled here. [Learn more](/docs/config/oauth-auth)

![Image of OpenID setting](/img/using-actual/actual-openid.webp)

### API Tokens

API tokens allow you to grant programmatic access to your budgets without sharing your password. This is useful for scripts, automations, and third-party integrations that use the [Actual API](/docs/api/).

#### Creating a Token

1. Click **Create API Token**
2. Enter a descriptive name for the token (e.g., "Bank sync script" or "Monthly export automation")
3. Click **Create Token**
4. **Copy the token immediately** - it will only be shown once

:::warning

The full token is only displayed once when created. If you lose it, you'll need to create a new token and update any scripts using the old one.

:::

#### Managing Tokens

The API Tokens section displays all your tokens with:
- **Name** - The descriptive name you gave the token
- **Prefix** - The first few characters of the token (e.g., `act_a1b2...`) for identification
- **Created date** - When the token was created
- **Last used** - When the token was last used to authenticate

To revoke a token, click the **Revoke** button next to it. This immediately invalidates the token - any scripts or integrations using it will no longer be able to authenticate.

#### Best Practices

- **Use descriptive names** - Name tokens after their purpose so you know what will break if you revoke them
- **Create separate tokens** for different scripts or integrations, so you can revoke one without affecting others
- **Revoke unused tokens** - Regularly review your tokens and remove any that are no longer needed
- **Monitor last used dates** - If a token hasn't been used in a long time, consider revoking it

For information on using tokens in your scripts, see the [API documentation](/docs/api/api-tokens).

### Encryption

End-to-end encryption allows you to encrypt the data on your remote server with a password. If you don't trust the server's owners, enable this setting to fully encrypt the data. [Learn more](/docs/getting-started/sync/#end-to-end-encryption)

![Image of Encryption setting](/img/using-actual/settings-encryption.webp)

### Budgeting Method

Either Envelope or Tracking Budgeting methods are available in Actual. Envelope Budgeting is recommended and most of the documentation refers to this method.

[Learn more about Envelope Budgeting](/docs/getting-started/envelope-budgeting)
<br />
[Learn more about Tracking Budgeting](/docs/getting-started/tracking-budget)
<br />
<br />
![Image of budgeting methods setting](/img/using-actual/actual-budget-method.webp)

### Export

This section allows you to download a `.zip` archive of all of your server data for easy backup or migration. [Learn more](/docs/backup-restore/backup)

![Image of Export setting](/img/using-actual/settings-export.webp)

## Advanced Settings

Click on the `Show advanced settings` link to open the advanced section of the Settings page.

### Budget ID

You can have many budgets per install of Actual, each has it's own IDs.
IDs are the names Actual uses to identify your budget internally. The Budget ID is used to identify your budget file. If you are using a server, the Sync ID is used to access the budget on the server.

![Image of BudgetID setting](/img/using-actual/actual-budgetid.webp)

### Reset Budget Cache

**Reset budget cache** will clear all cached values for the budget and recalculate the entire budget. All values in the budget are cached for performance reasons, and if there is a bug in the cache you won't see correct values. There is no danger in resetting the cache.

![Image of Reset Cache setting](/img/using-actual/actual-budget-cache.webp)

### Reset Sync

Actual's sync function is quite complicated and is covered in detail [here](../getting-started/sync.md#what-does-resetting-sync-mean). Use this if there is a problem with syncing and you want to start fresh.

**Note:** Resetting sync will also significantly reduce your budget file size. This is because Actual stores all mutations in the budget file by default, causing it to grow over time. When you reset sync, all those historical changes are compressed into a single file.

![Image of Reset Sync setting](/img/using-actual/actual-reset-sync.webp)

### Repair Split Transactions

If you are experiencing bugs relating to split transactions or transfers and the "Reset budget cache" button above does not help, this tool may fix them.

![Image of Repair Splits setting](/img/using-actual/actual-repair.webp)

### Experimental Features

This section is where you can enable features that are still in development and testing.
See [Experimental features](../experimental) for more information.

![Image of Experimental setting](/img/using-actual/actual-experimental.webp)
