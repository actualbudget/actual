---
title: 'Starting Fresh'
---

For most users it's best to start fresh with a blank file.
This guide will walk through setting up a budget file fresh without migrating from a previous budget software export.
Before continuing, it might be a good idea to read about the [envelope method](/docs/getting-started/envelope-budgeting), or zero-sum
budgeting as it's also called.

If you want to restart an existing budget while keeping your categories, payees, rules, and schedules, you can follow the guide on [Restarting Your Budget](/docs/advanced/restart).

## 1. Setting up Accounts

It is recommended to add all accounts you have to Actual.
This includes all savings, checking, and investment accounts.
These accounts should match what shows up in your Bank or Credit Union.
For example, if you have a savings, checking, and credit card account with Bank of America, add each as a separate account in Actual.

### On Budget or Off Budget

In Actual, you have the option of on budget accounts and off budget accounts.
On budget accounts are included towards the funds available in your budget, while off budget accounts are only for tracking.
Off budget accounts are included in the net worth report.
It is usually best to err towards putting accounts on budget versus off budget.
The most common off budget accounts would be investment type accounts such as a 401(k), IRA, HSA, brokerage account, loans, and asset tracking such as your home equity.

Savings accounts can be either on budget or off budget.
It is usually easier, and more flexible, to place them on budget.

#### Considerations for On Budget Savings

- No need to categorize transfers between other on budget accounts, simplifying the transfer
- You can leverage the budget categories to manage what you plan to use your savings for and save for specific goals

#### Considerations for Off Budget Savings

- Your savings is less tempting to borrow from since it is not visible in your budget
- Any time you transfer to/from your savings, you need to categorize that transaction. This sometimes causes confusion since the money wasn't spent

In some situations it may make sense to put a credit card account off budget.
This is generally not recommended unless you are not using that card for any spending and are exclusively paying it off.

### How to Setup Accounts

The process of adding an account is detailed in [the adding a new account page](../accounts/index.md#adding-a-new-account).

It is recommended to not pull in transactions from more than a month or two prior to your start date.
The reason for this is that those old transactions will need to be budgeted or your budget will be out of wack.
Usually the most effective time frame is to start at the beginning of the month you are currently in.

Start your account by finding the balance in each account at the date you want to start.
Set that amount as the balance when creating the account.
If your starting date is before the current date, edit the date on the starting balance transaction to the preferred date.

Once your account has the proper starting balance, add all the transactions between your start date and today.
You can enter transactions [manually](../transactions/importing.md#manually-add-transactions), via [file import](../transactions/importing.md#import-financial-files), or via bank syncing to pull in transactions.
For bank syncing, Actual has built-in support for [GoCardless](../advanced/bank-sync.md) which works for most EU/UK banks, and SimpleFIN for US/Canadian banks. Note: GoCardless has stopped accepting accounts for this service.
For other bank syncing options see the [community projects page](../community-repos.md).

An optional step after you have created your accounts and added your transactions is to reconcile the account.
Reconciling your accounts is something you should get in the habit of doing regularly.
This confirms that your accounts are accurate compared to what your bank says happened in your account.
If you manually add transactions this is especially important.
The process of reconciling your account can be found on [the reconciliation page](../accounts/reconciliation.md)

## 2. Handling cash

Suppose you do not exclusively use debit and credit cards but also need to keep some cash around. In that case,
you manage this by creating an account called Cash, which you treat as any other bank account.

## 3. Setting up your Budget Categories

Now that your accounts are set up and your current balance is accurate, you can start adding budget categories.
While making these categories, remember that all money entering or leaving your budget needs a category.

By default, Actual will start you off with a few basic expense categories.
If you aren't sure what categories you need, Actual will start you with a few basic ones.

- **Food**: all grocery and restaurant spending
- **Bills**: all bills that charge the same amount each month
- **Bills (Flexible)**: All bills that vary month to month
- **Savings**: Funds you have saved, or are going to transfer to an off budget savings account
- **General**: Everything else

Some other common categories you could add would be rent/mortgage, taxes, eating out, specific utilities,
subscription services, charitable donations, child care, gifts, fun money, or debt payment.

:::tip

Refrain from spending too much time deciding which categories you want from the start, your situation is
different from other people. Add the categories that make sense for you as your budget evolves.

:::

When creating your categories don't just think of your bills, think of your goals too.
The categories aren't just a name of an expense, it is a bucket that will hold your money.
That bucket can be assigned to both normal expenses, like bills and groceries, and to savings goals like a down payment on a house or a vacation to Bali.
If you have an investment account that you contribute to, make a category for that.

You also have the ability to make multiple income categories.
Maybe you have multiple income streams, make a category for each one.
You may also want a category for interest and dividends.

### Group your expense categories

Actual has a nifty and useful feature where you can organize your expense categories into groups.
This not only provides more visibility and control over your spending but also empowers you
to make informed financial decisions.
When using the [envelope method](/docs/getting-started/envelope-budgeting), one will move available funds between categories when
needed. However, there are some categories that you should be very wary about moving funds away
from. By grouping, you'll get an extra visual indication that moving funds from the Electricity 
category, for instance, may not be the wisest choice. Another reason is to have a more convenient
way of reporting your spending habits.

1. **Crucial or really important**. As the name suggests, these expenses are
   difficult or impossible to reduce or remove from your daily life. Most of these are reoccurring
   bills, either monthly, quarterly or yearly. Many of the categories in this group have fixed amounts,
   or the amount does not fluctuate too much over the course of a year. Example of spending categories
   in this group are Rent, Mortgage, Insurance, Internet, Electricity, Property tax, etc. You can not
   stop paying your rent, mortgage or property taxes - because you'll be out of a place to live.
   Stopping paying insurance is dumb. It is near impossible to live without electricity, or Internet.

2. **Debt**. Create a separate category group if you have more than one kind of debt. Typical
   categories in this group are Mortgage, Car Payments, Student Loans, Short Term Credit.
   Should you put your credit card debts in this category?
   The answer is *it depends*. For some input on this, please read our article on 
   [Carrying Debt](/docs/budgeting/credit-cards/carrying-debt).

3. **Daily expenses**. Group your everyday expenses for a more organized and convenient way
   of tracking. This makes it easy to report on expenditures that fluctuate from month to month.
   Examples of spending categories in this group are Groceries, Household Items, Fuel, Eating Out, Clothing,
   Personal Care, Gifts, Entertainment, Streaming services, News (paper) subscriptions, and Charities.

4. **For a rainy day**. Certain expenses you know will happen in the future, but you don't know when.
   You should have at least one category named *Emergency Fund*. Other examples may be Car Maintenance,
   Replacing Stove, and Replacing Washing Machine.

5. **Savings goals**. This is where you keep your savings goals categorized _on budget_. What we
   mean by on budget is that if you need to reallocate money, you may settle for a cheaper Vacation or
   postpone the Car Replacement or the Bathroom Renovation for a few months. If you are saving for a
   long view, like your retirement, we suggest you create an *off budget* account for those kind of
   savings. Money allocated in off budget accounts takes more effort to reallocate as you need to
   move the actual funds from your savings account or sell your stocks or global
   index funds (a few examples of long term saving methods).

The main difference between For a Rainy Day and Savings goals is that rainy day categories are _a must_.
In contrast, savings categories are _nice to have or wants_.
Of course, your own experiences and approach to saving for a rainy day or longer-term savings may vary.

### How to Setup Categories

The process for adding and working with categories is found in [the category guide](../budgeting/categories.md#add-a-category).
When making categories remember that it is easier to merge categories later than it is to manually move transactions to a new category.

## 4. Assigning Available Funds

The big question everybody struggles with when using the envelope budgeting method for the first
time is *how much money to assign to each category*. Fear not; this part of our Starting Fresh
guide will help you with this.

The best way of bootstrapping your budget is to rely on how you have spent your money and what
income you have had in the last three months. It's even better if you can do this for the last six
or twelve months.

If you use cash for your daily spending, the available funds in those categories will be
challenging to assess. You can get some ideas on how much by looking at cash withdrawals on your
bank statements.

For bills, your bank or credit card statements are good sources to establish your budget numbers.

### Use a spreadsheet to find your initial budget numbers

You enter all your expenses in a spreadsheet, summarize them per month, and then calculate the average.
Now, you know what you need to budget per
month. Having the budgeted numbers somewhat higher than the calculated average might be a good idea.

This way, you add small buffers in each category as prices rise; the same goes for your rent and mortgage.
Adding some extra, albeit small, paddings along the way means you are better suited when this happens.
The only certainty we have in this day and age is that price increases will occur.

![](/img/getting-started/spreadsheet.webp)

We can now see the budget numbers to be used for the month of August in the Average column

### Using Actual to find your initial budget numbers

It's important to note that this method only works correctly if you use a debit or credit card for all your purchases.
As a result, your actual *start date* for your budget is in the past. We will reiterate our warning on
[how to set up accounts](#how-to-setup-accounts): going too far back might make your budget completely
out of wack. It's crucial to avoid this, as you can easily spend more time trying to find out what's
wrong with your budget and spent numbers because "nothing adds up" anymore.

:::info

If you have a lot of cash withdrawals during a month, you will be better off using the spreadsheet method.

:::

1. You start the budget by entering or importing your transactions.
2. In the Budget view, you enter the same amount in the *Budgeted* columns as found in the *Spent* columns
   for all the months you have entered or imported your data.

![](/img/getting-started/actual-intro-with-budget-numbers.webp)

You have two easy ways to populate the various budget values when this is done.
You can apply the last three months' average on all budget categories:

![](/img/getting-started/actual-intro-set-budget-to-3-months-average.webp)

You can also set specific categories to various averages:

![](/img/getting-started/actual-intro-set-budget-category-average.webp)

### What to do if you do not want to, or can't, use historical data

Budgeting, even without historical data, can help you gain control over your
finances, reduce stress, and achieve your financial goals. It just takes a
little bit of effort to get going.

You can start using Actual without actually assigning your available funds before you start
budgeting.

1. Record every transaction you make daily. If you do it weekly, the chances are that you will have
   forgotten some cash transactions. One way to avoid forgetting transactions is, of course,
   to keep all receipts.

2. Take special notice of when you use cash. Petty cash transactions are easy to overlook,
   but all those daily chocolates for "only" 0.50 and all those coffees for "only" 10 add up
   over a month. If you repeatedly make cash withdrawals and do not know what you are spending
   your money on, then no expense and budget tracking tools in the world will be able to help you.

3. At the end of each week, set the *Budgeted* column in the Budget view to the same value
   as what you see in the *Spent* column. If done correctly, the sum under *To Budget* should
   correctly tell you how much money you have left.

4. Set aside time to analyze your spending and income at the end of the month. Based on this,
   you can add values to the upcoming months' Budgeted column.

Remember, this process is challenging, and it's okay if you don't get everything right
in the first few months. The key is to keep going, keep learning, and keep adjusting.
With persistence, you will reach your budgeting goals.

## 5. Keep Budgeting

Now that you've set your accounts, categories, and budget values, it's time for the fun part of budgeting!

Actual uses a style of budgeting called Zero-Sum Budgeting, or the more common name
_envelope budgeting_.

Shortly this method goes like this:

1. Allocate all available funds (income) into your categories whenever you get income.
2. Track your spending in each category. Every time a new transaction is entered into Actual
   (either manually or by importing from your bank statements), your process should
   look something like this:
   1. Give that transaction a category.
   2. If you have enough money budgeted for that category, you're done!
   3. If you didn't have enough you need to decide what to do
      - Move money from a different category
      - Change the category of the transaction
3. Analyze spending habits.
4. Adjust and adapt your budget as time goes by.

:::info

This topic is so important on how to actually use Actual, that we have devoted a separate page on **[envelope budgeting](/docs/getting-started/envelope-budgeting)**.

:::

## The next step in your budgeting journey

A good next step is to read through the "Using Actual" section of the documentation. This section has detailed explanations on the
features of Actual and how to use them. Some of the most useful features are [Rules](/docs/budgeting/rules/index.md),
[Schedules](/docs/schedules.md), [Reconciliation](/docs/accounts/reconciliation.md),
and [Reports](/docs/reports/index.md).

If you feel a bit overwhelmed, don't worry.

Getting started with budgeting is confusing, especially if you are new to zero-sum budgeting.

It is a strict, but powerful, way to handle personal finance.

If you have questions feel free to ask on our [Discord](https://discord.gg/8JfAXSgfRf).
There are many people that have gone through the same confusion and will be happy to help you out!
