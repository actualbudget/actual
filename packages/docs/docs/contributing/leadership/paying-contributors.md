# Paying Reviewers for Administrative Work

As our donation income has become steady, we have implemented a lightweight system to compensate **core contributors** who perform administrative tasks — **specifically reviewing pull requests, triaging, and managing issues**. This work is essential to maintain project momentum and ensure its health.

A list of the core contributors can be found in [this page](https://github.com/orgs/actualbudget/people).

## How the Payment System Works

We allocate a monthly review stipend pool ($1000/month) distributed among reviewers based on the **size of PRs they review** — using **lines of code changed (LOC)** as a proxy for effort. In addition to PR reviews, we recognize contributions around **issue triage** and **resolution**, which are essential to keeping the project healthy and user-friendly.

Points are automatically calculated for all **public members of the Actual Budget organization** through our [GitHub workflow](https://github.com/actualbudget/actual/blob/master/.github/scripts/count-points.mjs). Refer to the workflow documentation for the current point values assigned to different contributor actions.

**Example Calculation:**

Jack earned 10 points. Nancy earned 15 points.

Total points earned: 25

Value of each point: $1000 / 25 = $40

Jack (Dublin) receives: 10 \* $40 = $400

Nancy (Amsterdam) receives: 15 \* $40 = $600

## Questions and Answers

#### Can earnings be accumulated over a more extended period?

Yes, but not indefinitely. Twice a year (1st Jan and 1st of July), any earnings not withdrawn are reset to zero. This reduces the bookkeeping required for tracking reserved payouts versus the available budget.

#### Can I forfeit the earnings?

Yes. If no payment request is made, earnings are automatically forfeited.

#### How can I receive the payout?

You can receive your payout via OpenCollective by submitting an invoice.

#### Can anyone earn points and receive a payment?

No, this system is only open to core maintainers. We may extend the system in the future, but currently, only core maintainers are eligible for this privilege.

#### What about taxes?

You are responsible for handling your taxes. Tax obligations depend on your local laws.

#### Will this system use up the entire budget?

No. We currently receive between USD 1,500 and USD 2,000 each month. The allocation for this system is USD 1,000 per month, resulting in a net positive of $500–1,000 per month. You can see the details on our [open collective page](https://opencollective.com/actual).

#### What if a month is slow? Do we still pay out USD 1,000?

No. If fewer than 20 points are earned in total by the core maintainers in a month, the total payout drops to USD 500.

#### What if a month is hectic? Does the payout increase?

To keep the system simple, the payout does not automatically increase. We reserve the right to adjust the payout in the future based on participation data.

#### Can I receive the payout as a gift card or crypto?

No. All payments are made transparently and openly. We do not use alternative payment methods for any reasons.

#### Do we pay for features, bug bounties, or other contributions?

Currently, we do not pay for features, bug bounties, or other contributions. The focus is on compensating the administrative work required to keep the project running smoothly. We may expand the system in the future.

#### Could someone "farm" points by doing rubber-stamp PRs?

Theoretically, yes. However, we trust the core maintainer team to continue working diligently. Most core maintainers have admin rights and could do significant damage to the repository, but we trust everyone to act responsibly.
