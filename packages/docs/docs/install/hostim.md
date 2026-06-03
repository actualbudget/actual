---
title: 'Hostim'
---

[Hostim](https://hostim.dev/) offers one-click hosting for open source apps. You can run
Actual Budget with Docker, a persistent volume, and automatic HTTPS without touching the
command line.

Hostim runs the official `actualbudget/actual-server` image, so you can redeploy to pull the
latest release whenever you want.

## Deploying Actual on Hostim

[Click here to deploy Actual Budget on Hostim](https://hostim.dev/docs/templates/actual).

1. Open the template and choose a resource plan (the lowest setting is fine — your browser
   does most of Actual's computation).
2. Deploy. Your app comes up with a free `*.hostim.dev` domain and HTTPS.
3. On first visit, set a server password and create your budget file.

:::warning

Keep your Actual server password safe — it cannot be recovered. Your budget data is stored in
the persistent `/data` volume.

:::

After setting up, head over to our [Starting Fresh](/docs/getting-started/starting-fresh)
guide to get started with Actual Budget.
