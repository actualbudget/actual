---
title: 'Frequently Asked Questions'
---

- **Q.** _Can I use the mobile apps with my self hosted version of Actual?_

  **A.** No, the mobile applications are deprecated, the community however is working on a responsive
  version of Actual Web [PR#79](https://github.com/actualbudget/actual/pull/79)

- **Q.** _Can I sync my bank to Actual automatically?_

  **A.** At the moment no, but this is currently under development.
  See [PR#53](https://github.com/actualbudget/actual-server/pull/53)

- **Q.** _Can I import my Actual Budget from the hosted instance of Actual to my Self Hosted version_

  **A.** Yes, this has been added to the web version recently, we made a [guide for exporting](/Installing/fly/Fly-git#exporting-data-from-actual)
  and then [one for importing](/Installing/fly/Fly-git#importing-data-into-actual)

- **Q.** _How do I update my version of Actual after it has been updated?_

  **A.** That depends how you’re hosting it.

  - PikaPods seems to refresh their image automatically.
  - Actual builds and publishes an updated docker image on each merge.
  - If you're on Fly.io we have a [guide for that too](/Installing/fly/Fly-git#updating-actual).

- **Q.** _How do I make sure my data on Fly.io isn't deleted when I update?_

  **A.** We have a guide for you [here](/Installing/fly/Fly-git#persisting-the-data-in-fly)

- **Q.** _I have deployed actual to Fly.io but I am being charged, why is this?_

  **A.** While we wouldn’t know for certain without seeing your configuration, it is likely that during
  deployment you created a Postgres database. Actual doesn’t need this so you can just delete it and
  charges should then stop.

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
