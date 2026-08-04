# Locale overrides (fork)

Official translations are pulled into `locale/` (gitignored) from
[actualbudget/translations](https://github.com/actualbudget/translations).

This directory holds **fork-maintained** overrides that complete or improve
strings for local/custom builds.

## Current overrides

| File | Purpose |
|------|---------|
| `zh-Hans.json` | Full Simplified Chinese catalog (100% keys vs `en.json`) |

## Apply

After cloning/updating official translations:

```bash
# from monorepo root
./bin/apply-locale-overrides
```

Or:

```bash
cp packages/desktop-client/locale-overrides/zh-Hans.json \
   packages/desktop-client/locale/zh-Hans.json
```

## Dev verify (no Docker)

```bash
yarn install
./bin/apply-locale-overrides   # if locale/ was re-cloned
yarn start                     # browser UI ~ http://localhost:3001
# or with sync server:
# yarn start:server-dev        # UI + server on :5006
```

In the app: Settings → Language → 简体中文.
