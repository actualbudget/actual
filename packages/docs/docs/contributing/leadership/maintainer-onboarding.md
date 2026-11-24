# Maintainer Onboarding

This page is a checklist for bringing a new maintainer into the core team. It covers which accounts to grant access to, how the team communicates, and how funding and payouts work.

If you are the newcomer: welcome! Start with the [New Core Contributors Guide](./new-core-contributors-guide.md) to learn what is expected of you, then use this page to check that you have everything you need.

## Access

Access comes in two groups. Everyone gets GitHub and Discord on day one. Everything else is granted only when a maintainer needs it for the work they do.

### Granted to Every Maintainer

| Service | What to Grant                                                                              | Used For                                             |
| ------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| GitHub  | Membership of the [actualbudget organization](https://github.com/orgs/actualbudget/people) | Reviewing and merging pull requests, triaging issues |
| Discord | The maintainer role, which unlocks the staff channels                                      | Day-to-day team communication                        |

:::tip
Set your GitHub organization membership to **public**. Points for the monthly payout are only counted for public members of the organization.
:::

### Granted on a Need-To Basis

Ask in `#staff-lobby` if you need one of these for your work. An existing maintainer who has admin access to the service can add you.

| Service         | Used For                                                           |
| --------------- | ------------------------------------------------------------------ |
| npm (npmjs.com) | Publishing the `@actual-app` packages                              |
| Docker Hub      | Publishing the Docker images                                       |
| 1Password vault | Shared credentials and secrets                                     |
| Open Collective | Administering the project funds and approving expenses             |
| Namecheap       | Managing the project domain                                        |
| Netlify         | Hosting for the website, the demo, and pull request preview builds |
| Depot           | The runners used for continuous integration (CI)                   |

:::caution
These services can publish releases, spend money, or take the project offline. Use a strong, unique password and turn on two-factor authentication for every account that has access.
:::

## Communication on Discord

The maintainer role unlocks two staff-only channels:

- **`#staff-lobby`** is for general, day-to-day discussion: quick questions, heads-ups, and anything that can be settled in a few messages.
- **`#staff-forum`** is for longer discussions. Start a new thread for each topic so the conversation stays in one place and is easy to find later.

As a rule of thumb: if a conversation in `#staff-lobby` is turning into a long debate, or needs a decision that people should be able to look up later, move it to a thread in `#staff-forum`.

## Funding

The project is funded by donations through [Open Collective](https://opencollective.com/actual). The [Funding Policies](./funding.md) page describes what the funds can be spent on and how expenses are approved.

The most important part to know is [how we vote on new expenses](./funding.md#submitting-expenses):

1. A maintainer posts the proposed expense in the `#funding-updates` Discord channel.
2. All other active maintainers vote to approve (👍), reject (👎), or abstain (🤷). Not voting within one week counts as abstaining.
3. The expense is approved only if it receives at least one approval and no rejections. Abstentions do not count either way.

As a maintainer you are expected to take part in these votes.

## Getting Paid

Maintainers are compensated for the administrative work that keeps the project healthy. The full details are on the [Paying Reviewers for Administrative Work](./paying-contributors.md) page. In short:

- **Points are counted every month.** A script counts the points each maintainer earned during the month. Points for a pull request are counted in the month the pull request is merged, not the month you reviewed it (see the [points script](https://github.com/actualbudget/actual/blob/master/.github/scripts/count-points.mjs)).
- **The monthly pool is split by points.** The pool is divided by the total number of points earned, and each maintainer receives their share.
- **You request the payout yourself.** Submit an invoice on Open Collective for the amount you earned. Earnings that are not claimed are reset twice a year, on the 1st of January and the 1st of July.

### How Points Are Earned

- **Reviewing pull requests.** Only approving reviews on pull requests that get merged count. Larger pull requests earn more points than small ones.
- **Triaging issues.** Removing the `needs triage` label from an issue earns a point. So does closing an issue as "not planned" or as a duplicate. Closing an issue as completed does not earn points.
- **Getting your own pull requests merged.** Points depend on the type of change (for example, a bug fix or a feature).
- **Merging the release pull request.** The release pull request is handled separately: the points go to whoever merges it, and reviewing it does not earn review points.

The exact point values live in the [points script](https://github.com/actualbudget/actual/blob/master/.github/scripts/count-points.mjs).

## Other Perks

Maintainers can have a Cursor subscription and a Claude Code Pro subscription reimbursed. See the [Extras section of the New Core Contributors Guide](./new-core-contributors-guide.md#extras).

## Further Reading

- [New Core Contributors Guide](./new-core-contributors-guide.md): expectations, pull request review guidelines, and how to handle disagreements.
- [Triaging Issues](./triaging-issues.md): how we label and manage issues.
- [Releasing](../releasing.md): how a release is cut.
- [AI Usage Policy](../ai-usage-policy.md): the rules for AI-assisted contributions.

## Offboarding

When a maintainer steps down, remove their access to every service listed on this page, and rotate any shared credentials they had access to.
