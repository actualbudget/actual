---
category: Bugfix
authors: [Yahiro025]
---

Fix CSV import crashing with `safeNumber: can't safely perform arithmetic with number` when an amount column contains scientific notation (e.g. `-1.26E-06`), and accept amounts with more than 9 decimal places
