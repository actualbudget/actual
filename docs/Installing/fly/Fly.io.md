[git-guide]: ./Fly-git
[image-guide]: ./Fly-image
[terraform-guide]: ./Fly-terraform
[ci-build]: https://github.com/actualbudget/actual-server/blob/master/.github/workflows/build.yml


# Hosting Actual with [fly.io](https://fly.io)

You should deploy your server so it's always running. [Fly.io](https://fly.io) provides an easy
option with a free plan.

See the next section for a brief comparison of fly.io deployment options. If you're stuck or find a
step unclear, [contact us](/Contact) for support.

## Deployment methods

Fly offers a variety of ways to get an application deployed on their infrastructure. We currently
have community contributed documentation for the following deplyment methods
- Deploying from a clone of the main git repository [(link)][git-guide]
- Deploying from a published container image [(link)][image-guide]
- Deploying an image with Terraform [(link)][terraform-guide]

Each of these methods come with tradeoffs.

The git approach allows users a high degree of control. With sufficient knowledge, you can target
the current release, work in progress, or a fork (a unique code history that uses Actual as its
starting point). You can make fine grained changes to any aspect of your Actual server instance.
However, some users will find that this level of control adds complexity to their deployment. As
your deployment is based on your local copy of the source code, you will be responsible for keeping
track of updates and ensuring your local copy is up to date.

The container image approach offers less granular control. Images are intended to be a specific
version of the application, identical everywhere that image is deployed. While there are some
deployment parameters you can alter, you'll only have access to configuration that the current
version of the application makes available. In return for surrendering source code level access, you
get relative simplicity. The image includes everything the application needs, and thus none of that
tooling needs to be installed on your machine. New versions of the image are built by the main
repository[¹](#deployment_1); if you opt to deploy the `:latest` tag, you can be confident you're up
to date with the latest full release.

As a (terrible) analogy, the git approach provides you a car with no restrictions. If you decide the
engine should be tuned differently, you can open the hood and go to work with your wrench. The image
approach also provides you a car, but the engine bay is sealed. If you want different cylinder
timing, you'll need a new image.

<a name="deployment_1" />¹ *You can find the image build workflow [here][ci-build]*

## Frequent Issues

- **Q.** *I have deployed actual to Fly.io but I am being charged, why is this?*

  **A.** While we wouldn’t know for certain without seeing your configuration, it is likely that during
  deployment you created a Postgres database. Actual doesn’t need this so you can just delete it and
  charges should then stop. If you're unsure, please [reach out to us](/Contact).
