# Browser-compatible build for `@actual-app/api`

**Date:** 2026-04-17
**Status:** Design approved, pending implementation plan
**Related:** [PR #7247](https://github.com/actualbudget/actual/pull/7247) (closed stale)

## Goal

Make `@actual-app/api` usable from a browser environment in addition to the
existing Node.js / Electron environments, and hand-verify it works by
connecting a tiny out-of-repo playground app to a real Actual sync server and
reading a real budget.

Bundle-size optimization for consumers that also bundle loot-core (e.g.
`desktop-client`) is out of scope. That is tracked separately in
[#7252](https://github.com/actualbudget/actual/issues/7252); the followup Matiss
flagged on PR #7247 still applies.

## Non-goals

- Publishing the browser build to npm as a new artifact (the existing
  `@actual-app/api` package is what gains browser support).
- Write operations in the playground. The playground is read-only against a
  real sync server; it does not exercise `runImport`, `addTransactions`,
  `createAccount`, etc.
- Bundle-size de-duplication with loot-core when imported from
  `desktop-client`.
- Offline / no-server browser use. Out of scope for this round; the playground
  requires a reachable sync server.

## Approach

**Dual Vite builds, separate entry files.** Same shape as PR #7247, including
the file-naming feedback (`index.browser.ts`, not `index.web.ts`).

Two alternatives were considered and rejected:

- **Single entry with runtime branching.** The actual problem is build-time
  resolution of `#platform/server/sqlite` et al., not runtime — runtime
  branching can't change which platform file got bundled. Not viable.
- **Ship source only, let consumers bundle.** Would break existing Node
  consumers (e.g. `actual-cli`) that `require()` a pre-built CJS artifact.
  Out of scope for this round.

## Architecture

### loot-core platform resolution recap

`loot-core`'s `package.json` declares conditional imports for every
platform-specific module (`#platform/server/sqlite`, `#platform/server/fs`,
`#platform/server/fetch`, `#shared/platform`, …). Each has three branches:
`electron`, `api`, and `default`.

- `electron` branch → `index.electron.ts` — uses `better-sqlite3`, native `fs`
- `api` branch → `index.api.ts` — usually re-exports from `index.electron.ts`,
  same native stack, no node version check
- `default` branch → `index.ts` — `@jlongster/sql.js` + `absurd-sql` +
  IndexedDB, designed for the browser

The Node api build today uses `resolve.conditions: ['api']` to pick the `api`
branch. The browser api build simply omits that condition, so the `default`
(browser) branch is picked.

### Entry files

- `packages/api/index.ts` — unchanged Node entry. Calls `validateNodeVersion`,
  initializes loot-core via the `api` platform resolution, and returns the
  `internal` handle.
- `packages/api/index.browser.ts` — **new**. Re-exports `./methods` and
  `./utils`. Exposes `init` / `shutdown` with the same signatures as the Node
  entry minus `validateNodeVersion` and any Node-only bootstrapping (e.g. the
  `node-fetch` polyfill is skipped — browsers have global `fetch`).

Both entries share the same `init`/`shutdown` surface so downstream code
does not branch on environment.

### Build configs

- `packages/api/vite.config.mts` — **unchanged**. Builds CJS `dist/index.js`
  targeted at Node, with `resolve.conditions: ['api']`.
- `packages/api/vite.browser.config.mts` — **new**. Builds ESM
  `dist/browser.js` targeted at `esnext`, entry = `index.browser.ts`, no `api`
  condition. Bundles dependencies the same way (`ssr.noExternal: true` /
  equivalent for lib-mode) so the output is self-contained for the playground.

### Package exports

`packages/api/package.json` `exports["."]` becomes:

```jsonc
{
  "types": "./@types/index.d.ts",
  "development": "./index.ts",
  "browser": "./dist/browser.js",
  "default": "./dist/index.js",
}
```

Bundlers that honour the `browser` condition (Vite, Webpack in web mode, Rollup
with `@rollup/plugin-node-resolve` and `browser: true`) will pick the browser
build. Node and Electron consumers fall through to `default`.

`publishConfig.exports` mirrors the same shape, minus the `development`
condition.

### Build scripts

In `packages/api/package.json`:

- `build:node` — existing build command, renamed.
- `build:browser` — new, invokes the new browser vite config.
- `build` — runs both (`yarn build:node && yarn build:browser`, same pattern
  PR #7247 landed on).

### Static assets

`default-db.sqlite` and `migrations/*` continue to be copied into `dist/` by
the existing `copyMigrationsAndDefaultDb` plugin. The Node build reads them
from disk; the browser build expects them to be served by the consumer at
`/default-db.sqlite` and `/migrations/*`. The playground does this by copying
them into its own `public/` directory — see below.

## Unit tests

Two test configurations sharing a common integration spec:

- `packages/api/test/setup.node.ts` — unchanged Node-side bootstrap (move any
  Node-only test setup here).
- `packages/api/test/setup.browser.ts` — **new**. Polyfills `fake-indexeddb`,
  wires up `structuredClone`, and loads `default-db.sqlite` + `migrations/*`
  into the mock FS the way the browser platform code expects.
- `packages/api/vite.browser.config.mts` gains a `test` block with
  `environment: 'jsdom'`, `setupFiles: ['./test/setup.browser.ts']`, and the
  same no-`api`-condition resolution used by the build.
- `packages/api/test/api-integration.test.ts` — **shared spec**. Runs under
  both configs. Calls `init` → create a budget → add one account + two
  transactions → read them back → assert. Same code, two environments; if
  either breaks, we know.
- `package.json` scripts: `test:node` (existing vitest config), `test:browser`
  (new browser vitest config), and `test` which runs both in parallel via
  `npm-run-all -cp 'test:*'` (identical to PR #7247).

## Validation mini-app

A tiny throwaway Vite app **outside the monorepo** that exercises the browser
build against a real Actual sync server.

### Layout

```
~/actual-browser-api-playground/
├── index.html
├── package.json           # devDep: vite only
├── vite.config.ts
├── public/
│   ├── default-db.sqlite  # copied from packages/api/dist/
│   └── migrations/        # copied from packages/api/dist/migrations/
├── src/
│   ├── config.ts          # blanks the user fills in locally
│   └── main.ts
└── README.md
```

### Wiring

- The playground does **not** install `@actual-app/api` via npm. It uses a
  Vite `resolve.alias` that maps `@actual-app/api` directly to
  `<repo>/packages/api/dist/browser.js`. No workspace link, no symlink, no
  publish step.
- Each change in `packages/api/` requires re-running
  `yarn workspace @actual-app/api build:browser` in the repo before the
  playground picks it up. The README calls this out.
- `vite.config.ts` sets `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp` headers so WASM +
  `SharedArrayBuffer` work (absurd-sql relies on this in some paths).
- A `predev` script copies `packages/api/dist/default-db.sqlite` and
  `packages/api/dist/migrations/*` into `public/`, so loot-core's browser
  `fs.init()` can fetch them at `/default-db.sqlite` and `/migrations/*`.

### `src/config.ts`

Checked in with empty strings. The user fills in values locally:

```ts
export const config = {
  serverURL: '', // e.g. https://actual.example.com
  password: '', // server login password
  syncId: '', // budget's Sync ID from Settings → Advanced
  encryptionPassword: '', // only set if the budget is end-to-end encrypted
};
```

### `src/main.ts` flow

1. `await init({ serverURL, password, dataDir: '/blobs' })` — authenticates
   against the user's sync server.
2. `const budgets = await getBudgets()` — list local + remote. Find the budget
   matching `config.syncId`.
3. If already downloaded locally, `await loadBudget(localId)`. Otherwise,
   `await downloadBudget(syncId, { password: encryptionPassword || undefined })`.
4. `const accounts = await getAccounts()`; render as a list with balances
   fetched via `getAccountBalance`.
5. `const txns = await getTransactions(accounts[0].id)`; render the first ~10
   rows.
6. Every step logged to both `console` and an on-page `<pre id="log">` so the
   validator does not need devtools open to see progress or errors.
7. On failure at any step, surface the error in the `<pre>` block and stop.

### Manual validation code path (what the user does)

1. Run `yarn workspace @actual-app/api build:browser` in the repo.
2. Fill in `src/config.ts` in the playground with real server credentials.
3. Run `yarn dev` (or `pnpm dev`) in the playground directory.
4. Open the URL printed by Vite (typically `http://localhost:5173`).
5. Expect this sequence on the page:
   - `✅ init ok`
   - `✅ budget downloaded` (first run) or `✅ budget loaded` (subsequent)
   - `Accounts:` followed by a list of real account names with balances
   - `Transactions:` followed by a list of the first ~10 real transactions
6. Open DevTools → Application → IndexedDB. There should be absurd-sql
   databases present, confirming that persistence wired up correctly.

### Known gotchas (README call-outs)

- The user's sync server must allow CORS from `http://localhost:<port>`. If
  it doesn't, the browser blocks the request and the playground cannot work
  around that.
- Re-run `build:browser` after every API code change — the alias points to
  the built artifact, not source.
- Clearing IndexedDB in DevTools → Application is the simplest way to
  re-trigger a fresh `downloadBudget` path.

## Files added / modified

### Modified

- `packages/api/package.json` — new `exports` conditions, new scripts.
- `packages/api/vite.config.mts` — keep Node build; move anything shared with
  browser config into a small helper if useful.
- `packages/api/tsconfig.json` — include `index.browser.ts`; exclude any new
  vite config file from type checking (same as PR #7247).
- `packages/api/test/api-integration.test.ts` — adapted to run under both
  environments (moved from what exists today, or freshly written if it
  doesn't).

### Added

- `packages/api/index.browser.ts`
- `packages/api/vite.browser.config.mts`
- `packages/api/test/setup.node.ts`
- `packages/api/test/setup.browser.ts`
- `packages/api/typings/vite-plugin-peggy-loader.d.ts` (if not already there;
  required by browser config)
- `upcoming-release-notes/<pr-number>.md` — release-notes entry.

### Out of repo (handed to the user)

- `~/actual-browser-api-playground/` (path configurable) — the playground app
  itself.

## Risks and open questions

- **CORS on the user's sync server.** If the server rejects `localhost`
  origins, the playground can't verify anything. Mitigation: documented
  clearly in the README; the user has control of their own server.
- **Bundle size (~4 MB).** Matiss's original note still applies — the browser
  build bundles all of loot-core. Fine for the playground and the published
  browser build; problematic only if `desktop-client` starts importing this
  package directly. Followup tracked in #7252.
- **`default-db.sqlite` version drift.** If loot-core's migrations change
  and the api's copied artifact lags, the browser build may fail to init. The
  existing `copyMigrationsAndDefaultDb` plugin copies at build time, so a
  fresh `yarn build` picks up the current loot-core state. Worth documenting.

## Acceptance criteria

- `yarn workspace @actual-app/api build` produces both `dist/index.js`
  (Node CJS) and `dist/browser.js` (browser ESM).
- `yarn workspace @actual-app/api test` runs both the Node and browser test
  configurations; both pass the shared integration spec.
- Starting the out-of-repo playground, filling in valid server credentials,
  and opening the URL renders real accounts and transactions from the sync
  server, proving the api package executes end-to-end in a browser.
- No regressions in existing Node consumers (`actual-cli`, integration
  packages that import `@actual-app/api`).
