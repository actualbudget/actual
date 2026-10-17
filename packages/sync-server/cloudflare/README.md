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

Password hashing uses argon2id through
[argon2w](https://github.com/Hallaxius/argon2w) (WASM). It caps memory at
32 MiB, so new hashes use `m=19456,t=1,p=1` instead of the Node server's
`m=47104,t=1,p=1`; hashes above the cap (for example ones made by the Node
server) are still verified, with pure-JS `@noble/hashes`.

## Requirements

- An R2 bucket named `actual-user-files` (or change `wrangler.jsonc`).
- A custom domain for the Worker (see [Deploying](#deploying)).

A login costs about 20 ms of CPU, most of it the argon2w verify. That is over
the Workers Free plan's 10 ms per request, which Cloudflare tolerates for
occasional requests but doesn't guarantee. On Workers Paid, uncomment
`limits.cpu_ms` in `wrangler.jsonc` and nothing here comes close to the limit.

## Commands

Run from the repository root.

```bash
# Build the web app (served as static assets)
yarn build:browser

# Build the Worker (output in cloudflare/dist)
yarn workspace @actual-app/sync-server cf:build

# Run locally on http://localhost:8787 with simulated Durable Objects and R2
# (local-only ACTUAL_* settings go in cloudflare/.dev.vars, which is gitignored)
yarn workspace @actual-app/sync-server cf:dev

# Typecheck the Worker entry points / regenerate binding types
yarn workspace @actual-app/sync-server cf:typecheck
yarn workspace @actual-app/sync-server cf:types
```

`cf:types` also picks up variable names from `cloudflare/.dev.vars`; don't
commit those additions to `worker-configuration.d.ts`.

## Deploying

```bash
npx wrangler login
npx wrangler r2 bucket create actual-user-files
yarn build:browser
yarn workspace @actual-app/sync-server cf:deploy
```

`workers_dev` and `preview_urls` are off, so the first deploy has no public
URL. Add a custom domain in the dashboard (Worker > **Settings** >
**Domains & Routes**). `wrangler.jsonc` has no `routes` key, so later deploys
leave it in place.

To keep the server private, put a Cloudflare Access self-hosted application
(public hostname, the whole domain) in front of it. Access then applies to the
web app and the API before requests reach the Worker; with workers.dev and
preview URLs off there is no way around it. Clients that can't do a browser
login (the Electron app, `@actual-app/api` scripts) are blocked by it.

Server settings use the usual `ACTUAL_*` environment variables. Put plain
settings in `vars` in `wrangler.jsonc` and secrets (for example
`ACTUAL_OPENID_CLIENT_SECRET`) in Worker secrets:

```bash
npx wrangler secret put ACTUAL_OPENID_CLIENT_SECRET -c packages/sync-server/cloudflare/dist/actual_sync_server/wrangler.json
```

Deployment-specific settings you'd rather not commit (such as
`ACTUAL_OPENID_DISCOVERY_URL` or `ACTUAL_OPENID_CLIENT_ID`) can be Worker
secrets too: unlike variables added in the dashboard, secrets survive
`wrangler deploy`. While `ACTUAL_OPENID_DISCOVERY_URL` is set, the server
re-enables OpenID on every start; delete the secret to stop that.

Cloudflare Access can act as the OpenID provider (a SaaS application with
OIDC, redirect URI `https://<your-domain>/openid/callback`). To switch back
to password login, delete the OpenID secrets, deploy, and use **Settings >
Authentication method** in the app. On a server that was set up with OpenID
and never had a password, the password typed there becomes the server
password (there is no shell to run the `disable-openid` script).

`config.json` and `*_FILE` variables are not supported (there is no
filesystem to read them from).

## Not supported yet

- Bank sync providers have not been tested on Workers.
- Header authentication (`ACTUAL_LOGIN_METHOD=header`) relies on the socket's
  peer address, which is undefined inside a Durable Object, so every header
  login fails with `proxy-not-trusted`. It could be supported by checking
  `CF-Connecting-IP` (set by Cloudflare, not spoofable by clients) against
  `ACTUAL_TRUSTED_AUTH_PROXIES` instead: for a proxy in front of the Worker,
  that is the proxy's public IP. Trusting a public IP is only safe when the
  proxy doesn't share it, so a shared-secret header from the proxy would be a
  sensible addition. Cloudflare Access is the simpler way to put a login in
  front of the server.
- Importing data from an existing Node server.
