# Managing Files

A _file_ is your data that consists of all budgets, transactions, accounts, and everything else. You can create as many files as you want. This lets you create multiple budgets, isolate accounts, and more.

:::note
These instructions relate exclusively to the desktop application
:::

## Creating a New File

### Desktop

- On the desktop app, go to the file management screen from the **File** > **Open file…** menu item, or press <Key mod="cmd" k="o" />.
- Click **Create new file**.

## Deleting a File

- On desktop, click the **X** next to the file on the file management screen.

## Renaming a File

Open the file, and click on the name in the top left of the app. You will be able to rename it.

## Sharing a File with Other Users

:::note
Sharing files requires [multi-user support](../config/multi-user.md), which needs an OpenID provider.
:::

You can share a file that has been synced to your server with other users of that server. Only the file's owner, or a user with the Admin role, can change who has access.

1. Make sure the person you want to share with is listed in the [User Directory](../config/multi-user.md#user-directory). An Admin can add them there.
2. Open the file you want to share.
3. Open the server menu and choose **User Access Management**.
4. Tick the user to give them access to the file. Untick them to revoke it.

Users you share a file with will see it in their file list the next time they open Actual, and can open it like their own files. If the file uses [end-to-end encryption](./sync.md#end-to-end-encryption), they also need its encryption password to open it on a new device. The file list shows the owner's name on files someone else owns, and the owner can hover over a shared file to see who it is shared with.

See [User Access Management](../config/multi-user.md#user-access-management) for the full set of controls, including transferring ownership.
