---
title: 'Synology Automatic Updates'
---

:::note This page details a method of automatically updating actual that uses 3rd party software not maintained or written by the development team of Actual Budget.  The continued maintenance, applicability or potential data loss is not guaranteed by Actual when using this software.  Direct all bug requests with regards to automatically updating Docker containers to the maintainer of the package chosen.
:::
:::caution These instructions grant root access to a 3rd party package.  This is an inherent security risk.  If you are uncomfortable with this risk, this method may not be suitable for you.
:::

Updating containers on a Synology isn't hard, but it can be tedious if you have to do it too many times. This page will provide instructions for one method to automate the task.

1.  Navigate to the **Docker** application

![](/img/synology-autoupdate-1.png)

2.  Search for and download **containrrr/watchtower** using the **latest** tag.

![](/img/synology-autoupdate-2.png)

3. Navigate to the **Control Panel** and go to the **Task Scheduler** menu.

![](/img/synology-autoupdate-3.png)

4. Create a new **Scheduled task/User defined script**.

![](/img/synology-autoupdate-4.png)

5. Change the user to **root** on the **General tab**

![](/img/synology-autoupdate-5.png)

6.  Change the schedule to **Run on the following date** and **Do not repeat** on the **Schedule tab**

![](/img/synology-autoupdate-6.png)

7.  Add the following string to the **Task Settings** tab

![](/img/synology-autoupdate-7.png)

```docker run -d --name watchtower -v /var/run/docker.sock:/var/run/docker.sock containrrr/watchtower --interval 86400 --cleanup```

* The -v command allows Watchtower to connect to Dockers socket and update running containers.
* The --interval command is in seconds.  86400 will set an update interval every 24 hours.
* The --cleanup command will delete old images after downloading and installing new ones to reduce clutter.

8.  Press OK.  Select the newly created scheduled task and select the **Run** command.

![](/img/synology-autoupdate-7.png)

You can now go to the Docker application and you should have a newly created watchtower container that will automatically update your Actual container any time there is a new release.  You can also delete the newly created schedule if you wish.
