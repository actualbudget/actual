---
category: Bugfix
authors: [grzdev]
---

Fall back to IPv4 (`0.0.0.0`) when the sync-server fails to bind to the default IPv6 (`::`) address on hosts without IPv6 support.
