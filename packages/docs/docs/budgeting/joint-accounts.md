# Strategies For Handling Joint Accounts

## Introduction

Nothing derails a relationship faster than (not) talking about money and how it's spent.

When budgeting with a partner in Actual Budget, you have several strategies to consider, each tailored to how you
manage finances together.

One approach is maintaining a common budget where both partners share a single budget file.
This method promotes transparency and ensures both parties agree regarding financial goals, expenses, and income.
A shared budget fosters collaboration but requires consistent communication to keep everything current. It will help
you both set clear boundaries for individual and shared expenses while working together toward common financial objectives.
See [Multi-user](/docs/getting-started/sync#multi-user-support) regarding simultaneous edits.

Alternatively, you can track your partner's contributions within your personal Actual Budget file. This allows you to
maintain individual control over your finances while still acknowledging and accounting for your partner's financial
inputs. This method benefits couples who prefer to manage their finances independently but want to monitor how their
spending aligns with joint expenses and goals.

Choosing the right approach depends on your communication style, financial goals, and the level of financial
independence or collaboration you prefer in your relationship.

## Tracking A Shared Account With A Shared Actual Budget

If you and your partner are in a serious relationship and have begun reimbursing each other, you should consider the next step: creating a joint account for joint expenses.

If both agree, the natural next step is to have a joint budget. Your partner may not be
ready for this, so be patient even if you previously have waxed lyrical about the good of budgeting, and envelope
budgeting in particular. Not everyone is prepared for this kind of visibility and accountability into their (joint) finances.

Also, stop using cash for common expenses, as this makes tracking so much more complicated.

When your partner is ready to embrace your true joint expenses, use our [Starting Fresh guide](/docs/getting-started/starting-fresh) to get
started. If your partner is new to budgeting, consider skipping the part about using historical data to find
your initial budget numbers. Another tip is to set aside time each week by going through last week's spending; avoid doing
this late in the evening when your energies are low.

Another tip is to let your partner be the primary account holder for your joint spending and billing account. Make sure the partner feels safe about this approach.

### Basic setup steps

1. Talk to your bank and have a joint account set up.
2. Get two debit cards attached to the joint account, one for you and one for your partner.
3. Create a joint Actual Budget file on a server that is also reachable by your partner.
4. Decide how big each partner's contribution to the joint account should be (see below).
5. Follow the [Starting Fresh guide](/docs/getting-started/starting-fresh) with your partner.

### Deciding on how big each partner's contribution should be

For many couples, this could be a very tough and emotional discussion. It might be a litmus test if your relationship
will survive in the long run. If you cannot have a calm, two-way discussion about managing your joint finances,
both must look hard at your approach to your relationship.

There are a few ways to decide how much each partner should contribute.

#### Pool all income into the joint account

A common way is to pool all income into the joint account and then withdraw personal spending from this account.
As most partners have different spending habits, depending on their personal needs and wants, pooling all income may
cause friction. The partners may refrain from spending joint money on personal projects or other needs.

Even if given amounts are transferred back to each partner for _their spending_, it might still cause friction
because of different spending habits.

#### Pool necessary income into the joint account

Envelope budgeting is about embracing true expenses, goal-oriented planning and flexibility. Over time, it will be clear
what are your common expenses regarding groceries, utility bills, dining out, gifts, savings, etc.

Both will then contribute their share of the joint expenses. This is called _planned income_.

But how do you find your just share? The most just way to do this is by percentage of normal income per partner.
If Bob makes $ 4,000 a month and Alice makes $ 6,000, the total income is $ 10,000. Out of
this, Bob will contribute 40% to the joint expenses. To compute the percentage for Bob: 400 (Bob's income) \* 100 / 10000
(total income). Alice's percentage is 60%, found by subtracting Bob's percentage from 100.

### Tracking personal spending in the budget

One of the partners might use the debit card connected to the joint account for
personal spending by mistake. Have one budget category named _Partner Personal Spending_. For tracking purposes, this needs to be
a rollover category.

When the partner reimburses their spending, add the amount to this category.

:::info
If the reimbursements happen immediately, there is no need to enter these two transactions on the account register at all
as they will zero each other out.
:::

### Adding funds to the joint account

To keep track of your and your partner's contributions to your join account, create one income category named
_Partners Contributions_. This category is _only used_ to track _planned income_ from each partner. You also want
two categories called _Partner Reimbursements_ and _Common Income_.

- When both partners pay their share, this is added to the _Partners Contributions_. This way makes it easy to track
  that everyone has contributed their part. When starting with joint budgeting, you will have partial insights into your spending habits, and extra funds need to be added to the joint account, so
  good visibility is a must.
- When reimbursements for personal spending occur, use the _Partner Reimbursements_ income category and immediately
  use this amount against the _Partner Personal Spending_ category.
- _Common Income_ is all other income that is _not planned_. This could be gifts, or if you sell stuff that you own
  together, etc.

## Tracking A Shared Account With Your Personal Actual Budget

Situation: I am using Actual to keep track of my budget and finances, but I share a joint account with my partner.

### Basic setup steps

1. Create an **on budget** account used to pay joint bills.
2. Create a **category group** used to group your shared expense categories.
3. Create the **categories** you plan to budget using your joint account.
4. **Optional:** Create an **Income Category** called **Partner Contribution** or something similar. This will be explained further below.

### Adding funds to the joint account

#### Your contribution

Each month you will add a transfer of your share to the joint account from one of your on budget accounts. You don't need a category for your contribution since it is just a transfer from one of your accounts to another.

![Screenshot of joint accounts in a personal Actual Budget file](/img/joint-accounts/jointaccount-2.webp)

#### Partner contribution

##### Option 1

When your partner makes a contribution to the joint account, use the **Income Category** you created as the category. By having a separate category for this contribution, it will be easier to filter out when doing reports later since this isn't true income, though it is income to the budget.

![Screenshot of joint accounts in a personal Actual Budget file - option 1](/img/joint-accounts/jointaccount-3.webp)

##### Option 2

If option 1 doesn't seem right to you, the same result could be achieved by treating the new income like a return to a store. In this case, you can assign your partners deposit directly to the shared categories. The deposit should be made into the **Joint Account** ledger. As you can see, you can fund each shared category using the **split transaction** option.

![Screenshot of joint accounts in a personal Actual Budget file - option 2](/img/joint-accounts/jointaccount-5.webp)

### Budgeting

#### Option 1

If you are entering the data for the joint account according to option 1, budget the whole amount for the bill. The total budgeted of the shared expenses category group should equal the total amount available in the joint account. The joint account and category group are loosely connected in this scenario. There is no safeguard to prevent over budgeting for that account so you will need to monitor the balance of the account and the balance of the category group to be sure they are the same.

![Screenshot of budgeting with personal Actual Account file - option 1](/img/joint-accounts/jointaccount-1.webp)

#### Option 2

If you've decided to fund the categories directly with the deposit, you only need to fund the budget categories for your portion of the shared expense. As you can see, each of the budget categories is still funded to the same level but in this case there is no **income** that will show in reports. The Joint account balance and budgeted amount should still be the same.

![Screenshot of budgeting with personal Actual Account file - option 2](/img/joint-accounts/jointaccount-4.webp)
