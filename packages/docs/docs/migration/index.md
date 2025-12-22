# Migration Overview

Keeping your existing transaction history is important. If you already use a different app, you probably want to migrate it over into Actual.

Right now, only YNAB4 is officially supported. However, the [API](/docs/api/index.md) allows anyone to write a custom
importer. We will work with the community to help write other importers soon.

## Migration from YNAB

- [Migration from YNAB4](/docs/migration/ynab4)
- [Migration from nYNAB](/docs/migration/nynab)

## Migration from the old Actual Budget Desktop App

Are you coming from the original, managed Actual subscription service? That used an older desktop app version,
which doesn't have the export button. You can also create an equivalent zip archive of your budget folder.
The folder is at `~/Documents/Actual/My-Budget-abc123` by default on macOS and Linux. The the resulting zip file
can be imported into Actual via the Web app.

See [Restoring](/docs/backup-restore/restore.md) how to restore that data in the new open source version.
