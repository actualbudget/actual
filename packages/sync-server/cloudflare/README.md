# Actual sync server on Cloudflare Workers

Runs the regular sync server (`packages/sync-server`) and the web app on
Cloudflare Workers, with no other infrastructure.

| Node server                           | Cloudflare                                       |
| ------------------------------------- | ------------------------------------------------ |
| Express app                           | Same Express app, inside the `ActualServer` DO   |
| `server-files/account.sqlite`         | `ActualServer` Durable Object SQLite             |
| `user-files/group-<id>.sqlite`        | One `SyncGroup` Durable Object per group         |
| `user-files/file-<id>.blob`           | `USER_FILES` R2 bucket, same key names           |
| `.migrate` state file                 | `ActualServer` Durable Object KV storage         |
| Static web build via `express.static` | Workers static assets (`_headers` for COOP/COEP) |

Platform-specific code is selected through the `workerd` condition in
`package.json` `imports` (`#db`, `#storage`, `#password-hash`); the Node
build is unchanged.

## Requirements

- Workers Paid plan: password hashing (argon2id) needs ~120 ms CPU per login.
- An R2 bucket named `actual-user-files` (or change `wrangler.jsonc`).

## Commands

Run from the repository root.

```bash
# Build the web app (served as static assets)
yarn build:browser

# Build the Worker (output in cloudflare/dist)
yarn workspace @actual-app/sync-server cf:build

# Run locally on http://localhost:8787 with simulated Durable Objects and R2
yarn workspace @actual-app/sync-server cf:dev

# Typecheck the Worker entry points / regenerate binding types
yarn workspace @actual-app/sync-server cf:typecheck
yarn workspace @actual-app/sync-server cf:types
```

## Deploying

```bash
npx wrangler login
npx wrangler r2 bucket create actual-user-files
yarn build:browser
yarn workspace @actual-app/sync-server cf:deploy
```

Server settings use the usual `ACTUAL_*` environment variables. Put plain
settings in `vars` in `wrangler.jsonc` and secrets (for example
`ACTUAL_OPENID_CLIENT_SECRET`) in Worker secrets:

```bash
npx wrangler secret put ACTUAL_OPENID_CLIENT_SECRET -c packages/sync-server/cloudflare/dist/actual_sync_server/wrangler.json
```

`config.json` and `*_FILE` variables are not supported (there is no
filesystem to read them from).

## Not supported yet

- OpenID login (`openid-client` v5 is Node-only).
- Bank sync providers have not been tested on Workers.
- Header authentication (`ACTUAL_LOGIN_METHOD=header`) relies on the socket's
  peer address, which isn't meaningful inside a Durable Object.
- Importing data from an existing Node server.
