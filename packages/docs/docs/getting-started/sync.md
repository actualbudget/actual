# Syncing Across Devices

Actual is a different kind of app. It stores all of your data on your installed Actual server by default AND it stores all of your data on your local device. That means it works regardless of your network connection, and you always have direct access to your data. Your data never goes to any external servers that you don't choose. It's your data, and you're in control.

We don't want to throw away the internet though. It's too useful. You can set up your server to access it through a VPN or through the wider internet. The choice is yours. You can access it from any device easily, and you never have to worry about losing your data in case you drop your laptop or phone into a lake.

That's why we automatically sync all of your data to your selected server in the background. You get the best of both worlds: all data is local by default, but if internet is available, your data is seamlessly backed up and synced to all other devices. This is the opposite of most apps which heavily rely on the internet to be available.

For the super privacy-focused, it even allows for your data to be end-to-end encrypted so that all your server is doing is passing around changes that you make to your budget.

## Getting Started

Once you are logged in, if you have not created a file yet it will automatically create one for you. Go ahead and poke around the app and start setting up your budget.

If you have already created files, after logging in Actual will show you all the available budget files. Select one and it will download that budget and start syncing seamlessly. That's it.

## End-to-End Encryption

In addition to the requirement to enter your password before the Actual server will allow you to access your budget, you can optionally enable end-to-end encryption. This will require you to enter a second password to access the budget, and that the server will no longer be able to access your budget information. On the one hand, this improves security if you're worried that someone else will have access to the server's file or if you don't trust the server to check the password correctly (that said, we have done our best to make the server secure). On the other hand, you **will not be able to recover your data if you forget your encryption password**. If you forget the encryption password and you still have a copy of your data locally, you can reset your key which will do a [sync reset](#what-does-resetting-sync-mean) and generate a new key.

End-to-end encryption offers the ability for you to generate a key based on a password and encrypt it so that hosted services can't read the data. Before your data leaves your device, it is encrypted using keys only you have.

This guarantees that only you will ever have access to your data. This is optional and using it requires you to enter a password whenever downloading [cloud files](#this-file-is-not-a-cloud-file) (this only needs to be done once per device). The password you enter should be different from the main server password.

Data on your local device is still unencrypted. We recommend full disk encryption if you are interested in local encryption.

There are some things to consider with end-to-end encryption:

- **Pro:** Your data is fully secure and nobody except you can read it
- **Pro:** If you don't want to sync across devices, this still allows you keep a fully encrypted backup of your data
- **Pro:** If you want to share the server with someone else, you can use different passwords to encrypt separate budget files, and you won't be able to access each other's budgets.
- **Con:** If you lose your local data copy and forget your password, you can never recover your data
- **Con:** It is not possible to turn off encryption. This is a one way process. If you would like to move back to an unencrypted file after enabling encryption, you can use the steps in the [Backup](../backup-restore/backup.md) and [Restore](../backup-restore/restore.md) sections.
- **Con:** There is a minor performance hit because of encoding & decoding your data whenever syncing

Note: even if you don't have the password, you can still remove an encrypted file from the server.

### Setting up End-to-End Encryption

You can enable end-to-end encryption by opening a budget file, going into settings, and clicking "enable encryption" in the Encryption section. You will be asked to enter a password, and a key will be generated from it that will encrypt all your data from then on.

When downloading data on other devices, you will need to enter the same password to generate the key to be able to decrypt your data.

**Do not lose this password**. You will not be able to recover your data if you forget it. If you forget it and you still have a copy of your data locally, you can reset your key which will do a [sync reset](#what-does-resetting-sync-mean) and generate a new key.

## What Does "Resetting Sync" Mean?

There are many reasons why you might want to "start fresh" with syncing. This doesn't mean you lose any of your local data, but it means for one reason or another you want to forget about all synced data and start as if the current version of your file is the "true" version of it.

Since your data is local to each device and they all might not be up-to-date, **choose the right device** from which to reset sync. This usually won't matter, but it's important to realize that when you reset sync from one device, all un-synced changes from other devices will be reverted. Usually file sync happens often enough that this isn't a problem. But if you happen to have a lot of changes that haven't been synced from one device (maybe it wasn't connected to the internet), make sure to do the sync reset from that device so it becomes the "true" version of your data.

A few scenarios where you want a sync reset:

- You restore from a backup. You wouldn't want to restore from a backup, only to find that it synced back up to where you were before! You want syncing to start fresh from the backup.
- You turn on end-to-end encryption. If you do this, the server needs to forget about any unencrypted data it already knows about. This requires starting fresh.
- In the worst case scenario, you have data that is out of sync. This should never happen, but just in case it ever does, you can manually reset sync from the file that you want to treat as the "true" version.

Resetting sync will clear all syncing data from the server, upload your existing data as the "true" version, and provide your device with a new "sync id". All devices syncing data must have the same sync id.

**Note:** Resetting sync will also significantly reduce your budget file size. This is because Actual stores all mutations in the budget file by default, causing it to grow over time. When you reset sync, all those historical changes are compressed into a single file.

After resetting, all other devices are now out-of-date. What happens when you try to run them? Actual will detect that syncing has been reset and tell you that they need to be reverted. Reverting a file will delete the local data, download the latest version of it, and assign the latest sync id generated by the reset. It will happily sync from then on.

**Actual will always guide you through this**. It tracks the status of all your files and will notify you if something is wrong and give you steps to fix the problem. If you want to manually reset sync, you can do that in settings.

## Debugging Sync Issues

When Actual detects a problem during syncing, you will see a notification with details and actions to solve the problem. Below are all the notifications you might see, with some greater detail about them.

**You will rarely see these messages**, and if you do Actual will guide you through how to fix the problem. If you are still having problems, please [reach out to us](/contact).

### This File is not a Cloud File

A "cloud file" is a file that has been registered with your server and is currently syncing data. Sometimes a file hasn't been registered yet so it can't send any data to sync.

Usually this happens when a new file is created with no internet connection available. In that case, it creates a local file but the server doesn't know anything about it. When you are online you need to register it.

### Syncing Has Been Reset on This Cloud File

If you reset sync on a device, all other devices will see this message when they try to sync. When you reset sync, it deletes all syncing data from our server (but not any local data) and treats your local file as the "true" version. Because all the syncing data has been reset, other devices cannot sync anymore.

When this happens, on other devices you will see an option to revert to the latest version. Simply reverting will get you syncing again. See [What Does "Resetting Sync" Mean?](#what-does-resetting-sync-mean)

### File Needs Upload

Something must have gone wrong when doing a sync reset. This shouldn't ever really happen, but in the off chance that you see this message, click "Upload" to upload your data to fix it.

### Your Data is Out of Sync

Unfortunately, Actual detected an inconsistency in your synced data. This only happens if there is a bug in the syncing process, and you should never see this. If it ever does happen, doing a [sync reset](#what-does-resetting-sync-mean) will fix it.

### Update Required

While syncing, your device received data that it couldn't apply because your version of Actual is out-of-date. You need to update Actual and it will then sync successfully.

## Multi-user Support

The same budget file may be opened and edited simultaneously from two separate browsers, even by two different people on different client computers. This should work unless the edits conflict. To be safe, avoid simultaneous usage of the same budget file.
