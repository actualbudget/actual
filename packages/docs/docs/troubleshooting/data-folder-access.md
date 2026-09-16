# Data Folder Access

The desktop app keeps your budget files in a folder on your computer. By default this is a folder named `Actual` inside your Documents folder. If Actual is not allowed to create, read, or write to that folder, it cannot start.

When this happens, the app shows a **Data folder unavailable** message instead of loading forever. The message includes the exact folder that could not be used, so you know where to look.

## Common Causes

### Windows Controlled Folder Access

Windows includes a ransomware protection feature called **Controlled Folder Access**. When it is turned on, it blocks apps it does not recognize from writing to protected folders such as Documents. Actual is blocked silently, so the only sign is the error message.

To allow Actual through Controlled Folder Access:

1. Open **Windows Security** from the Start menu.
2. Select **Virus & threat protection**.
3. Under **Ransomware protection**, select **Manage ransomware protection**.
4. Select **Allow an app through Controlled folder access**.
5. Select **Add an allowed app**, then **Recently blocked apps**, and choose Actual. If it is not listed, select **Browse all apps** and pick the Actual program file instead.
6. Restart Actual.

:::tip
If you prefer to keep Actual out of the protected folders, you can choose a different data folder instead. See [Choosing a Different Folder](#choosing-a-different-folder) below.
:::

### Antivirus Software

Some antivirus programs also block apps from creating folders and files. If you use one, check its settings for a list of blocked apps or protected folders and add Actual as an exception. Then restart Actual.

### Folder Permissions or a Missing Location

If the message shows an error code other than a permission error, the folder location itself may be the problem. For example, the Documents folder may have been moved or removed, or it may be on a network drive or cloud storage service that is not connected.

Check that the parent folder shown in the message exists and that your user account can create files in it. If you cannot fix the location, choose a different folder as described below.

## Choosing a Different Folder

You do not have to fix the blocked folder to keep using Actual. From the error message, select **Choose a different folder** and pick any folder your user account can write to. Actual checks that it can create files there, saves the choice, and restarts.

If you already have budget files in the old folder, copy them into the new folder after the app restarts, or use the **Move files to new directory** option when changing the folder from within the app.

Once the app is running you can change the folder again at any time: open **Settings** from the budget list and select the pencil button next to **Actual's data directory**.

## Still Stuck?

Open the developer tools with <Key mod="ctrl shift" k="i" /> and look at the **Console** tab. Any errors from the backend are printed there. Share them on the [Actual Budget Discord](https://discord.gg/pRYNYr4W5A) and someone will help you out.
