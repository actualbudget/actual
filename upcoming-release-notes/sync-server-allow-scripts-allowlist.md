---
category: Bugfix
authors: [dikshit-n]
---

Add npm `allowScripts` allowlist to `@actual-app/sync-server` for `bcrypt`, `better-sqlite3`, and `argon2` so that `npm install -g @actual-app/sync-server` no longer triggers install-script warnings on npm 11.16+/v12
