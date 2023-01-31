---
title: 'Supercharge your Budget'
---

[discord]: https://discord.gg/8JfAXSgfRf

This page has examples of custom rules that some of our users have found useful for their own budgets.  If you have any custom rules you're proud of, let the [Discord][discord] group know or submit an issue or PR to the Actual Documentation GitHub repository.

**Q:  How do I set a default account when I add transactions?**

**A:**  Set a **Pre** rule to check for an empty account field. When entering a transaction in the "All Accounts" ledger or from the ledger of a Category listing, your preferred default account will be auto filled.

![](/img/custom-rules-1.png)

**Q:  I have accounts (like cash or Venmo) that instantly “clear” at the moment of purchase. How can I automate toggling the "cleared" status?**

**A:**  Set a **Post** rule to check for your account or accounts where instant transactions can be made, set the action to "cleared", and select the checkbox.  Cash or Venmo are typical examples of this type of account.  Any time a transaction is added to the accounts listed in this rule, those transactions will automatically get a cleared state from now on.

![](/img/custom-rules-2.png)