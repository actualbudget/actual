---
title: "Migration Overview"
---

:::note
[Click here](simple-sync) if you are looking for the steps to migrate from "full sync" to (the more reliable) "simple sync" method.
:::


Keeping your existing transaction history is important. If you already use a different app, you probably want to migrate it over into Actual.

Right now, only YNAB4 is officially supported. However, the [API](/developers/API/) allows anyone to write a custom importer. We will work with the community to help write other importers soon.

## Migration from the old Desktop App
:::note
Are you coming from the original, managed Actual subscription service? That used an older version of the desktop app which doesn't have the export button, but you can log in to the Web version at app.actualbudget.com to export your data in a format suitable for importing in your new instance. See [Backups](https://actualbudget.github.io/docs/Backup-Restore/Backups) and [Restoring](https://actualbudget.github.io/docs/Backup-restore/Restore).

Instead of creating an export from the Web app, you can also create a zip archive of your budget folder, which is equivalent. The folder is located at `~/Documents/Actual/My-Budget-abc123` by default on MacOS and Linux. The resulting zip file can be imported into Actual via the Web app.
:::note

## Migration from other apps

[YNAB4](ynab4) is the only built-in importer right now. We're hoping the community can help build other importers on top of the [API](/developers/API/).

:::note
There are guides [here](../../Advanced/advanced-intro) for some advanced migration tasks.
:::
