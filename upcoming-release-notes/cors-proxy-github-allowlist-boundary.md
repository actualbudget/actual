---
category: Bugfixes
authors: [MatissJanis]
---

Fix CORS proxy GitHub API allowlist so an allowlisted repository no longer authorizes prefix-matched private repositories (e.g. `owner/plugin` no longer grants access to `owner/plugin-private`).
