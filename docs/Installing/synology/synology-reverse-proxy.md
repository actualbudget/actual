---
title: 'Enabling a Reverse Proxy'
---

1. If you don't have a registered hostname, Synology offers a free service that provides one. You can also use your existing provider. This information is found in the **Control Panel** in the **External Access** menu.
![](/img/synology-reverseproxy1.png)

2. Navigate to the **Login Portal** menu and click on the **Advanced** tab. Then click on the **Reverse Proxy** button.

![](/img/synology-reverseproxy2.png)

:::note
You may come back to this step later.
:::

3.  Add a new rule. Give the reverse proxy rule a name. Set the hostname to whatever you like. In this example, it is set to budget (hostname set in step 1). A reverse proxy uses the port `443` SSL port. Enable HSTS and set the destination to your Actual docker container. There is an option for access control restriction. This can be used to limit the IP addresses that are allow to access this reverse proxy. It is especially useful if you want to use a VPN connection in addition to a reverse proxy.

![](/img/synology-reverseproxy3.png)

4. Your reverse proxy needs an SSL certificate. We can add one from the **Security** menu under the **Certificate** tab.

![](/img/synology-reverseproxy4.png)

5.  Choose a certificate from **Let's Encrypt** if you don't already have a certificate you want to use.

![](/img/synology-reverseproxy5.png)

6. Type in your new domain name you generated from the Reverse Proxy setup in step 3.

![](/img/synology-reverseproxy6.png)

Once all of these settings are applied, you may have to forward port `443` from your router to your Synology. A DNSMASQ rule may also have to be set to use the hostname on your local network. Check your routers documentation if you need instructions on setting up port forwarding rules and DNSMASQ.

If you have a VPN set up for your local network, it is possible to restrict usage of your new reverse proxy Actual container to only devices on your local network or VPN.  Go back to the menu in step 3 and add an **Access Restriction** rule.

The first line should represent your local area network IP address range, while the second line should represent your VPN IP address range.  Once this rule is set up, edit your reverse proxy rule and apply the Access Control profile.

![](/img/synology-reverseproxy-localusers.png)
