---
category: Bugfix
authors: [Wizarck]
---

Bring envelope/rollover budgets to parity with tracking budgets: hidden categories and hidden groups no longer contribute to per-group totals (`group-sum-amount-*`, `group-budget-*`, `group-leftover-*`) or top-line aggregates (`total-spent`, `total-budgeted`, `total-leftover`). Toggling visibility re-wires dependencies live (issue #2400 / closed dup #4730).
