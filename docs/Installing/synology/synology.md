---
title: 'Synology'
---

[reverse-proxy]: ./synology-reverse-proxy
[watchtower]: ./synology-watchtower

# Synology DSM 7.1

Actual can be hosted on a Synology Diskstation where total control of your data can be maintained.

## Installing Docker

1.  Navigate to Package Center.

2.  Search for Docker and install the package.

![](/img/synology-docker-install.png)

## Create a folder for your budget data to reside

1.  Navigate to **File Station**

2.  A folder named **docker** should be along the left hand side.  Open the docker folder and create a new folder inside named **actual**.

3.  If you will be using multiple containers for actual for multiple users, you may name this something more descriptive for each user.

![](/img/synology-docker-folder-creation.png)

## Installing Actual

1.  Open the Applications menu and open Docker.

2.  Select the Registry menu item on the left hand side.

3.  Search for jlongster/actual-server

![](/img/synology-docker-registry-search.png)

4.  Select the **Image** and then press the download button.  Select the **latest** tag.

![](/img/synology-docker-registry-tag.png)

5.  Once the image is downloaded, navigate the the **Image** menu item.

6.  Select the newly downloaded image for actual-server, and press the **Launch** button at the top of the screen.

![](/img/synology-docker-launch-image.png)

7.  A new dialog menu will appear and ask for network settings.  **Use the selected networks** (bridge) and press **Next**.

![](/img/synology-container-setup1.png)

8.  Give your new container a name, or use the default.  **Enable auto-restart**.  **Next**.  The remaining options can stay at the default values.

![](/img/synology-container-setup2.png)

9.  **Add** ports to your container.  DSM uses port 5006 for another application, so we will give Actual a different port.  Set the **Local** port to 5007. Set the **Container** port to 5006. **Next**.

![](/img/synology-container-setup3.png)

10.  **Add Folder**, select the folder that was created above using **File Station**.  Set the **Mount path** to **/data**.  **Next**.

![](/img/synology-container-setup4.png)

![](/img/synology-container-setup5.png)

11.  A summary of your container will be displayed.  Press **Done**.

![](/img/synology-container-setup6.png)

You now have Actual installed on your Synology NAS.  Now let's try to access it.

Using your preferred web browser, try typing the IP address of the NAS into the address bar followed by port 5007.  I.e.  http://(ip address):5007
If you see the welcome page to Actual, that's great!  If not, you may have your firewall enabled and need to allow the port.

## Letting Actual through the firewall

1.  Navigate to the **Control Panel**.

2.  Navigate to the **Security** icon.

![](/img/synology-firewall1.png)

3.  Click on the **Firewall** tab and then select **Edit Rules**

![](/img/synology-firewall2.png)

4.  Create a new rule that allows port 5007.  This should be place before the final rule, which is usually a DENY rule for all remaining ports.

![](/img/synology-firewall3.png)

![](/img/synology-firewall4.png)

5.  Select **OK** and try connecting to Actual again.

If you are only wanting to access Actual on your home network, this is the end of the instructions.  If you want to automatically update Actual when there is a new release or access Actual when you are away from your home network, read on.
