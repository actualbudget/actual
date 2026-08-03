---
category: Bugfix
authors: [dikshit-n]
---

Return an error from `changePassword` when no `method='password'` row exists, instead of silently succeeding (e.g. OIDC-only deployments).
