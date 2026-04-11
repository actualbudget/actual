# Rules

Rules determine how a transaction is processed. When importing or syncing transactions, they are run through a list of rules that can apply actions to the transaction. For example, a rule could process a transaction with the payee `AMAZON.COM*5C7QC7MH0 AM 10/26 PURCHASE AMZN.COM/BILL`, and because it contains the word "amazon", it could set the payee to "Amazon" and the category to "my fun stuff". Rules allow you to automate any workflow you want.

Cleaning up payees is a common use case of rules since they are ugly much of the time. But rules can do anything: they can set the "notes" field, create a transfer, and more. If you want to be super detailed, you can create all kinds of rules to automate your process away.

Here's the best part: you might never need to touch rules. Actual will **automatically create rules for you** based on your behavior. As you rename payees or categorize transactions, it will use rules as a mechanism for writing down what you've done so it will automatically happen later. For example, if you categorize the payee "Kroger" as "Food" a couple times, it will create a rule to automatically apply that category on import. As you use Actual more, your data will automatically get cleaned up for you based on your previous behavior.

Eventually, you can just import transactions and quickly see your spending without having to do a lot of repetitive work to get up-to-date.

The second best part is because you ultimately own the rules, you are free to go in and change the rules that Actual made for you. We'll show you how this works in more detail below.

## How the Rules Work

You can view all the rules by going to **More** and then **Rules** in the Sidebar.

When a transaction is imported, it runs against all of the rules **in the order that you see them**. If all of the conditions of a rule matches (the left side), then all of the actions are run (the right side). The transaction is changed, and then it continues running the rest of the rules. Each rule is always only run once. At the end, the transaction will be updated with changes from all matching rules.

If there is a conflict, for example if two rules set the category, the rule that runs last will always win out.

Rules are **automatically ranked** from least to most specific. If the conditions of one rule apply broadly, while the conditions of another are more specific, the latter will always run _after_ the former so its changes always win out. This means you can make a broad rule like "if a transaction's payee _contains_ 'cat' set the category to 'pets'", and then fix a mismatched transaction with another rule that says "if the payee _is_ 'catan' set the category to 'games'". An "is" condition always ranks higher than "contains". Generally, you don't need to worry about this and it should work like you expect.

While ranking works for the most part, you might want to say "this rule _always_ should run last no matter what". Actual allows this with **stages**. Rules are actually run in 3 stages: `pre`, `default`, and `post`. By tagging a rule as `pre` or `post`, you force it to always run before or after rules in the other stages. Within a stage, rules are still automatically ranked.

### Condition Types

- `is`/`is not` matches exactly
- `contains`/`does not contain` matches a substring
- `matches` is a [regular expressions](https://regextutorial.org/)
- `one of`/`not one of` is a multi-select

### Fields

Conditions can use the following fields:

- imported payee
- payee
- account
- category
- date
- notes
- amount
- amount (inflow)
- amount (outflow)

`imported payee` is different from `payee` in that it is _always_ the original text of the payee or description field when the transaction was imported. `payee` references a payee in Actual. This matters because it allows you to rename a payee before it is created in Actual. You can have several rules that all check `imported payee` and set the payee to something without worrying about them stepping on each other. (Conditions can't reliably check `payee` if previous rules changed it)

The `inflow` and `outflow` versions of `amount` make it easier to work with amounts. If you only want to match expenses between 5 and 10 dollars, use `amount (outflow)` because that money is leaving the account. If you use `amount`, you'd have to use negative numbers and it's simply less convenient.

All strings are matched case-insensitive. An `imported payee` of "PuBlix" will match a condition that is "contains 'publix'".

Actions can set the following fields:

- category
- payee
- notes
- cleared
- account
- date
- amount

Actions can also prepend or append text to the `notes` field.

## Experimental: rule formulas

Actual also has an experimental “Excel formula mode” that lets some **Set** actions compute their value from a formula (toggle with the **ƒ** button in the rule editor). See [Excel Formula Mode](/docs/experimental/formulas).

## Automatic Rules

Right now, there are two types of rules that Actual will automatically create or update for you: renaming payees and categorizing transactions.

When you change the payee of a transaction and the previous one is no longer used anywhere, Actual will ask you if you want to automatically apply that rename in the future. This creates a nice flow for cleaning up transactions: you can import transactions with ugly payees like `AMAZON.COM*5C7QC7MH0 AM 10/26 PURCHASE AMZN.COM/BILL`, and then change the payee in the transactions list. Actual will ask you if you want to do that in the future, and if you click yes, that payee will automatically be cleaned up in the future.

You can also select the "edit" option to the right of the rule. Actual will take you to the rule that it created for the rename, and you can change it however you like. For the above payee, you probably want to change the condition to "contains 'amazon'" so all amazon payees are cleaned up.

Payee renaming rules that Actual creates are always in the `pre` stage, so they always run first.

Actual also creates/updates rules for categorizing transactions. When you categorize a transaction, it will determine the best category for a transaction (basically the most common one) and create a rule that sets the category for the payee. If a rule already exists for the payee, it updates the category to set.

Over time, most categories should automatically get set for you which reduces a lot of tedious work.

Categorizing rules are always created in the default stage. Since payee renaming rules are `pre`, they always run before categorizing no matter what. In this case, we don't want them automatically ranked because we always want the payee to be set before running the category rules.

Of course, you are free to edit the rules as you like. Change the category set for a payee, or tweak the renaming rules. Actual is there to help, but ultimately you are in control.

If Actual is doing something that you simply don't like, create a `post` rule to force it to run after everything else. You could even turn off auto-categorizing altogether by create a `post` rule that matches a `date` of today or later (so all transactions would match) and sets the category to `null`.

## Managing Rules

### Creating a Rule

To create a rule, go to More > Rules… to view all the rules and click "Create new rule" in the bottom-right. You will now be editing a new rule.

### Editing a Rule

When viewing a list of rules, click the "edit" button on the right to edit a rule. The "edit rule" screen lists all the conditions and actions in an editable format. You can add/remove actions and conditions, change operators or values, and more.

This screen also lists all the transactions that currently match the conditions. This gives you great feedback to see if your conditions are working the way you expect.

You can even manually apply all the actions to the transactions. You need to select the transactions from the list that you want to change (clicking in the header will select all of them) and click "Apply actions". This helps if you want the rule to apply to some existing transactions as well.

### Deleting a Rule

To delete a rule (or rules), select the ones you want to delete. Then go down to the bottom right of the window and click the "Delete # rules" button.

### Viewing Rules for a Payee

To view the list of rules that apply to a specific payee, go to More > Payees… to view the list of payees. This table shows you which payees have rules associated with them, and you can click "# associated rules" to view the rules just for that payee.

### Disabling Payee(s) Automatic Rule Creation

To disable automatic rule creation for a payee, go to More > Payees… right-click on the payee you would like to disable automatic rule creation for and click "Disable learning". You will see a red icon indicating learning is disabled for the payee.

To disable automatic rule creation for multiple payees, go to More > Payees… and select the payees by placing a checkmark on the left of each payee. At the top of the screen click the "N payee" button indicating the total payees selected and click "Category learning".

### Disabling All Automatic Rule Creation

To disable automatic rule creation for all payees, disable category learning by going to More > Payees > "Category learning settings"… at the bottom of the screen. Disabling category learning will not delete any existing rules but will prevent new rules from being created automatically on a global level.

## Using the Rule Editor for Sophisticated Batch Editing

This deserves its own section because this turned out to be a surprising use case. Because the rule editor shows you a list of transactions that match the conditions, and allows you to manually apply actions to some or all of them, it turns out to be a great "batch editor".

That means if you need to do a lot of work across many transactions at once, you should try the rule editor. While you can select individual transactions in the account screen and quickly change any one field, that is more targeted to changing one field across a small number of transactions. In the rule editor, you can apply any number of actions at once and get a clear view of what transactions are changing.

To do this go to More > Rules… and click "Create new rule". You won't be actually creating a new rule, but you'll have the rule editor at your disposal for quick bulk editing.
