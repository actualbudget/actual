# Preview Builds

Each pull request automatically deploys preview builds to Netlify, so you can try out changes without cloning the branch.

To find a PR, browse the [open pull requests](https://github.com/actualbudget/actual/pulls). Once you have the PR number, replace `{pr-number}` in the URLs below.

Three previews are deployed per PR:

- **Demo:** `https://deploy-preview-{pr-number}.demo.actualbudget.org/`
- **Storybook:** `https://deploy-preview-{pr-number}--actualbudget-storybook.netlify.app/`
- **Website:** `https://deploy-preview-{pr-number}.www.actualbudget.org/`

The exact URLs are also posted as a comment on each PR by the Netlify bot.

:::info
There is no sync server on preview builds so when asked "Where's the server" select "Don't use a server." Alternatively, you can use your own self-hosted server. You should exercise caution when using a server with preview builds because they are much more likely to have bugs that could damage your budget. Consider running a separate local server for preview builds.
:::

## Edge Builds

Edge builds, also known as nightly builds, serve as a testing ground for upcoming features before they are included in official monthly releases.
Explore edge builds to access the latest features, but be aware that new features are added and removed regularly, which means that these builds are not always stable.

If you want to try out the edge builds, simply head over to [edge.actualbudget.org](https://edge.actualbudget.org/).

:::info
There is no sync server on the edge build, so when asked, "Where's the server?" select "Don't use a server." Alternatively, you can use your own self-hosted server. You should exercise caution when using a server with edge builds because they are much more likely to have bugs that could damage your budget. Consider running a separate local server for edge builds.
:::
