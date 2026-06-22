---
category: Maintenance
authors: [MatissJanis]
---

Scope the CI Lage cache key per job so each job persists its own cache instead of the empty `setup` cache winning the shared key, fixing the 100% cache miss
