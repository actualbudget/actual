---
title: 'Preview Builds'
---

It is now possible using our deployment pipeline to run preview builds of Actual directly on Netlify. 

To do this, Find the pull request (pr) that you would like to preview in GitHub, you can find the pull requests in scope of the preview builds [here](https://github.com/actualbudget/actual/pulls).

Once you have the number of the pr navigate to the following URL https://deploy-preview-{pr_number}--actualbudget.netlify.app/ replacing {pr_number} with the number of the pr you would like to preview, for example https://deploy-preview-414--actualbudget.netlify.app/

This will load directly on Netlify where you will be able to preview the changes in that pull request without the need to clone the specific branch.  

:::info
There is no sync server on preview builds so when asked "Where's the server" select "Don't use a server"
:::
