# Browser-compatible `@actual-app/api` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser build to `@actual-app/api` so the same package works in Node, Electron, and browser environments, covered by unit tests in both environments and hand-verified against a real Actual sync server via a throwaway playground app outside the repo.

**Architecture:** Dual Vite builds sharing one codebase. A new browser entry (`index.browser.ts`) + browser Vite config (`vite.browser.config.mts`) omit loot-core's `api` resolve-condition, which causes loot-core's default platform files (`@jlongster/sql.js` + `absurd-sql` + IndexedDB) to be used instead of the Node ones (`better-sqlite3` + native fs). Package `exports` add a `browser` condition that bundlers auto-select. A small shared integration spec runs under both Node (vitest + node env) and browser (vitest + jsdom + `fake-indexeddb`). Manual browser verification happens via a standalone Vite app at `~/actual-browser-api-playground/` that aliases `@actual-app/api` directly to the built `dist/browser.js` and calls `init` + `downloadBudget` against a user-provided sync server.

**Tech Stack:** TypeScript, Vite 8, Vitest 4, `@jlongster/sql.js`, `absurd-sql`, `fake-indexeddb`, jsdom.

**Spec:** [`docs/superpowers/specs/2026-04-17-browser-api-design.md`](../specs/2026-04-17-browser-api-design.md)

---

## Files to create or modify

**Repo — modify:**

- `packages/api/package.json` — new `exports` conditions, new `build:node`/`build:browser`/`build`/`test:node`/`test:browser`/`test` scripts, new devDeps.
- `packages/api/tsconfig.json` — include `index.browser.ts`, exclude new vite config files from typecheck.
- `packages/api/vite.config.mts` — rename build script target (no file changes required if scripts alone pick it up), drop the inline `test` block once it moves to setup files.
- `packages/api/methods.test.ts` — leave it Node-only (rename target: `packages/api/test/methods.test.ts`) and point it at the new node setup.
- `upcoming-release-notes/<PR_NUMBER>.md` — new release notes entry (filename uses the PR number once opened; placeholder `TBD-browser-api.md` until then).

**Repo — create:**

- `packages/api/index.browser.ts` — browser entry, no `validateNodeVersion`, no node-fetch polyfill.
- `packages/api/vite.browser.config.mts` — browser Vite build + vitest config.
- `packages/api/test/setup.node.ts` — Node-side vitest setup (extracts the mock currently inline in `methods.test.ts`).
- `packages/api/test/setup.browser.ts` — browser-side vitest setup: `fake-indexeddb`, `structuredClone`, `fetch` polyfill for `default-db.sqlite` / migrations / WASM.
- `packages/api/test/integration.test.ts` — small shared spec: init → create budget → add one account + two transactions → read back → assert. Runs under both configs.
- `packages/api/typings/vite-plugin-peggy-loader.d.ts` — module declaration for the peggy plugin so the browser vite config type-checks (mirrors PR #7247).

**Outside repo — create (at `/Users/matiss/actual-browser-api-playground/`):**

- `index.html`
- `package.json` (devDep: `vite`)
- `vite.config.ts`
- `public/default-db.sqlite` (copied from `packages/api/dist/`)
- `public/migrations/*.sql`, `public/migrations/*.js` (copied from `packages/api/dist/migrations/`)
- `src/config.ts` (empty strings, user fills in)
- `src/main.ts` (the init + download + render flow)
- `scripts/copy-assets.sh` (predev hook)
- `README.md`

---

## Phase 1 — Browser entry and Vite build

### Task 1: Add the browser entry file

**Files:**

- Create: `packages/api/index.browser.ts`

- [ ] **Step 1: Read the existing Node entry so the browser entry matches its public API exactly**

Run: `cat packages/api/index.ts`
Expected: Shows `init`, `shutdown`, `internal`, and re-exports of `./methods` and `./utils`.

- [ ] **Step 2: Create the browser entry**

```typescript
// packages/api/index.browser.ts
import { init as initLootCore } from '@actual-app/core/server/main';
import type { InitConfig, lib } from '@actual-app/core/server/main';

export * from './methods';
export * as utils from './utils';

let internalLib: typeof lib | null = null;

export async function init(config: InitConfig = {}) {
  internalLib = await initLootCore(config);
  return internalLib;
}

export async function shutdown() {
  if (internalLib) {
    try {
      await internalLib.send('sync');
    } catch {
      // most likely no budget loaded, so sync failed
    }

    await internalLib.send('close-budget');
    internalLib = null;
  }
}
```

Differences from the Node entry:

- No `validateNodeVersion` call (there is no Node version in a browser).
- No exported `internal` let — deprecated there, and we start fresh without it in the browser entry. If something needs it later we can add it.

- [ ] **Step 3: Commit**

```bash
git add packages/api/index.browser.ts
git commit -m "[AI] api: add browser entry point"
```

---

### Task 2: Add the peggy plugin type declaration

**Files:**

- Create: `packages/api/typings/vite-plugin-peggy-loader.d.ts`

- [ ] **Step 1: Check whether the module already has types**

Run: `grep -r "vite-plugin-peggy-loader" packages/api/typings packages/api/node_modules/vite-plugin-peggy-loader/package.json 2>/dev/null | head`
Expected: No `.d.ts` in the module — the import will fail typecheck without a shim.

- [ ] **Step 2: Write the shim**

```typescript
// packages/api/typings/vite-plugin-peggy-loader.d.ts
declare module 'vite-plugin-peggy-loader';
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/typings/vite-plugin-peggy-loader.d.ts
git commit -m "[AI] api: add type shim for vite-plugin-peggy-loader"
```

---

### Task 3: Add the browser Vite build config

**Files:**

- Create: `packages/api/vite.browser.config.mts`

- [ ] **Step 1: Read the existing Node Vite config so the browser config stays consistent**

Run: `cat packages/api/vite.config.mts`
Expected: Shows `cleanOutputDirs`, `copyMigrationsAndDefaultDb`, `resolve.conditions: ['api']`, `lib` build targeting Node CJS.

- [ ] **Step 2: Create the browser Vite config**

```typescript
// packages/api/vite.browser.config.mts
import path from 'path';

import { defineConfig } from 'vite';
import peggyLoader from 'vite-plugin-peggy-loader';

const distDir = path.resolve(__dirname, 'dist');

export default defineConfig({
  build: {
    target: 'esnext',
    outDir: distDir,
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'index.browser.ts'),
      formats: ['es'],
      fileName: () => 'browser.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [peggyLoader()],
  // Do NOT set resolve.conditions: ['api'] here — omitting it causes
  // loot-core's default (browser) platform files to be selected.
});
```

Key points:

- No `resolve.conditions` → loot-core resolves to `#platform/server/sqlite` → `index.ts` (sql.js) instead of `index.api.ts` (better-sqlite3).
- `emptyOutDir: false` so it doesn't wipe the Node build artifacts when `build:browser` runs after `build:node`.
- `inlineDynamicImports: true` produces a single self-contained `dist/browser.js` — makes the playground's Vite alias point at one file.
- ESM format (`formats: ['es']`) because browsers want modules.

- [ ] **Step 3: Verify the config loads without syntax errors**

Run: `yarn workspace @actual-app/api exec vite build --config vite.browser.config.mts --mode production` (this **will fail** on missing package.json scripts plumbing later — that's fine for this step; we want a syntax/resolution check only).
Expected: Either succeeds producing `dist/browser.js`, or fails on resolution of a specific loot-core module — in both cases, the config itself parsed.

If it fails on `Cannot find module '@actual-app/core/...'` or similar resolution issues, stop and debug before continuing.

- [ ] **Step 4: Commit**

```bash
git add packages/api/vite.browser.config.mts
git commit -m "[AI] api: add browser Vite build config"
```

---

### Task 4: Update `package.json` exports and scripts

**Files:**

- Modify: `packages/api/package.json`

- [ ] **Step 1: Read the current `package.json`**

Run: `cat packages/api/package.json`
Expected: Shows current `exports`, `scripts`, and dependencies.

- [ ] **Step 2: Update `exports["."]`**

Replace the current `exports` block:

```jsonc
"exports": {
  ".": {
    "types": "./@types/index.d.ts",
    "development": "./index.ts",
    "default": "./dist/index.js"
  }
}
```

with:

```jsonc
"exports": {
  ".": {
    "types": "./@types/index.d.ts",
    "development": "./index.ts",
    "browser": "./dist/browser.js",
    "default": "./dist/index.js"
  }
}
```

And update `publishConfig.exports` to mirror (minus `development`):

```jsonc
"publishConfig": {
  "exports": {
    ".": {
      "types": "./@types/index.d.ts",
      "browser": "./dist/browser.js",
      "default": "./dist/index.js"
    }
  }
}
```

- [ ] **Step 3: Update `scripts`**

Replace:

```jsonc
"scripts": {
  "build": "vite build && tsgo --emitDeclarationOnly",
  "test": "vitest --run",
  "typecheck": "tsgo -b && tsc-strict"
}
```

with:

```jsonc
"scripts": {
  "build": "npm-run-all -s build:node build:browser",
  "build:node": "vite build --config vite.config.mts && tsgo --emitDeclarationOnly",
  "build:browser": "vite build --config vite.browser.config.mts",
  "test": "npm-run-all -cp 'test:*'",
  "test:node": "vitest --run --config vite.config.mts",
  "test:browser": "vitest --run --config vite.browser.config.mts",
  "typecheck": "tsgo -b && tsc-strict"
}
```

- [ ] **Step 4: Add `npm-run-all` devDep**

Run: `yarn workspace @actual-app/api add -D npm-run-all`
Expected: Installs successfully; `yarn.lock` updates; `package.json` `devDependencies` contains `npm-run-all`.

- [ ] **Step 5: Add `fake-indexeddb` devDep (needed for browser tests in Task 9)**

Run: `yarn workspace @actual-app/api add -D fake-indexeddb`
Expected: Installs successfully. The version should match what loot-core uses (`^6.2.5`).

- [ ] **Step 6: Run the node build and verify nothing regressed**

Run: `yarn workspace @actual-app/api build:node`
Expected: `packages/api/dist/index.js`, `packages/api/dist/default-db.sqlite`, `packages/api/dist/migrations/` all exist and look normal.

Verify:

```bash
ls packages/api/dist
```

Expected: `index.js`, `index.js.map`, `default-db.sqlite`, `migrations/`.

- [ ] **Step 7: Run the browser build and verify it succeeds**

Run: `yarn workspace @actual-app/api build:browser`
Expected: `packages/api/dist/browser.js` exists. File size approximately 3–5 MB (self-contained bundle).

If this fails, the most likely causes are:

- A loot-core module that only works in Node sneaking into the browser graph. The error message will name the offending import. Ask the user before attempting workarounds — this is a signal the platform resolution is wrong.
- Missing asset — re-run `build:node` first to populate `dist/default-db.sqlite` and `dist/migrations/`.

- [ ] **Step 8: Commit**

```bash
git add packages/api/package.json yarn.lock
git commit -m "[AI] api: add browser build scripts and exports conditions"
```

---

### Task 5: Update `tsconfig.json` to include the browser entry

**Files:**

- Modify: `packages/api/tsconfig.json`

- [ ] **Step 1: Read the current tsconfig**

Run: `cat packages/api/tsconfig.json`
Expected: Shows `include` and `exclude` arrays.

- [ ] **Step 2: Make sure `index.browser.ts` is included and `vite.browser.config.mts` is excluded**

Add `index.browser.ts` to `include` if not already covered by a glob. Add `vite.browser.config.mts` to `exclude` if the existing `vite.config.mts` is excluded there.

Exact edits depend on the current file; typical resulting shape:

```jsonc
{
  "include": [
    "index.ts",
    "index.browser.ts",
    "methods.ts",
    "utils.ts",
    "typings.ts",
    "app/**/*.ts",
    "test/**/*.ts",
    "typings/**/*.d.ts",
  ],
  "exclude": [
    "vite.config.mts",
    "vite.browser.config.mts",
    "dist",
    "node_modules",
  ],
}
```

Adapt to the existing file. Do not restructure.

- [ ] **Step 3: Run typecheck**

Run: `yarn workspace @actual-app/api typecheck`
Expected: Passes cleanly. Common failure: `index.browser.ts` imports types that don't exist in `@actual-app/core/server/main` — check the Node entry imports for comparison.

- [ ] **Step 4: Commit**

```bash
git add packages/api/tsconfig.json
git commit -m "[AI] api: include browser entry in tsconfig"
```

---

## Phase 2 — Unit tests

### Task 6: Move `methods.test.ts` into `test/` and extract node setup

**Files:**

- Move: `packages/api/methods.test.ts` → `packages/api/test/methods.test.ts`
- Move: `packages/api/__snapshots__/methods.test.ts.snap` → `packages/api/test/__snapshots__/methods.test.ts.snap` (if the current setup has snapshots — check first with `ls packages/api/__snapshots__`)
- Create: `packages/api/test/setup.node.ts`

- [ ] **Step 1: Check for existing snapshots**

Run: `ls packages/api/__snapshots__ 2>/dev/null`
Expected: Either a file list (snapshots exist — move them) or nothing (skip the snapshot move).

- [ ] **Step 2: Git-move the test file**

Run:

```bash
mkdir -p packages/api/test
git mv packages/api/methods.test.ts packages/api/test/methods.test.ts
```

If snapshots exist:

```bash
mkdir -p packages/api/test/__snapshots__
git mv packages/api/__snapshots__/methods.test.ts.snap packages/api/test/__snapshots__/methods.test.ts.snap
```

- [ ] **Step 3: Fix the paths inside `test/methods.test.ts`**

The existing file uses `path.join(__dirname, '/../loot-core/...')`. After the move, `__dirname` is `packages/api/test/`, so the relative path needs an extra `..`.

Run: `grep -n "__dirname" packages/api/test/methods.test.ts`
Expected: Lists every `__dirname` usage.

Update each one to add one more `..` segment. For example:

```typescript
// before
path.join(__dirname, '/../loot-core/src/mocks/files', templateName);
// after
path.join(__dirname, '/../../loot-core/src/mocks/files', templateName);
```

and:

```typescript
// before
path.join(__dirname, '/mocks/budgets/', budgetName);
// after
path.join(__dirname, '/../mocks/budgets/', budgetName);
```

- [ ] **Step 4: Extract the inline `vi.mock` to `test/setup.node.ts`**

Create `packages/api/test/setup.node.ts`:

```typescript
import * as path from 'path';

import { vi } from 'vitest';

// In tests we run from source; loot-core's API fs uses __dirname (for the built dist/).
// Mock the fs so path constants point at loot-core package root where migrations live.
vi.mock(
  '../loot-core/src/platform/server/fs/index.api',
  async importOriginal => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    const lootCoreRoot = path.join(__dirname, '..', '..', 'loot-core');
    return {
      ...actual,
      migrationsPath: path.join(lootCoreRoot, 'migrations'),
      bundledDatabasePath: path.join(lootCoreRoot, 'default-db.sqlite'),
      demoBudgetPath: path.join(lootCoreRoot, 'demo-budget'),
    };
  },
);

// Tests use global flags the production build sets elsewhere.
global.IS_TESTING = true;
```

Note the `path.join(__dirname, '..', '..', 'loot-core')` — two levels up from `packages/api/test/` is `packages/`; one more up is the repo root, then down into `loot-core`. Actually that's wrong — `packages/api/test/` → `..` → `packages/api/` → `..` → `packages/` → `loot-core` sibling.

Correct path: `path.join(__dirname, '..', '..', 'loot-core')` means `packages/api/test/ + ../../loot-core` = `packages/loot-core`. Correct.

- [ ] **Step 5: Remove the inline `vi.mock` block from `methods.test.ts`**

Delete the `vi.mock(...)` block and the `global.IS_TESTING = true;` line from the top of `packages/api/test/methods.test.ts`. They now live in the setup file.

- [ ] **Step 6: Wire `setup.node.ts` into the Node vite config**

Modify `packages/api/vite.config.mts`'s `test` block:

```typescript
test: {
  globals: true,
  environment: 'node',
  setupFiles: ['./test/setup.node.ts'],
  onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
    // print only console.error
    return type === 'stderr';
  },
  maxWorkers: 2,
},
```

- [ ] **Step 7: Run the Node tests**

Run: `yarn workspace @actual-app/api test:node`
Expected: All tests pass exactly as before the move. If a test fails because of a path mismatch, re-check the `__dirname` replacements from Step 3.

- [ ] **Step 8: Commit**

```bash
git add packages/api/test packages/api/vite.config.mts
git rm packages/api/__snapshots__ 2>/dev/null || true
git commit -m "[AI] api: move tests into test/ and extract node setup"
```

---

### Task 7: Create the shared integration spec

**Files:**

- Create: `packages/api/test/integration.test.ts`

- [ ] **Step 1: Write the shared spec**

This is a minimal end-to-end test that works in both Node and browser environments. It creates a budget programmatically (no template file copying), writes a bit of data, reads it back.

```typescript
// packages/api/test/integration.test.ts
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import * as api from '../index';

const budgetName = 'integration-test';

beforeEach(async () => {
  await api.init({ dataDir: globalThis.__API_DATA_DIR__ });
});

afterEach(async () => {
  await api.shutdown();
});

describe('api integration (shared, Node + browser)', () => {
  test('creates a budget, adds data, reads it back', async () => {
    // We do not have a public createBudget in the api surface; use the
    // internal handle returned by init for the one seed action.
    // After that, the test uses only public read/write methods.
    const internal = await api.init({ dataDir: globalThis.__API_DATA_DIR__ });
    await internal.send('create-budget', { budgetName });
    await api.loadBudget(budgetName);

    const accountId = await api.createAccount(
      { name: 'Checking', offbudget: false },
      0,
    );
    const accounts = await api.getAccounts();
    expect(accounts.map(a => a.name)).toContain('Checking');

    await api.addTransactions(accountId, [
      { date: '2026-04-01', amount: 1000, payee_name: 'Coffee' },
      { date: '2026-04-02', amount: -500, payee_name: 'Book' },
    ]);

    const txns = await api.getTransactions(accountId);
    expect(txns).toHaveLength(2);
    expect(txns.map(t => t.amount).sort((a, b) => a - b)).toEqual([-500, 1000]);
  });
});
```

Notes:

- `globalThis.__API_DATA_DIR__` is set up per-environment in the setup files (Node uses a temp dir; browser uses `/blobs`).
- `../index` is the Node entry. The browser vitest config sets `resolve.alias` to swap that for `../index.browser` at test time — see Task 9.
- The spec deliberately avoids template files and fs operations so it is portable.

- [ ] **Step 2: Add a global type declaration for the setup-file state**

Create or update `packages/api/test/globals.d.ts`:

```typescript
declare global {
  var __API_DATA_DIR__: string;
  var IS_TESTING: boolean;
  // eslint-disable-next-line no-var
  var currentMonth: string | null;
}

export {};
```

- [ ] **Step 3: Teach `setup.node.ts` to set `__API_DATA_DIR__`**

Append to `packages/api/test/setup.node.ts`:

```typescript
import * as fsPromises from 'fs/promises';
import * as os from 'os';

const dataDir = path.join(
  os.tmpdir(),
  `api-it-${Date.now()}-${Math.random().toString(36).slice(2)}`,
);
await fsPromises.mkdir(dataDir, { recursive: true });
globalThis.__API_DATA_DIR__ = dataDir;
```

- [ ] **Step 4: Run the Node integration test**

Run: `yarn workspace @actual-app/api test:node -- integration`
Expected: The integration test passes. If the api lacks a public `createBudget`, the `internal.send('create-budget', ...)` call above handles that — if it errors with "unknown method", grep `packages/loot-core/src/server/` for the actual handler name (`'create-budget'` exists per `budgetfiles/app.ts`) and adjust.

- [ ] **Step 5: Commit**

```bash
git add packages/api/test/integration.test.ts packages/api/test/globals.d.ts packages/api/test/setup.node.ts
git commit -m "[AI] api: add shared integration test for Node environment"
```

---

### Task 8: Write the browser setup file

**Files:**

- Create: `packages/api/test/setup.browser.ts`

- [ ] **Step 1: Write the setup**

```typescript
// packages/api/test/setup.browser.ts
import * as fs from 'fs/promises';
import * as path from 'path';

import 'fake-indexeddb/auto';

// Polyfill structuredClone (jsdom environments older than node 17 need this).
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (value: unknown) =>
    JSON.parse(JSON.stringify(value));
}

// Polyfill fetch for static assets that loot-core's browser fs layer expects
// to load over HTTP: default-db.sqlite, /migrations/*, and sql.js WASM.
const lootCoreRoot = path.join(__dirname, '..', '..', 'loot-core');
const sqlJsWasmDir = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'node_modules',
  '@jlongster',
  'sql.js',
  'dist',
);

const originalFetch = globalThis.fetch;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = typeof input === 'string' ? input : input.toString();

  // Strip protocol if present; map to files on disk.
  const pathname = urlStr
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^file:\/\//, '');

  let diskPath: string | null = null;
  if (pathname === '/default-db.sqlite') {
    diskPath = path.join(lootCoreRoot, 'default-db.sqlite');
  } else if (pathname.startsWith('/migrations/')) {
    diskPath = path.join(lootCoreRoot, pathname);
  } else if (pathname.endsWith('.wasm') || pathname.endsWith('sql-wasm.js')) {
    diskPath = path.join(sqlJsWasmDir, path.basename(pathname));
  }

  if (diskPath) {
    const buf = await fs.readFile(diskPath);
    const headers: Record<string, string> = {};
    if (pathname.endsWith('.wasm'))
      headers['Content-Type'] = 'application/wasm';
    return new Response(new Uint8Array(buf), { status: 200, headers });
  }

  return originalFetch(input as any, init);
}) as typeof fetch;

// The browser build uses IndexedDB for all persistence. Provide a data dir
// that the browser fs layer treats as the budget root.
globalThis.__API_DATA_DIR__ = '/blobs';
globalThis.IS_TESTING = true;
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/test/setup.browser.ts
git commit -m "[AI] api: add browser test setup with fake-indexeddb and fetch polyfill"
```

---

### Task 9: Wire the browser vitest config

**Files:**

- Modify: `packages/api/vite.browser.config.mts`

- [ ] **Step 1: Add `test` and `resolve.alias` blocks**

Append to `packages/api/vite.browser.config.mts`:

```typescript
export default defineConfig({
  // ...existing build config
  resolve: {
    alias: {
      // When the shared spec imports '../index' (node entry), rewrite to
      // '../index.browser' so the browser test configuration exercises the
      // browser entry.
      [path.resolve(__dirname, 'index.ts')]: path.resolve(
        __dirname,
        'index.browser.ts',
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.browser.ts'],
    include: ['test/integration.test.ts'],
    onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
      return type === 'stderr';
    },
    maxWorkers: 2,
  },
});
```

Merge with the existing config object — do not create a second `defineConfig` call. The final file has one `defineConfig({ build, plugins, resolve, test })`.

- [ ] **Step 2: Run the browser tests for the first time**

Run: `yarn workspace @actual-app/api test:browser`
Expected: Most likely fails on the first run. Common failures and fixes:

| Failure                                     | Fix                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Cannot find module 'fake-indexeddb/auto'`  | Run `yarn workspace @actual-app/api add -D fake-indexeddb` again (should have been done in Task 4 step 5).                                       |
| `ReferenceError: IDBRequest is not defined` | `fake-indexeddb/auto` import not taking effect; ensure it is the first import in `setup.browser.ts`.                                             |
| `fetch not mocked for <URL>`                | The polyfill's path mapping missed a URL. Read the URL, widen the mapping.                                                                       |
| WASM file not found                         | The sql.js dist path differs from what the polyfill assumes. Run `find node_modules/@jlongster/sql.js -name "*.wasm"` and update `sqlJsWasmDir`. |

**Iterate until the integration test passes under `test:browser`**. Do not mock the integration test itself.

- [ ] **Step 3: Run both test suites together**

Run: `yarn workspace @actual-app/api test`
Expected: Both `test:node` and `test:browser` run, both pass.

- [ ] **Step 4: Commit**

```bash
git add packages/api/vite.browser.config.mts
git commit -m "[AI] api: run integration test under browser (jsdom + fake-indexeddb)"
```

---

### Task 10: Verify typecheck and lint both pass

- [ ] **Step 1: Typecheck**

Run: `yarn typecheck`
Expected: Passes. Fix any errors introduced by the new files. Do not suppress with `@ts-ignore` or `as any` — diagnose the actual type issue.

- [ ] **Step 2: Lint**

Run: `yarn lint:fix`
Expected: No remaining violations. Common fix: import ordering in new files.

- [ ] **Step 3: Commit any auto-fixes**

```bash
git add -u
git commit -m "[AI] api: lint autofixes for browser test setup" || echo "nothing to commit"
```

---

## Phase 3 — Release notes

### Task 11: Add release notes entry

**Files:**

- Create: `upcoming-release-notes/TBD-browser-api.md` (rename to `<pr-number>.md` once the PR is opened)

- [ ] **Step 1: Write the entry**

```markdown
---
category: Enhancements
authors: [MatissJanis]
---

The `@actual-app/api` package now supports running in a browser environment in addition to Node.js and Electron. Consumers that set the `browser` export condition (Vite, Webpack web mode, Rollup with `browser: true`) will automatically receive an ESM bundle that uses IndexedDB for persistence via the same sql.js / absurd-sql stack the web app already uses.
```

- [ ] **Step 2: Commit**

```bash
git add upcoming-release-notes/TBD-browser-api.md
git commit -m "[AI] api: release notes for browser build"
```

---

## Phase 4 — Validation playground (outside repo)

### Task 12: Scaffold the playground directory

**Files (all outside the repo, at `/Users/matiss/actual-browser-api-playground/`):**

- Create: `package.json`, `index.html`, `vite.config.ts`, `scripts/copy-assets.sh`, `README.md`

- [ ] **Step 1: Create the directory and enter it**

Run:

```bash
mkdir -p /Users/matiss/actual-browser-api-playground/{src,public,scripts}
cd /Users/matiss/actual-browser-api-playground
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "actual-browser-api-playground",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "copy-assets": "./scripts/copy-assets.sh",
    "predev": "yarn copy-assets",
    "dev": "vite",
    "prebuild": "yarn copy-assets",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^8.0.5",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 3: Write `index.html`**

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Actual browser API playground</title>
    <style>
      body {
        font:
          14px/1.5 system-ui,
          sans-serif;
        margin: 2rem;
        max-width: 720px;
      }
      h2 {
        margin-top: 2rem;
      }
      pre#log {
        background: #111;
        color: #ddd;
        padding: 1rem;
        overflow: auto;
        white-space: pre-wrap;
      }
      .row {
        display: flex;
        justify-content: space-between;
        padding: 0.25rem 0;
        border-bottom: 1px solid #eee;
      }
      .amount.neg {
        color: #b00;
      }
    </style>
  </head>
  <body>
    <h1>Actual browser API playground</h1>
    <p>Fill in <code>src/config.ts</code> first.</p>
    <h2>Log</h2>
    <pre id="log"></pre>
    <h2>Accounts</h2>
    <div id="accounts">(loading…)</div>
    <h2>Transactions (first account)</h2>
    <div id="transactions">(loading…)</div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `vite.config.ts`**

```typescript
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// CHANGE THIS if your repo lives elsewhere.
const REPO_ROOT = '/Users/matiss/actual/actual/.claude/worktrees/browser-api';

export default defineConfig({
  resolve: {
    alias: {
      '@actual-app/api': resolve(REPO_ROOT, 'packages/api/dist/browser.js'),
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    // The api bundle is pre-built; don't let Vite try to re-bundle its deps.
    exclude: ['@actual-app/api'],
  },
});
```

- [ ] **Step 5: Write `scripts/copy-assets.sh`**

```bash
#!/bin/bash
set -euo pipefail

REPO_ROOT="/Users/matiss/actual/actual/.claude/worktrees/browser-api"
DIST="$REPO_ROOT/packages/api/dist"

if [ ! -f "$DIST/default-db.sqlite" ] || [ ! -d "$DIST/migrations" ]; then
  echo "api dist not found — run 'yarn workspace @actual-app/api build' in the repo first" >&2
  exit 1
fi

rm -rf public/migrations
mkdir -p public
cp "$DIST/default-db.sqlite" public/
cp -R "$DIST/migrations" public/migrations
echo "copied default-db.sqlite + migrations into public/"
```

Make it executable:

```bash
chmod +x scripts/copy-assets.sh
```

- [ ] **Step 6: Write `README.md`**

```markdown
# Actual browser API playground

Tiny manual-verification app for `@actual-app/api`'s browser build.

## Running

1. Build the browser api in the repo:
```

yarn workspace @actual-app/api build

```

2. Fill in `src/config.ts` with your sync server details.

3. From this directory:

```

yarn install # once
yarn dev

```

4. Open the URL Vite prints (usually http://localhost:5173).

## Expected output

On the page, in order:

- `✅ init ok`
- `✅ budget downloaded` (first run) or `✅ budget loaded` (subsequent)
- A list of account names with balances
- The first ~10 transactions for the first account

## Gotchas

- Your sync server must allow CORS from `http://localhost:5173`.
- After changing anything in `packages/api/`, re-run `yarn workspace @actual-app/api build` in the repo, then refresh the browser.
- Clear IndexedDB in DevTools → Application to reset state.
```

No git commit — this directory is outside any repo.

---

### Task 13: Write the playground config and main flow

**Files:**

- Create: `/Users/matiss/actual-browser-api-playground/src/config.ts`
- Create: `/Users/matiss/actual-browser-api-playground/src/main.ts`

- [ ] **Step 1: Write `src/config.ts`**

```typescript
// Fill these in with your Actual sync server details before running.
// All values are strings; leave them empty for local-only scenarios only
// if you have a matching local data dir (see README).

export const config = {
  serverURL: '', // e.g. https://actual.example.com
  password: '', // server login password
  syncId: '', // budget's Sync ID from Settings → Advanced
  encryptionPassword: '', // only set if the budget is end-to-end encrypted
};
```

- [ ] **Step 2: Write `src/main.ts`**

```typescript
import * as api from '@actual-app/api';

import { config } from './config';

const logEl = document.getElementById('log') as HTMLPreElement;
const accountsEl = document.getElementById('accounts') as HTMLDivElement;
const txnsEl = document.getElementById('transactions') as HTMLDivElement;

function log(line: string) {
  console.log(line);
  logEl.textContent += line + '\n';
}

function fail(err: unknown) {
  const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
  log('❌ ' + msg);
}

function assertConfigured() {
  const missing = (['serverURL', 'password', 'syncId'] as const).filter(
    k => !config[k],
  );
  if (missing.length) {
    throw new Error(
      'Missing config fields: ' + missing.join(', ') + '. Edit src/config.ts.',
    );
  }
}

function renderAccount(acc: { id: string; name: string }, balance: number) {
  const row = document.createElement('div');
  row.className = 'row';
  const amt = (balance / 100).toFixed(2);
  const amtCls = balance < 0 ? 'amount neg' : 'amount';
  row.innerHTML = `<span>${acc.name}</span><span class="${amtCls}">$${amt}</span>`;
  accountsEl.appendChild(row);
}

function renderTxn(t: {
  id: string;
  date: string;
  amount: number;
  payee: string | null;
  notes: string | null;
}) {
  const row = document.createElement('div');
  row.className = 'row';
  const amt = (t.amount / 100).toFixed(2);
  const amtCls = t.amount < 0 ? 'amount neg' : 'amount';
  row.innerHTML = `<span>${t.date} — ${t.notes ?? ''}</span><span class="${amtCls}">$${amt}</span>`;
  txnsEl.appendChild(row);
}

async function main() {
  assertConfigured();

  log('→ init');
  await api.init({
    dataDir: '/blobs',
    serverURL: config.serverURL,
    password: config.password,
  });
  log('✅ init ok');

  const budgets = await api.getBudgets();
  const local = budgets.find(b => b.id === config.syncId);

  if (local) {
    log('→ loadBudget (already present locally)');
    await api.loadBudget(local.id);
    log('✅ budget loaded');
  } else {
    log('→ downloadBudget');
    await api.downloadBudget(config.syncId, {
      password: config.encryptionPassword || undefined,
    });
    log('✅ budget downloaded');
  }

  accountsEl.innerHTML = '';
  const accounts = await api.getAccounts();
  log(`→ ${accounts.length} accounts`);

  const balances = await Promise.all(
    accounts.map(a => api.getAccountBalance(a.id)),
  );
  accounts.forEach((a, i) => renderAccount(a, balances[i] ?? 0));

  txnsEl.innerHTML = '';
  if (accounts.length === 0) {
    log('⚠ no accounts on this budget');
    return;
  }
  const first = accounts[0];
  const txns = await api.getTransactions(first.id);
  log(`→ ${txns.length} transactions on ${first.name}`);
  txns.slice(0, 10).forEach(renderTxn);

  log('✅ done');
}

main().catch(fail);
```

---

### Task 14: Manual verification

- [ ] **Step 1: Build the api (both targets)**

Run from the repo:

```bash
yarn workspace @actual-app/api build
```

Expected: `packages/api/dist/index.js`, `packages/api/dist/browser.js`, `packages/api/dist/default-db.sqlite`, `packages/api/dist/migrations/` all present.

- [ ] **Step 2: Install playground deps (once)**

Run:

```bash
cd /Users/matiss/actual-browser-api-playground
yarn install
```

- [ ] **Step 3: Fill in `src/config.ts`**

This is a manual step — the executing engineer prompts the user for the four values (serverURL, password, syncId, optional encryptionPassword) and writes them into `src/config.ts`. **Do not commit the edited file anywhere** — it is outside the repo and contains credentials.

- [ ] **Step 4: Start the playground dev server**

Run (in the playground directory):

```bash
yarn dev
```

Expected: Vite prints a URL (default: `http://localhost:5173`).

- [ ] **Step 5: Hand off to the user with the validation checklist**

Print this checklist to the user:

```
Open http://localhost:5173

You should see, in this order:
  ✅ init ok
  ✅ budget downloaded   (first run)  or
  ✅ budget loaded       (subsequent runs)
  A list of accounts with real balances
  The first ~10 transactions for the first account
  ✅ done

If anything prints ❌ in the log pane, that is the failure.
Open DevTools → Application → IndexedDB → databases should be populated.
```

---

## Self-Review checklist (already run by the plan author)

- **Spec coverage.** All spec sections implemented:
  - Dual Vite builds → Tasks 1, 3, 4.
  - Entry files (`index.ts` kept, new `index.browser.ts`) → Task 1.
  - Package exports with `browser` condition → Task 4.
  - Build scripts (`build:node` / `build:browser` / `build`) → Task 4.
  - Static assets still copied to `dist/` → unchanged (covered by existing plugin).
  - Unit tests: `setup.node.ts`, `setup.browser.ts`, shared `integration.test.ts`, dual vitest configs → Tasks 6–10.
  - Release notes → Task 11.
  - Playground outside the repo, alias to built browser bundle, COOP/COEP, `config.ts` with blanks, `main.ts` flow, README, gotchas → Tasks 12–14.

- **Placeholder scan.** `TBD-browser-api.md` filename is a deliberate placeholder until the PR number is known; flagged in Task 11. No other placeholders.

- **Type consistency.** `globalThis.__API_DATA_DIR__` is declared in `test/globals.d.ts` (Task 7), set in `setup.node.ts` (Task 7) and `setup.browser.ts` (Task 8), read in `integration.test.ts` (Task 7). Consistent.

- **Ambiguity.** Every task specifies exact paths, exact commands, and exact file contents. The only judgement calls are the browser-test failure fixes in Task 9 step 2 — listed explicitly with remediation per mode.
