---
category: Bugfixes
authors: [ssbn]
---

API: `updateTransaction` and `deleteTransaction` now wait for the change to finish, so transfer legs are no longer lost when several transactions are updated in a row.
