---
title: Contributing to Actual Budget
---

So, you want to get stuck in and help out with existing issues in Actual Budget or develop a feature of your own. That’s great and we really appreciate it!
We have created this document to signpost you to some of the key areas that will be of interest when developing for Actual Budget.

As always, if you need any help or want something clarified, jump into the Discord and we will try our best to help you out.

### Expectations

For smaller improvements or features - feel free to submit a PR or an issue if you don't have the necessary skills to build it yourself. For larger features we would recommend first opening an issue to discuss it with the team.

We aren't going to take every single little change. Don't be offended if we close your PR. In order for the project to stay healthy, we need to guard our bandwidth and also only take changes that align with Actual.

Here are some initial guidelines for how contributions will be treated:

- The mental health of the maintainers will be prioritized above all else. If this means some things get lost and PRs are unreviewed because maintainers are spending time with family or on themselves, we celebrate that.

- Multiple maintainers are key to this being a healthy project. Currently a few people have maintainer rights (see list below). We are actively looking for more people to come on as maintainers. If nobody steps up, expect less activity on this project.

- An open PR does not automatically deserve time for a full review and acceptance. It's up to the PR author to convince the maintainers that the change is good and worth reviewing. This involves a clear description for why the change is being made, detailing the tradeoffs.

- We especially welcome improvements in automation: creating GitHub actions to automatically generate builds, making the release process easier, etc.

### Main Contributors

(sorted alphabetically)

- @carkom
- @jfdoming
- @joel-jeremy
- @MatissJanis
- @matt-fidd
- @MikesGlitch
- @teprifer
- @twk3
- @youngcw

### Alumni

(sorted alphabetically)

- @albertogasparin
- @j-f1
- @jlongster
- @Kidglove57
- @rich-howell
- @shall0pass
- @trevdor
- @shaankhosla

### The Project Layout

The layout of the codebase in Actual Budget takes a bit of getting used to and finding things at first can be a little tricky. We have put together a help [document](./project-details/index.md) that shows the structure of the project. While this isn't 100% complete it will give you a good starting point for your development.

### Working on Existing Issues

Existing issues are a good place to start, especially if you want to contribute to Actual Budget but don't know where to start, some of the things to be aware of are:

1. All issues are open to be worked on by anyone.
2. Working on the highest rated [feature requests](https://github.com/actualbudget/actual/issues?q=label%3A%22needs+votes%22+sort%3Areactions-%2B1-desc+) would also be appreciated.
3. We do not assign issues to specific people.

### Submitting an Idea for Something you Want to Work On

Okay, so you have an idea for something that you think would be great in Actual Budget, but how do you pitch it to the community so that all your hard work is not wasted?

If the feature is relatively small, feel free to start the discussion by opening a PR. However, if you want to work on a larger change/feature, please open an issue or comment on an existing issue for the feature first. This lets the maintainers make sure your approach fits well both with the technical and ideological architecture of the project.

### Submitting a Pull Request

If you have started implementing a new feature or bugfix please open a PR so others know that you are working on that task. This helps to not have duplicate work.

When you open a PR please remember to do the following:

- If applicable, please link the issue or feature request ticket. The easiest way to do this is by adding the text `Fixes #<ticket_number>` in the PR description.
- Add a release note. These notes get used when generating the full release note at the next release.
- Once your PR is ready for maintainers to review, remove the `[WIP]` label from the PR title.
- Sometimes it can take some time for the maintainers to review your PR for approval. Please keep your PR up to date with the current master branch by merging or rebasing until your PR gets merged.

### Writing Good Release Notes

Create a Markdown file in the upcoming-release-notes directory of the repository you’re contributing to named after the PR number. The file should contain front matter with a category key (defining which header to put the entry under) and an authors key (defining the author of the entry). The body of the file should contain the changelog entry. Keep it short and clear — ideally one sentence, and also non-technical (unless the category is “Maintenance”). Copy-paste the template below to get started!

```markdown
---
category: Features
authors: [YourGitHubUsername]
---

Add option to include exchange rate multiplier during import
```

Valid categories:

- `Features`: New features
- `Enhancements`: Improvements to existing features
- `Bugfix`: Bug fixes
- `Maintenance`: Internal changes that don’t directly affect users

The `authors` key should be an array with the GitHub usernames of the people who contributed to the PR. In most cases, this should just be you but you can add multiple people if needed.

Try to phrase your message as a command, e.g. "Add option to include exchange rate multiplier during import" rather than "Added option to include exchange rate multiplier during import” or "Adds option to include exchange rate multiplier during import." Generally your message should match the PR title, but you can change it if you think it’s more clear.

### The Design Strategy Of Actual

The goal of the UI is to be minimalistic, but expose more advanced features progressively as the user interacts with the product (for example: the notes button is not visible by default if an account has no notes, but it becomes persistent visible if there are notes). We advocate for a similar approach in other places too. We are against adding a button/user setting for every little piece of UI (sizes, paddings, margins, etc.) as that goes against this simple design philosophy.

The settings screen needs to also remain a place where core settings lives, we don't really want to have a myriad of options in here for each and every setting within the UI, doing that makes the code un-manageable for future contributors and clutters up and confuses things for the users of Actual Budget.
