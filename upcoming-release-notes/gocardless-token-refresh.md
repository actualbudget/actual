---
category: Bugfixes
authors: [costajohnt]
---

Fix GoCardless access token expiring mid-sync on long imports by refreshing it proactively before it lapses.
