# Actual Budget Community Documentation

This repo is the Actual Budget community documentation website, built using [Docusaurus 3](https://docusaurus.io/), a modern static website generator.

[Docusaurus 3](https://docusaurus.io/) uses Node.js, so if you are running Actual on your local machine, you should be able to easily run [Docusaurus 3](https://docusaurus.io/).

## Welcome

Firstly, thank you for stopping by and giving up some of your time to either check out the documentation we have already produced or pick off
some of the [issues](https://github.com/actualbudget/actual/issues?q=is%3Aissue%20state%3Aopen%20label%3Adocumentation) and help create some new documentation for our future users. Check out the
[guidelines](https://actualbudget.org/docs/contributing/writing-docs) for more information on how the documentation is structured and tips for consistent formatting.

### Installation Methods

Actual Budget can be installed on many different platforms. However, at this time, the official Actual Budget documentation only supports the following methods:

- Local Installation (on your own machine)
  - Actual-server
  - Desktop apps
- Fly.io
- PikaPods
- Docker

If you would like to write documentation for another installation variant, please feel free to continue to do this and host it on your own personal blog, Medium, Tumblr, or any other short-form publication service. We will be more than happy to add a link to that from our documentation. Open a [PR](https://github.com/actualbudget/actual/pulls) and add it to the list in the [installation overview](https://actualbudget.org/docs/install/#additional-installation-options).

However, in doing so, you would become responsible for these instructions. If they become out of date or people want in-depth help with them, we will point them to you for assistance if the community is unable to help. If lots of people report issues with them, we may have to remove the link altogether.

## Contributing 

Please review the contributing documentation on our website: https://actualbudget.org/docs/contributing/

### Issues

If you know of a part of Actual that isn't documented and you would like to know more about that part of the software, open an [Issue](https://github.com/actualbudget/actual/issues/new?template=documentation.yml) and one of the documentation team will get to it. Or have a go at writing it yourself; we could really use all the help we can get.

### Pull Requests

When submitting a pull request, please make sure that your contributions are complete. I am checking this repo regularly, so if I see an open PR, the likelihood of me pulling it and merging it is high.

Documentation submitted will be proofread and amended before merging. Please don't take this personally if any of your documentation gets amended; we just want to make sure all documents are ready to go before merging them into master.

### Installing the Docs

Firstly, pull this repo into a local area on your machine, navigate to that directory, and run the following command:

```
$ yarn
```

### Local Development

To start [Docusaurus 3](https://docusaurus.io/) navigate to the folder where the repo resides from a command prompt and issue the following command.

```
$ yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```
$ yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Deployment

Using SSH:

```
$ USE_SSH=true yarn deploy
```

Not using SSH:

```
$ GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.

### Writing Good Release Notes

For general guidelines, see [Contributing](https://actualbudget.org/docs/contributing/#writing-good-release-notes) section of the documentation. The Documentation site is not versioned in the same manner as the rest of the project. The Documentation website is more of a living document. Merges into `master` will have the title and PR# as commit message, with the PR description as extended git commit description.
