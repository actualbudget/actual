# Frequently Asked Questions

- **Q.** _Can I use the mobile apps with my self hosted version of Actual?_

  **A.** Unfortunately, the mobile applications are deprecated. However, you can still access Actual through its web version, which functions as a native application with a responsive layout.

- **Q.** _Can I sync my bank to Actual automatically?_

  **A.** Yes, certain banks are now supported, you can find the documentation [here](./advanced/bank-sync.md). If you are setting up Actual for the first time,
  it is much easier to not pull in historical data. First, set up your account(s) with a correct opening balance on a recent date, then set up bank sync. Only
  transactions after the opening balance date will be synced, making reconciliation easy.


- **Q.** _Can I import my Actual Budget from the hosted instance of Actual to my Self Hosted version_.

  **A.** The hosted subscription service was shut down in 2024, but if you are still using the old Actual Budget Desktop App, we have a [migration guide in place for this](/docs/migration/#migration-from-the-old-actual-budget-desktop-app).

- **Q.** _How do I update my version of Actual after it has been updated?_

  **A.** That depends how you’re hosting it.

  - PikaPods seems to refresh their image automatically around a week after the release goes out.
  - Actual builds and publishes an updated docker image with each release.
  - If you’re on Fly.io we have a [guide for that too](./install/fly.md#updating-actual).

- **Q.** _I'm new to budgeting and learned with nYNAB. I'm not completely clear on how to handle credit
  cards. I largely charge almost everything to them for rewards and pay off in full. How do I track
  what's available/budgeted for per payment?_

  **A.** So here's a way to think about it that may be helpful: When you "give every dollar a job," we
  need to define what dollars we're talking about.

  In nYNAB's view, the dollars you're giving jobs to are the dollars you have in your cash accounts;
  some of them have the job of paying off your credit card. So when you go to make a credit card
  payment, you draw from that category; when you make a purchase on the card, you need to move an
  equivalent amount into the payment category.

  In Actual's view, credit cards are equal to your bank accounts, but they contain negative dollars.
  What you budget is the _net_ number of dollars you have -- cash minus debt. When you spend on the
  credit card, you're spending money by adding negative dollars into the mix, and the money leaves
  your categories.

  When you pay on the card, you're letting positive dollars and negative dollars touch each other --
  they go _poof_ but don't change your budget because the number of _total_ dollars hasn't changed.

  Where Actual gets more complicated is if you're carrying a balance you can't afford to pay off yet.
  In that case, you need to keep some negative dollars from touching positive dollars by sticking them
  in a category. Actual's default assumption is that you can pay off any card in full at any time and
  not touch your budget to do it. (Credit: evequefou)

- **Q.** _Does Actual Budget have an API? What are the endpoints?_

  **A.** Actual does not have a REST API with endpoints that you can just call. However, we do have an API NPM package that allows programmatic access to the budget. It runs the UI in _headless_ mode and allows performing many of the same operations that you can perform by clicking around the UI.

  The reason why Actual doesn't have REST-full endpoints is - Actual is a local-first product with the primary database hosted on your local device rather than in a remote server. There is an optional sync server that can be set-up (i.e. `actual-server`), but it does not have the full database (but rather an archival backup of some point-in-time as well as _messages_ with the updates applied to the backup).

  Read more about the API package in the [API documentation pages](./api/index.md).
