# Publishing Actual to the Mac App Store

> **Scope note:** Actual's desktop app is an **Electron** app, so it can only
> target **macOS / the Mac App Store (MAS)**. It cannot be submitted to the
> **iOS** App Store — Apple has no Electron runtime on iOS. A true iOS app would
> be a separate project (Capacitor / React Native / a PWA wrapper around
> `@actual-app/web`).

This document describes the sandboxing work required to ship a MAS build and
what is left to wire up in CI.

## Background: why earlier attempts crashed in review

The first serious attempt was [PR #3388](https://github.com/actualbudget/actual/pull/3388),
which was abandoned with a "network service crashing and restarting" loop
([electron/electron#43400](https://github.com/electron/electron/issues/43400)).

A MAS build runs inside the **macOS App Sandbox**. The sandbox is only enforced
on the signed, provisioned build that the App Review team runs — **not** on the
unsigned dev build or the notarized DMG you test locally. That is why a build
"works on my machine" but crashes for the reviewer.

There are two distinct failure classes:

1. **Chromium helper-process crashes.** Electron's helper apps
   (GPU / Renderer / Network service) must be re-signed with **inherited**
   sandbox entitlements. If they aren't, the network service crash-loops
   (#43400). `electron-builder` handles this when `entitlementsInherit` is set
   correctly (see `entitlements.mas.inherit.plist`). Native modules
   (`better-sqlite3`, `bcrypt`) must also pass **library validation** — they
   must be signed by the same team certificate.
2. **The app opening listening sockets.** The App Sandbox forbids acting as a
   network _server_ without the `com.apple.security.network.server` entitlement,
   which App Review scrutinises heavily. Actual opened **two** listening
   sockets:
   - the **self-hosted sync server** (bundled `@actual-app/sync-server`, port
     5007), and
   - the **loopback OAuth callback server** (port 3010), used for OpenID login.

   The loot-core backend itself is **not** a problem: it is a
   `utilityProcess.fork` that talks to the main process purely over IPC
   (`postMessage`), never the network.

## What this prototype changes

The fix is to make the build _not need_ `network.server` at all. We detect MAS
builds at runtime via Electron's built-in `process.mas === true` flag
(`isAppStoreBuild` in `index.ts`) and disable the two server features there:

| Feature                             | Non-MAS build | MAS build                    |
| ----------------------------------- | ------------- | ---------------------------- |
| loot-core backend (IPC)             | ✅            | ✅ (unchanged)               |
| Connect to a **remote** sync server | ✅            | ✅ (`network.client`)        |
| **Self-hosted** sync server         | ✅            | ❌ disabled + UI hidden      |
| OpenID login                        | ✅ (loopback) | ✅ via deep link (see below) |
| Password login to remote server     | ✅            | ✅                           |

Code touchpoints:

- `index.ts` — `isAppStoreBuild`; `startSyncServer()` short-circuit; sync-server
  autostart skipped; the `start-oauth-server` IPC returns a deep-link URL in MAS
  builds; the `open-url` handler routes the callback into the window; flag added
  to the bootstrap payload.
- `preload.ts` / `loot-core/typings/window.ts` / `browser-preload.js` —
  `IS_APP_STORE_BUILD` exposed to the renderer.
- `ConfigServer.tsx` — defaults to the external-server view and hides the
  self-host option.
- `entitlements.mas.plist` / `entitlements.mas.inherit.plist` — sandbox
  entitlements **without** `network.server`.
- `package.json` — `mas` / `masDev` build config, the `actualbudget://` URL
  scheme (`protocols`), and `build:mas` / `build:mas-dev` scripts. The default
  `mac.target` stays DMG-only so existing release CI is untouched.
- `sync-server` `accounts/openid.ts` — `isValidRedirectUrl` allows the
  `actualbudget:` redirect scheme.

## OpenID (OIDC) login under the sandbox

A loopback callback server (`http://localhost:3010`) can't be opened in the
sandbox, so MAS builds use a **custom URL scheme** instead — the RFC 8252
("OAuth for Native Apps") pattern:

1. The renderer asks for a return URL; in MAS builds `start-oauth-server`
   returns `actualbudget://actual` (no server is started) and registers the
   scheme via `app.setAsDefaultProtocolClient`.
2. After the user authenticates, the sync server redirects the **external
   browser** to `actualbudget://actual/openid-cb?token=...`.
3. macOS routes that URL to the running app via Electron's `open-url` event; the
   `open-url` handler extracts the token and loads
   `app://actual/openid-cb?token=...` in the window (queuing it if the app was
   cold-launched by the link).

The `actualbudget://` scheme is declared in the app's `Info.plist`
(`CFBundleURLTypes`) through electron-builder's `protocols` config.

**Important dependency:** the sync server validates the redirect target
(`isValidRedirectUrl`). MAS OIDC therefore only works against a server new
enough to allow the `actualbudget:` scheme — older servers will reject the login
with "Invalid redirect URL". OIDC against remote servers you don't control is
gated on them upgrading.

**Known friction:** the final hop is a 302 from the server to a custom scheme.
Most browsers honour it after the user's login interaction, but some prompt
("Open in Actual?") or block automatic custom-scheme redirects. A future
refinement is to have the server return a small interstitial page with an
explicit "Return to Actual" link instead of a bare redirect.

## How to reproduce the reviewer's crash locally

Build a **`mas-dev`** variant. It is signed with a _Mac Developer_ certificate
and a **development** provisioning profile, so it enforces the **exact same
sandbox** as the App Store build but runs on your machine:

```bash
yarn workspace desktop-electron build:mas-dev
```

Then watch for the failure the reviewer sees:

- crash reports in `~/Library/Logs/DiagnosticReports/`, and
- sandbox denials: `log stream --predicate 'process == "Actual" OR sender == "sandboxd"'`

This surfaces the sandbox violation that is invisible in the unsigned DMG/dev
build.

## What is left to do in CI

The packaging/sandbox work above is the hard part. Remaining items are signing
and upload plumbing:

1. **Certificates.** MAS uses different certs than the notarized DMG:
   _Apple Distribution_ (app) **and** _3rd Party Mac Developer Installer_ (the
   `.pkg`). The current CI only has the Developer ID cert (`CSC_LINK`). Add the
   installer cert (e.g. `CSC_INSTALLER_LINK` / password) as repo secrets.
2. **Provisioning profile.** Create an App Store provisioning profile for
   `com.actualbudget.actual` and make CI write it to
   `packages/desktop-electron/embedded.provisionprofile` before `build:mas`.
3. **No notarization** for MAS (App Review replaces it).
4. **Upload step.** Add a job that runs `build:mas` and uploads the resulting
   `.pkg` to App Store Connect via the App Store Connect API key
   (`xcrun altool --upload-app` / Transporter). Wire the ASC API key secrets.
5. **App Store Connect (one-time, manual).** App record, screenshots, privacy
   nutrition labels, and review notes.

## Possible follow-ups

- **Smoother OIDC redirect.** Replace the server's bare 302-to-custom-scheme
  with a small interstitial "Return to Actual" page so no browser prompts/blocks
  the final hop (see "OpenID login under the sandbox" above).
- **Exclude `@actual-app/sync-server` from the MAS package** entirely (it is
  bundled but never started) to reduce size and App Review surface.
- **Data migration** consideration if a user runs both the DMG and MAS builds:
  the sandboxed build's `app.getPath('documents')` resolves inside the app
  container, not `~/Documents`.
