---
title: 'Updating Actual'
---

## Updating Actual

:::caution Before starting this step, backup your budget! You can find out how to do that [here](#exporting-data-from-actual).
Failure to do this may result in budget loss.
:::

This section focuses on updating the actual-server

Press the start menu or windows key on your keyboard and type **cmd**

![](/img/windows-start-1.png)

when command prompt appears in the search results, **right click** it and run it as **Administrator**

![](/img/windows-start-2.png)

Navigate to the C:\ drive using this command

```cmd
cd C:\
```

![](/img/cmd-1.png)

Assuming you followed this guide before, navigate to the github directory you created to clone
actual and then into the actual-server directory

```cmd
cd github\actual-server
```

![](/img/cmd-26.png)

We now need to clone the latest changes made to the actual-server repo, to do this, run the
following command from your command prompt:

```cmd
git pull origin master
```

![](/img/cmd-25.png)

Once that is done, run the deployment command to push your changes to fly.

```cmd
flyctl deploy.
```

Once that is complete, [delete your browsing history](https://www.howtogeek.com/304218/how-to-clear-your-history-in-any-browser/)
and web files.

Load up your budget and if required [restore your backup](#importing-data-into-actual) and that is
Actual Server updated.
