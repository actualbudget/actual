---
name: running-vrts
description: Use whenever adding, updating, regenerating, running, or debugging visual regression tests (VRTs) / screenshot tests in the Actual Budget repo — including phrases like "add a VRT", "add a screenshot test", "update the snapshots", "regenerate the VRT screenshots", "the VRT is failing", "yarn vrt", "vrt:docker", or "/update-vrt", and any time a UI change needs screenshot coverage. VRT snapshots must be generated inside the Linux docker image (never on the host) and snapshot updates must be scoped to the changed test only — getting either wrong produces snapshots CI ignores or rewrites every screenshot in the repo.
---

# Running VRTs (Visual Regression Tests) in actualbudget/actual

VRTs are ordinary Playwright e2e tests in `packages/desktop-client/e2e/*.test.ts` that call:

```ts
await expect(target).toMatchThemeScreenshots();
```

`toMatchThemeScreenshots()` is a custom matcher defined in
`packages/desktop-client/e2e/fixtures.ts`. `target` is a `Page` or a `Locator` —
**prefer a tight locator** (e.g. a popover or panel) over the whole page to
reduce noise from charts and data.

## Key mechanics

- **No-op without `VRT=true`.** In a plain e2e run the matcher passes
  immediately, so `yarn workspace @actual-app/web run playwright test <file> -g "<name>"`
  verifies the interaction flow cheaply without needing snapshots — always do
  this first.
- **With `VRT=true`, each call captures three themes** (`auto` i.e. light,
  `dark`, `midnight`), producing numbered snapshots:
  `<file>.test.ts-snapshots/<Describe>-<test-name>-N-chromium-linux.png`.
  One test with 2 assertions → 6 PNGs.
- **Masking:** elements with `data-vrt-mask="true"` are masked out of
  screenshots. Use it for volatile content (real dates, version numbers).
- **Diff tolerance is strict:** `maxDiffPixels: 5`, `threshold: 0.05`
  (`packages/desktop-client/playwright.config.ts`).
- **Snapshots are Linux-only.** Committed snapshots end in
  `-chromium-linux.png` and must be generated inside the Playwright docker
  image. A host run on macOS writes `-chromium-darwin.png`, which CI ignores.

## Writing a new VRT

Import from the local fixtures, not `@playwright/test`:

```ts
import { expect, test } from './fixtures';
```

Patterns to copy:

- Date-picker popover VRT: `e2e/transactions.test.ts` ("by date").
- Report VRTs: `e2e/reports.test.ts`.
- Tests use the demo budget (`ConfigurationPage.createTestFile()`), whose data
  is pinned (date ranges show 2016), so snapshots are largely date-stable.
- Popovers render with a `[data-popover]` attribute — a good screenshot
  locator.
- Page models live in `e2e/page-models/`.

## Generating snapshots locally (docker)

Run all yarn commands from the repo root.

1. Start the dev server with HTTPS (background it; ready when
   `https://localhost:3001` returns 200 — `ignoreHTTPSErrors` is already set in
   the Playwright config):

   ```sh
   HTTPS=true yarn start
   ```

2. The container runs with `--network host`. On Linux it can reach
   `https://localhost:3001` directly. On macOS/Windows it cannot — get the
   machine's LAN IP (`ipconfig getifaddr en0` on macOS) and use
   `https://<LAN_IP>:3001` instead.

3. Run the Playwright docker image directly. The `bin/run-vrt` wrapper passes
   `-it`, which fails without a TTY, so in an agent shell invoke docker
   yourself:

   ```sh
   docker run --rm --network host -v "$(pwd)":/work/ -w /work/ \
     mcr.microsoft.com/playwright:v1.59.1-jammy /bin/bash -c \
     "E2E_START_URL=https://<HOST>:3001 yarn vrt --update-snapshots -g '<test name>' <file>.test.ts"
   ```

   Pin the image tag to the repo's Playwright version (`@playwright/test` in
   `packages/desktop-client/package.json` — currently 1.59.1 →
   `v1.59.1-jammy`). The equivalent user-facing wrapper is
   `yarn vrt:docker --e2e-start-url https://<HOST>:3001 --update-snapshots`.

4. **Always scope `--update-snapshots`** with `-g`/file args to the new or
   changed test only — an unscoped update rewrites every screenshot in the
   repo.

5. Verify by re-running the exact same command **without**
   `--update-snapshots`; it must pass.

6. Optionally Read one generated PNG to sanity-check it shows the intended UI,
   then commit the test + PNGs (commit messages need the `[AI]` prefix — see
   the committing-actual-changes skill).

## Fallback without docker

Commit only the test file; CI generates the snapshots when someone comments
`/update-vrt` on the PR (`.github/workflows/vrt-update-generate.yml`).
