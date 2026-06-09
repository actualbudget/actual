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

## Nightly Builds

Nightly builds serve as a testing ground for upcoming features before they are included in official monthly releases.
Explore nightly builds to access the latest features, but be aware that new features are added and removed regularly, which means that these builds are not always stable.

### Nightly Web Builds

If you want to try out the nightly build of the web app, simply head over to [nightly.actualbudget.org](https://nightly.actualbudget.org/).

:::info
There is no sync server on the nightly build, so when asked, "Where's the server?" select "Don't use a server." Alternatively, you can use your own self-hosted server. You should exercise caution when using a server with nightly builds because they are much more likely to have bugs that could damage your budget. Consider running a separate local server for nightly builds.
:::

### Nightly Desktop Builds

The [desktop app](../install/desktop-app.md) is also built every night. The builds are published as downloadable artifacts on the [Publish nightly desktop app](https://github.com/actualbudget/actual/actions/workflows/publish-nightly-electron.yml) GitHub Actions workflow.

To download the latest nightly desktop build:

1. Sign in to [GitHub](https://github.com/login). You need a GitHub account (a free one is fine), as GitHub only lets signed-in users download workflow artifacts.
2. Open the [list of nightly desktop builds](https://github.com/actualbudget/actual/actions/workflows/publish-nightly-electron.yml?query=is%3Asuccess) and click the most recent run at the top of the list.
3. Scroll down to the **Artifacts** section at the bottom of the page.
4. Download the artifact that matches your operating system and processor architecture.
5. The artifact downloads as a `.zip` file. Extract it to get the installer, then install it as you would the regular desktop app.
