## Expectations

For smaller improvements or features - feel free to submit a PR or an issue if you don't have the necessary skills to build it yourself. For larger features we would recommend first opening an issue to discuss it with the team.

We aren't going to take every single little change. Don't be offended if we close your PR. In order for the project to stay healthy, we need to guard our bandwidth and also only take changes that align with Actual.

Here are some initial guidelines for how contributions will be treated:

- The mental health of the maintainers will be prioritized above all else. If this means some things get lost and PRs are unreviewed because maintainers are spending time with family or on themselves, we celebrate that.

- Multiple maintainers are key to this being a healthy project. Currently a few people have maintainer rights (see list below). We are actively looking for more people to come on as maintainers. If nobody steps up, expect less activity on this project.

- An open PR does not automatically deserve time for a full review and acceptance. It's up to the PR author to convince the maintainers that the change is good and worth reviewing. This involves a clear description for why the the change is being made, detailing the tradeoffs.

- We especially welcome improvements in automation: creating github actions to automatically generate builds, making the release process easier, etc.

## Main contributors

(sorted alphabetically)

- @albertogasparin
- @j-f1
- @jlongster
- @MatissJanis
- @rich-howell
- @trevdor

## Project ideas

We welcome all contributions from the community. If you have an idea for a feature you want to build - please go ahead and submit a PR with the implementation or if it's a larger feature - open a new issue so we can discuss it.

If you do not have ideas what to build: the issue list is always a good starting point. Look for issues labeled with "[help wanted](https://github.com/actualbudget/actual/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)".

For first time contributions you can also filter the issues labeled with "[good first issue](https://github.com/actualbudget/actual/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)".


## Development Environment
If you would like to contribute you can fork this repository and create a branch specific to the project you are working on. 

There are three options for developing:
1. Yarn
    - This is the traditional way to get an environment stood up. Run `yarn` to install the dependencies followed by `yarn start:browser` to start the development server. You will then be able to access Actual at `localhost:3001`.
2. Docker Compose
    - If you prefer to work with docker containers, a `docker-compose.yml` file is included. Run `docker compose up -d` to start Actual. It will be accessible at `localhost:3001`.
3. Dev container
    - Directly integrated in some IDEs, dependencies will be installed automatically as you enter the container.
    - Use your preferred method to `npm start` the project, your IDE should expose the project on your `localhost` for you.

Both options above will dynamically update as you make changes to files. If you are making changes to the front end UI, you may have to reload the page to see any changes you make.
