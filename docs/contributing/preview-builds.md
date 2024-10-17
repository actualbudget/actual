# Preview Builds

It is possible using our deployment pipeline to run preview builds of Actual directly on Netlify.

To do this, Find the pull request (pr) that you would like to preview in GitHub, you can find the pull requests in scope of the preview builds [here](https://github.com/actualbudget/actual/pulls).

Once you have the number of the pr navigate to the following URL https://deploy-preview-{pr_number}--actualbudget.netlify.app/ replacing {pr_number} with the number of the pr you would like to preview, for example https://deploy-preview-414--actualbudget.netlify.app/

This will load directly on Netlify where you will be able to preview the changes in that pull request without the need to clone the specific branch.

:::info
There is no sync server on preview builds so when asked "Where's the server" select "Don't use a server." Alternatively, you can use your own self-hosted server. You should exercise caution when doing using a server with preview builds because they are much more likely to have bugs that could damage your budget. Consider running a separate local server for preview builds.
:::

## Edge Builds
Edge builds, also known as nightly builds, serve as a testing ground for upcoming features before they are included in official monthly releases.
Explore edge builds to access the latest features, but be aware that new features are added and removed regularly, which means that they are not always stable.

Get access to the latest features by exploring edge builds, but be aware that new features are added and removed regularly, which means that they are not always stable.

If you want to try out the edge builds, simply head over to [edge.actualbudget.org](https://edge.actualbudget.org/).

:::info
There is no sync server on the edge build, so when asked, "Where's the server?" select "Don't use a server." Alternatively, you can use your own self-hosted server. You should exercise caution when using a server with edge builds because they are much more likely to have bugs that could damage your budget. Consider running a separate local server for edge builds.
:::
