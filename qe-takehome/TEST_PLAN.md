# Actual Budget — E2E Test Plan

**Author:** Shreya Kumari  
**Tool:** Playwright + pytest (Python)  
**App URL:** http://localhost:3001

---

## 1. What I am testing

Actual Budget is a personal finance app. Users budget money by category and track account transactions.

| Feature                | What the user does                                                 |
| ---------------------- | ------------------------------------------------------------------ |
| **Envelope Budgeting** | Open Budget page, assign money to categories (Food, Savings, etc.) |
| **Transactions**       | Open an account, add or cancel transactions, mark cleared          |

**Not testing:** Bank sync, Docker, API calls, Reports, Settings.

All tests run in the **browser only** (no backend API — Actual does not expose one for budget/transactions).

**Approach:** Manual exploration first, then automation. Mix of positive and negative cases, plus 2 cross-feature journeys. Code uses Page Object Model (`pages/`, `flows/`, `data/`).

---

## 2. How to run

See `README.md`.

---

## 3. What I found by clicking manually

| What I tried                            | What happened                                            |
| --------------------------------------- | -------------------------------------------------------- |
| Change Food budget → press Escape       | Value stays the same (edit not saved)                    |
| Change Food budget → click another cell | New value saves                                          |
| Budget more than available              | Red text: **Overbudgeted** (no popup)                    |
| Add New → Cancel on account             | Row removed, nothing saved                               |
| Add Kroger $25 on account               | Row saved, Food **Spent** on Budget went up              |
| New transaction tick                    | Hollow first; click → green (cleared)                    |
| Hover account name in sidebar           | Floating panel on all accounts, not only truncated names |
| Change transaction date and save        | Table re-sorts by date — rows move, payees swap position |

---

## 4. Test cases

### Budget

| ID     | +/- | Test                | Steps                                       | Expected                               | Done |
| ------ | --- | ------------------- | ------------------------------------------- | -------------------------------------- | ---- |
| BUD-01 | +   | Budget loads        | Don't use server → View demo                | Budget table + Available funds visible | Yes  |
| BUD-02 | +   | Assign to Food      | Create test file → Food budget → 50 → Enter | Shows 50.00                            | Yes  |
| BUD-03 | -   | Overbudget warning  | Budget more than available                  | Red Overbudgeted text                  | Yes  |
| BUD-04 | +   | Transfer categories | Transfer balance to another category        | Balances update                        | Yes  |

### Transactions

| ID     | +/- | Test               | Steps                            | Expected             | Done |
| ------ | --- | ------------------ | -------------------------------- | -------------------- | ---- |
| TXN-01 | +   | Account opens      | Click Ally Savings               | Name + table visible | Yes  |
| TXN-02 | +   | Add transaction    | Add New → Kroger, 25, Food → Add | Row saved            | Yes  |
| TXN-03 | -   | Cancel transaction | Add New → Cancel                 | Row gone             | Yes  |
| TXN-04 | +   | Cleared tick       | Add txn → click hollow tick      | Tick turns green     | Yes  |

### Journeys (full flows)

| ID   | Test                       | Steps                                    | Expected           | Done |
| ---- | -------------------------- | ---------------------------------------- | ------------------ | ---- |
| J-01 | Setup and budget           | Create test file → budget Food + Savings | Both amounts saved | Yes  |
| J-02 | Transaction updates budget | Add Food txn → check Budget Food Spent   | Spent increases    | Yes  |

---

## 5. Project layout

```
qe-takehome/
├── data/constants.py      # test data (names, amounts)
├── pages/                 # page actions (click, fill)
├── flows/app_flows.py     # common setup steps
├── tests/                 # test cases only
├── docs/ai-sessions.md    # how AI was used
├── conftest.py
├── TEST_PLAN.md
└── README.md
```

---

## 6. Automation status

| File                       | Tests                          | Status    |
| -------------------------- | ------------------------------ | --------- |
| tests/test_budget.py       | BUD-01, BUD-02, BUD-03, BUD-04 | 4 passing |
| tests/test_transactions.py | TXN-01, TXN-02, TXN-03, TXN-04 | 4 passing |
| tests/test_journeys.py     | J-01, J-02                     | 2 passing |

**Total: 10 tests — all passing**

---

## 7. Observations and suggested improvements

Two items from manual exploration — suggestions, not defects.

| Area            | Observation                                                                   | Suggestion                                                       | Priority |
| --------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------- |
| Sidebar tooltip | Hover shows a floating panel for every account, even when the name fits fully | Show tooltip only when truncated, or label it as account details | Low      |
| Empty payee     | Date-only or $0 transaction with no payee still saves                         | Block or warn before saving rows with no payee and no amount     | Low      |
