# AI Sessions — How I Used Cursor

**Author:** Shreya Kumari  
**Project:** Actual Budget QE Take-Home

---

## Summary

I used Cursor while working on this assignment. I tested the app manually first, wrote the test plan, then built the Playwright tests. When I needed help — setup questions, code drafts, or debugging — I asked Cursor. I always ran the tests and fixed anything that did not match what I saw in the app.

---

## What I worked on

- Explored Budget and Transactions in the browser
- Picked two features: envelope budgeting and account transactions
- Wrote `TEST_PLAN.md` with test cases and manual notes
- Built tests using page objects (`pages/`), shared flows (`flows/`), and test data (`data/`)
- Ran the full suite with `pytest -v` (headless and headed)

---

## How I used Cursor

| When I needed…              | What happened                                              |
| --------------------------- | ---------------------------------------------------------- |
| Help running Actual locally | Got steps for `yarn start` and browser-only E2E testing    |
| Code for a page or test     | Cursor drafted it; I ran it and fixed selectors if needed  |
| A failing test fixed        | Cursor helped find the cause; I re-ran until it passed     |
| A format for docs           | Got a starting layout; I kept only what matched my testing |

---

## Things I changed after AI suggestions

| Suggestion                  | What I kept instead                                 |
| --------------------------- | --------------------------------------------------- |
| One big test file           | Split into `pages/`, `flows/`, and `tests/` folders |
| `expect()` for numbers      | Plain `assert` for money values                     |
| Transfer from Food with $50 | Budget Savings first — Food had no positive balance |
| Long documents              | Short, plain English                                |

---

## Example questions I asked

1. How do I run Actual Budget locally for E2E tests?
2. Can you split my tests into page objects and flows?
3. Help me automate cancel transaction — I checked it manually already.
4. Why does the add transaction test fail after clicking Add?

---

## Closing note

Cursor saved time on repetitive code and debugging. The tests and test plan are based on what I clicked through in the app and what passed when I ran pytest locally.
