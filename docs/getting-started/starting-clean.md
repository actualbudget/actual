---
title: 'Starting Fresh'
---
For most users it's best to start fresh with a blank file.
This guide will walk through setting up a budget file fresh without migrating from a previous budget software export.

## 1. Setting up Accounts
It is recommended to add all accounts you have to Actual. 
This includes all savings, checking, and investment accounts.
These accounts should match what shows up in your Bank or Credit Union.
For example, if you have a savings, checking, and credit card account with Bank of America, add each as a separate account in Actual.
### On or Off Budget
In Actual, you have the option of on budget accounts and off budget accounts.
On budget accounts are included towards the funds available in your budget, while off budget accounts are only for tracking.
Off budget accounts are included in the net worth report.
It is usually best to err towards putting accounts on budget versus off.
The most common off budget accounts would be investment type accounts such as a 401(k), IRA, HSA, brokerage account, loans, and asset tracking such as your home equity.

Savings accounts can be either on or off budget.
It is usually easier, and more flexible, to place them on budget.

#### Considerations for On Budget Savings
* No need to categorize transfers between other on budget accounts, simplifying the transfer
* You can leverage the budget categories to manage what you plan to use your savings for and save for specific goals

#### Considerations for Off Budget Savings
* Your savings is less tempting to borrow from since it is not visible in your budget
* Any time you transfer to/from your savings, you need to categorize that transaction.  This sometimes causes confusion since the money wasn't spent

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
For bank syncing, Actual has built-in support for [GoCardless](../advanced/bank-sync.md) which works for most EU/UK banks, and SimpleFIN for US/Canadian banks.
For other bank syncing options see the [community projects page](../community-repos.md).

An optional step after you have created your accounts and added your transactions is to reconcile the account.
Reconciling your accounts is something you should get in the habit of doing regularly.
This confirms that your accounts are accurate compared to what your bank says happened in your account.
If you manually add transactions this is especially important.
The process of reconciling your account can be found on [the reconciliation page](../accounts/reconciliation.md)



## 2. Setting up your Budget Categories

Now that your accounts are set up and your current balance is accurate, you can start adding budget categories.
While making these categories, remember that all money entering or leaving your budget needs a category.

By default, Actual will start you off with a few basic expense categories.
If you aren't sure what categories you need, Actual will start you with a few basic ones.
* **Food**: all grocery and restaurant spending
* **Bills**: all bills that charge that same amount each month
* **Bills (Flexible)**: All bills that vary month to month
* **Savings**: Funds you have saved, or are going to transfer to an off budget savings account
* **General**: Everything else

Some other common categories you could add would be rent/mortgage, taxes, eating out, specific utilities, subscription services, charitable donations, child care, gifts, fun money, or debt payment.

When creating your categories don't just think of your bills, think of your goals too.
The categories aren't just a name of an expense, it is a bucket that will hold your money.
That bucket can be assigned to both normal expenses, like bill and groceries, and to savings goals like a down payment on a house or a vacation to Bali.
If you have an investment account that you contribute to, make a category for that.

You also have the ability to make multiple income categories.
Maybe you have multiple income streams, make a category for each one.
You may also want a category for interest and dividends.

### How to Setup Categories

The process for adding and working with categories is found in [the category guide](../budgeting/categories.md#add-a-category).
When making categories remember that it is easier to merge categories later than it is to manually move transactions to a new category.

## 3. Assign Available Funds
Now that you have your accounts and categories set up, you're at the fun part.
You get to budget! 
Actual uses a style of budgeting called zero-sum budgeting, or envelope budgeting.
In this style you allocate all available funds into your categories.
If you were budgeting with all cash you would do this by physically putting your cash into envelopes for each category.
This can be referred to as giving all your money a "job".
One dollar (or whatever your currency is) may be used for Netflix while the next dollar may be for savings.
Giving every dollar a job forces you to be honest about where you money is going because each dollar can only have one job.

Every one has a different situation so there isn't a once size fits all way to assign your available funds.
Detailed below are a few strategies you can use.
### The Basics
A basic idea with zero-sum budgeting is that you can only budget what you have, and all you have should be budgeted.
If you budget more than you have one month, the over budgeted amount will be deducted from what you have available the next month.
So to start, decide what your most important categories are.
Those important categories might be rent, food, and utilities.
Assign what you need for those categories, then repeat the process for the next most important categories until your to budget amount for the month reaches zero.
When you get a paycheck, or other income, continue filling in where the funds are needed.

As you go along you will start to get a good view of where your money is going.
If you don't like how things are going, make changes.
If you're happy, great!
Keep budgeting to keep track of your progress on your goals.

A more detailed breakdown of how budgeting in Actual works is provided in [the budgeting page](../budgeting/index.md)

### Credit Cards
If you currently are carrying credit card debt in an on budget account you will need to capture that debt in a category.
A guide on how to handle that can be found in [the credit card guide](../budgeting/credit-cards/index.md)

### The Month Ahead Method
It can be hard to know where to budget your funds when you get paid in the middle of the month, or get multiple paychecks per month.
One way to handle this is called the "month ahead" method.
This consists of holding everything you make this month and only budgeting it next month.
The goal is to not need any of this month's income for this month's bills, but pay all of this month's bills with last month's income.
Actual makes this easy by allowing you to hold your available funds for the next month by clicking the **To Budget** amount at the top of the budgeting screen and selecting the "Hold for next month" option. You can read more about this on [the budgeting page](../budgeting/index.md#how-money-rolls-over)


## 4. Keep Budgeting
Now that you have set up your budget, you can start importing transactions and tracking your spending and saving.
Every time a new transaction is imported your process should look something like this:
1. Give that transaction a category
2. If you had enough budgeted in that category your done!
3. If you didn't have enough you need to decide what to do
    * Move money from a different category
    * Change the category of the transaction

A good next step is to read through the "Using Actual" section of the documentation.  This section has detailed explainers on the features of Actual and how to use them.  Some of the most useful features are [Rules](../budgeting/rules/index.md), [Schedules](../budgeting/schedules.md), [Reconciliation](../accounts/reconciliation.md), and [Reports](../reports-filters/reports.md).

If you feel a bit overwhelmed, don't worry.
Starting budgeting is confusing, especially if you are new to zero-sum budgeting.
It is a strict, but powerful, way to handle personal finance.
If you have questions feel free to ask on our [Discord](https://discord.gg/8JfAXSgfRf).
There are many people that have gone through the same confusion and will be happy to help you out!
