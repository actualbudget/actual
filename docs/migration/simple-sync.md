# Migration from Full Sync to Simple Sync

The Full Sync method used at the launch of the self-hosted version of Actual had some reliability issues with some users and so a Simple Sync approach has replaced this. If you set up Actual before October 2022, you will be likely using the Full Sync method and upgrading Actual will require you to complete the following steps to migrate your transaction history before using Simple Sync.

## Before upgrading

1. Open your budget
2. [Export your budget](../backup-restore/backup.md)
3. Upgrade your actual server

:::caution
If you have upgraded your server before completing the above steps, you may still be able to export on a device with your existing budget data cached otherwise you would need to manually download the relevant files directly from your server. This is outside the scope of this guide.
:::

## After upgrading

1. [Restore your budget](../backup-restore/restore.md) on one device
2. Select your newly restored budget to load
3. On your other devices, close the existing budget (if already open) and then open the restored file

:::warning
Once you have upgraded, you will be unable to load your older budget files from the "Files" list.
:::
