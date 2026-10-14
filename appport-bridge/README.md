# AppPort bridge for Actual Budget (opt-in, read-only)

A small, separate Node.js process that lets an [AppPort](https://www.npmjs.com/package/@appport/sdk) consumer discover
and call four **read-only** Actual capabilities. It does not change Actual: no package, loot-core, sync-server, API or
web code is touched, it is not a workspace, and nothing runs unless you start it.

| Capability                   | Answered by (Actual's own API, `@actual-app/api`)                     |
| ---------------------------- | --------------------------------------------------------------------- |
| `actual.budgets.list@1`      | `getBudgets()`: the budgets the sync server lets the caller open      |
| `actual.accounts.list@1`     | `getAccounts()` and `getAccountBalance()`                             |
| `actual.transactions.list@1` | `getTransactions(accountId, start, end)`                              |
| `actual.budget.month@1`      | `getBudgetMonth("YYYY-MM")`: budgeted, spent and balance per category |

## How authority stays with Actual

Actual has no HTTP API for budget contents; its supported programmatic interface is the `@actual-app/api` package. For
**every request** the bridge:

1. starts this repository's API build (`packages/api/dist`) in a **fresh temporary directory** with the **caller's own
   sync-server session token**,
2. downloads the requested budget. The sync server enforces ownership and sharing (`files.owner`, `user_access`);
   a budget the caller may not open is reported as `NOT_FOUND`, which is how Actual's API reports it,
3. calls only the API's own read methods (all figures come from Actual's engine; the bridge does no arithmetic),
4. shuts the API down and **deletes the directory**.

The bridge has **no credential of its own**, keeps **no copy** of any budget, and never logs tokens or budget data.
Requests are handled one at a time because the API holds one budget and one user per process. AppPort itself only checks
that a credential was presented (anonymous calls get `UNAUTHORIZED` without reaching Actual); an invalid token is
rejected by Actual (`UNAUTHORIZED`). Discovery is opt-in (`APPPORT_BRIDGE_PUBLIC=1`) and is never authorization.

Opening a budget runs Actual's normal loading logic. The test checks that bridge reads add no sync messages and leave the
stored budget file unchanged for an ordinary budget. End-to-end encrypted budgets are not supported (`FORBIDDEN`).

## Run

```sh
yarn install && yarn build:api                               # from the repository root
cd appport-bridge && npm ci
APPPORT_BRIDGE_UPSTREAM=http://127.0.0.1:5006 APPPORT_BRIDGE_PORT=4440 APPPORT_BRIDGE_PUBLIC=1 npm start
```

```js
import { AppPort } from '@appport/sdk';
const app = await AppPort.discover({
  origin: 'http://127.0.0.1:4440',
  headers: { authorization: 'Bearer <session token>' },
});
const { budgets } = await app.call('actual.budgets.list', {}, { version: 1 });
```

The bridge listens on `127.0.0.1` unless `APPPORT_BRIDGE_HOST` says otherwise. Put TLS in front of it before exposing it
beyond localhost: callers send their Actual session tokens to it.

## Test

`npm test` starts a **real Actual sync server** (`packages/sync-server/build`, temp data dir) and uses this repository's
`@actual-app/api` build to create two ordinary users and a synthetic budget for each (no bank connections, no real data).
Password login only ever signs in the server owner, so the two users' sessions are inserted into the server's `sessions`
table, as the sync server's own test setup does. It then starts the bridge and checks everything as an independent
consumer using only the published `@appport/sdk`:

- discovery is opt-in and `reference-verified`; it establishes no trust, authorization or approval
- every result is compared with **the budget file the sync server stores, downloaded and read directly** (accounts,
  transactions, `zero_budgets`, categories) and with the server's own `files` table, never with the bridge's word
- bridge reads add no sync messages and leave the stored budget file byte-for-byte unchanged
- carol cannot open bob's budget (the server itself returns 403 to her); no credential → `UNAUTHORIZED`; an invalid
  token is rejected by Actual
- unknown budget or account → `NOT_FOUND`; malformed input → `INVALID_INPUT`
- a lost response is _indeterminate_, never confirmed, and is sent once
- the disposable server data and every per-request API directory are removed

Requires `yarn build:api` and `yarn workspace @actual-app/sync-server build` first (`ACTUAL_API_PATH` /
`ACTUAL_SYNC_SERVER_ENTRY` override their locations). Package versions are pinned exactly (`@appport/sdk` 1.2.2) and
installed from the npm registry via `package-lock.json`. Requires Node 22.13+.
