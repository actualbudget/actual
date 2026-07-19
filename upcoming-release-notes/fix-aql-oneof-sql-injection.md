---
category: Bugfixes
authors: [sebastiondev]
---

Escape single quotes in the AQL compiler's `$oneof` operator to prevent SQL injection through user-controlled filter values.
