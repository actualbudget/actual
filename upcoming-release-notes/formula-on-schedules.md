---
category: Enhancements
authors: [sreetamdas]
---

Add formula support to schedule amounts (`Amount is formula`), so scheduled transactions can vary by occurrence date and `BALANCE_OF` other accounts — e.g. `=INTEGER_TO_AMOUNT(BALANCE_OF("Credit Card"))` for statement-balance payments or `=-ABS(INTEGER_TO_AMOUNT(BALANCE_OF("Home Loan")))*0.0715/12` for declining loan interest. Each occurrence is evaluated with its own date and a fresh balance as of that date (cents, like rule formulas — use `INTEGER_TO_AMOUNT` or `/100`). Preview shows `BALANCE_OF` as `0` until posting; failed formulas skip posting. Distinct from [#8591](https://github.com/actualbudget/actual/pull/8591) which added `BALANCE_OF` to **Formula reports** (current balance, dollars).
