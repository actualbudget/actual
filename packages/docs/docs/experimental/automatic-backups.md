# Automatic Backups

<ExperimentalFeatureWarning />

## What Does This Feature Do?

When you use Actual in a web browser, your budget lives inside the browser's own storage. That storage can be lost if you clear your browsing data, if the browser runs out of space, or if your device breaks. Actual can protect you from this by saving a backup to a folder of your choice on your device, automatically, whenever you make changes.

:::note

Automatic backups need the browser to be able to write to a folder on your device. At the moment only Chromium-based desktop browsers such as Google Chrome, Microsoft Edge, Brave and Opera support this. Firefox, Safari and mobile browsers do not, so the Backups section in Settings explains this and points you to the Export option in Settings instead. If you use one of those browsers, consider a [sync server](../install/index.md) or the desktop app, which keeps its own backups.

:::

## Enabling the Feature

1. Open your budget, then click 'More' > 'Settings'.
2. Click 'Show advanced settings', then 'Experimental features'.
3. Turn on **Automatic backups (web app)**.

The **Backups** section now appears in Settings.

## Using Automatic Backups

### Choosing a Backup Folder

1. Open your budget, then click 'More' > 'Settings'.
2. Scroll down to the **Backups** section, which appears once the feature is enabled. It lists the places Actual can back up to. Find **Folder on this device** and click **Choose backup folder**.
3. Your browser asks you to pick a folder. Choose (or create) a folder you keep safe, for example one that is synced to cloud storage, and allow Actual to view and edit files in it.

That is it. From now on, Actual saves a backup shortly after you make a change, and never more often than once every 15 minutes. Backups go into a sub-folder named after your budget, as zip files named by date and time, for example `2024-05-18_14-02-11.zip`. Actual keeps up to three backups from today, one backup for each earlier day, and at most ten backups in total. Older ones are deleted automatically.

You can click **Back up now** at any time to save a backup immediately, **Change folder** to pick a different folder, or **Stop backing up** to turn the feature off.

### Allowing Access Again

Browsers only remember folder access for a while. When you come back to Actual in a new browser session, the Backups section may say that backups are paused. Click **Resume backups** and allow access to continue. Google Chrome offers an **Allow on every visit** option in that prompt, which stops it from asking again. If you have installed Actual as an app from your browser, access is remembered automatically.

Actual also shows a notification if it loses access to the folder while you are working, so that you know backups have stopped.

:::caution

Backups saved to your folder are not encrypted, even if you have turned on end-to-end encryption for your budget. Keep the folder somewhere only you can access.

:::

### Restoring an Automatic Backup

Each backup is a normal Actual export, so you can restore it the same way as any exported file. See [Restoring a Backup](../backup-restore/restore.md) for the steps.
