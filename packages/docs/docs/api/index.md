# Using the API

import { Method, MethodBox } from './types';

:::warning

Many people mistake the term "API" for a HTTP and/or REST-full API. Actual **does not** expose HTTP endpoints that can be called. We do, however, offer a NPM package - API - that allows interacting with the product programmatically.

:::

The API gives you full programmatic access to your data. It allows to run the UI in _headless_ mode thus interacting with it as-if it was a user clicking around in it. If you are a developer, you can use this to import transactions from a custom source, export data to another app like Excel, or write anything you want on top of Actual.

One thing to keep in mind: Actual is not like most other apps. While your data is stored on a server, the server does not have the functionality for analyzing details of or modifying your budget. As a result, the API client contains all the code necessary to query your data and will work on a local copy. Right now, the primary use case is custom importers and exporters.

## Getting Started

We provide an official Node.js client in the `@actual-app/api` package. Other languages are not supported at this point.

The client is [open-source on GitHub](https://github.com/actualbudget/actual/tree/master/packages/api) along with the rest of Actual if you want to see the code.

Install it with either `npm` or `yarn`:

```
npm install --save @actual-app/api
```

```
yarn add @actual-app/api
```

### TypeScript

`@actual-app/api` ships TypeScript declarations. To consume them, your `tsconfig.json` must use a modern `moduleResolution`:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler" // or "nodenext" / "node16"
  }
}
```

Legacy `"node"` / `"node10"` / `"classic"` resolution is not supported in strict TypeScript mode. The published declarations rely on package.json `exports` conditions, which older resolvers don't honor.

### Connecting to a Remote Server

Next, you'll need connect to your running server version of Actual to access your budget files.

```js
let api = require('@actual-app/api');

(async () => {
  await api.init({
    // Budget data will be cached locally here, in subdirectories for each file.
    dataDir: '/some/path',
    // This is the URL of your running server
    serverURL: 'http://localhost:5006',
    // This is the password you use to log into the server
    password: 'hunter2',
  });

  // This is the ID from Settings → Show advanced settings → Sync ID
  await api.downloadBudget('1cfdbb80-6274-49bf-b0c2-737235a4c81f');
  // or, if you have end-to-end encryption enabled:
  await api.downloadBudget('1cfdbb80-6274-49bf-b0c2-737235a4c81f', {
    password: 'password1',
  });

  let budget = await api.getBudgetMonth('2019-10');
  console.log(budget);
  await api.shutdown();
})();
```

Heads up! You probably don't want to hard-code the passwords like that, especially if you'll be using Git to track your code. You can use environment variables to store the passwords instead, or read them in from a file, or request them interactively when running the script instead.

### Self-Signed Https Certificates

If the serverURL is using [self-signed or custom CA certificates](../config/https.md), additional Node.js configuration will be needed for the connections to succeed.

The API communicates with the server using Node's built-in `fetch`. There are a few ways to get Node.js to trust the self-signed certificate.

- Option 1: Point environment variable [NODE_EXTRA_CA_CERTS](https://nodejs.org/api/cli.html#node_extra_ca_certsfile) to the path of a file containing the public certificate.
- Option 2: Set environment variable [NODE_TLS_REJECT_UNAUTHORIZED](https://nodejs.org/api/cli.html#node_tls_reject_unauthorizedvalue) to `0`. Not recommended if your program reaches out to any other endpoints other than the Actual server.
- Options 3: Use OpenSSL CA certificates configuration for Node and add your certificate to the OpenSSL SSL_CERT_DIR. What this requires depends on your build of Node.js, and the configuration details are beyond the scope of this documentation. See the [Node.js OpenSSL Strategy](https://github.com/nodejs/TSC/blob/main/OpenSSL-Strategy.md) page for a starting point.

## Using the API in a Browser

<ExperimentalFeatureWarning />

The package also ships a browser build. When you bundle your web app with a modern bundler (for example Vite), the package's `browser` entry is picked up automatically and you use the same methods as in Node.js:

```js
import * as api from '@actual-app/api';

await api.init({
  // In the browser, budget data is stored in IndexedDB. This is a path
  // inside that virtual file system.
  dataDir: '/documents',
  serverURL: 'https://your-server.example.com',
  password: 'hunter2',
});

await api.downloadBudget('1cfdbb80-6274-49bf-b0c2-737235a4c81f');
console.log(await api.getAccounts());
await api.shutdown();
```

Behind the scenes, `init` starts a Web Worker running the same budget engine the Actual web app uses, backed by SQLite compiled to WebAssembly. Your budget data is stored in the browser's IndexedDB and stays on the device.

### Cross-origin isolation

The worker runs SQLite through [`absurd-sql`](https://github.com/jlongster/absurd-sql), which relies on `SharedArrayBuffer`. That global only exists when the document is [cross-origin isolated](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated), so the server hosting your app **must** send these two response headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Once the document is isolated, any cross-origin resource it embeds needs a matching `Cross-Origin-Resource-Policy` (or CORP/CORS) header of its own. If the headers are missing, `init` throws an error telling you exactly which headers to add instead of failing later with a cryptic `SharedArrayBuffer is not defined`.

### Bundler setup

The package ships a prebuilt worker (`worker.js`), the SQLite WebAssembly (`sql-wasm.wasm`), and a small set of runtime data files. The worker resolves all of these at runtime relative to the built `browser.js`, so two things are required of your bundler.

First, **do not pre-bundle the package** — that rewrites the worker/wasm URLs. In Vite:

```ts
optimizeDeps: {
  exclude: ['@actual-app/api'];
}
```

Second, in a production build the worker and its assets are referenced by runtime-computed URLs that bundlers can't see, so they must be **copied next to your output** and served same-origin. The Vite config below handles the headers (dev and preview) and copies the assets on build:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const require = createRequire(import.meta.url);
// `@actual-app/api` blocks deep subpaths, so resolve the entry and read the
// prebuilt assets from the same `dist` directory.
const apiDistDir = dirname(require.resolve('@actual-app/api'));

function setIsolationHeaders(res: {
  setHeader: (key: string, value: string) => void;
}) {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
}

const crossOriginIsolation: Plugin = {
  name: 'cross-origin-isolation',
  configureServer(server) {
    server.middlewares.use((_req, res, next) => {
      setIsolationHeaders(res);
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((_req, res, next) => {
      setIsolationHeaders(res);
      next();
    });
  },
};

const emitActualAssets: Plugin = {
  name: 'emit-actual-assets',
  apply: 'build',
  generateBundle() {
    const emit = (relPath: string) => {
      this.emitFile({
        type: 'asset',
        fileName: `assets/${relPath}`,
        source: readFileSync(join(apiDistDir, relPath)),
      });
    };
    const walk = (rel: string) => {
      for (const name of readdirSync(join(apiDistDir, rel))) {
        const childRel = `${rel}/${name}`;
        if (statSync(join(apiDistDir, childRel)).isDirectory()) {
          walk(childRel);
        } else {
          emit(childRel);
        }
      }
    };

    emit('worker.js');
    emit('sql-wasm.wasm');
    emit('data-file-index.txt');
    walk('data');
  },
};

export default defineConfig({
  optimizeDeps: { exclude: ['@actual-app/api'] },
  plugins: [crossOriginIsolation, emitActualAssets],
});
```

:::note

This emits the assets under `assets/`, next to the entry chunk Vite generates there, which is where `browser.js` looks for them. If your bundler places the entry chunk elsewhere, copy the assets next to that chunk instead. The same config is exercised by the package's bundled-build end-to-end test, so it stays in sync with the build.

:::

By default the wasm and data files are fetched from the directory `browser.js` is served from. If you host them somewhere else, point the worker at them with the `assetsBaseUrl` option:

```js
await api.init({ dataDir: '/documents', assetsBaseUrl: '/actual-assets/' });
```

`assetsBaseUrl` only governs the wasm and data files. `worker.js` is always loaded next to `browser.js`, because it is spawned before any configuration is read.

## Writing Data Importers

If you are using another app, like YNAB or Mint, you might want to migrate your data into Actual. Right now, Actual officially supports [importing YNAB4 data](../migration/ynab4.md) and [importing nYNAB data](../migration/nynab.mdx) (and it works very well). But if you want to import all of your data into Actual, you can write a custom importer.

Note that this is not about importing transactions. If all you want to do is add transactions from a custom source (like your bank's API), use [`importTransactions`](./reference.md#importtransactions). In this context, a custom importer is something that takes _all_ of your data (budgets, transactions, payees, etc) and dumps them all into a new file in Actual.

The API has a special mode for bulk importing data. In this mode, a new file is always created (you can't bulk import into an existing file), and it will run much faster than if you did it normally.

To write a custom importer, use `runImport`. It takes the _name_ of the file you want to create and runs a function. Here is an example importer:

```js
let api = require('@actual-app/api');
let data = require('my-data.json');

async function run() {
  for (let account of data.accounts) {
    let acctId = await api.createAccount(convertAccount(account));
    await api.addTransactions(
      acctId,
      data.transactions
        .filter(t => t.acctId === acctId)
        .map(convertTransaction),
    );
  }
}

api.runImport('My-Budget', run);
```

This is very simple, but it takes some data in `my-data.json` and creates all the accounts and transactions from it. Functions used to convert items (like `convertAccount`) are not included here. Use the [reference docs](./reference.md) to learn the shape of objects that Actual expects.

**Note:** it's important that [`addTransactions`](./reference.md#addtransactions) is used here. You want to use it instead of [`importTransactions`](./reference.md#importtransactions) when dumping raw data into Actual. The former will not run the reconciliation process (which deduplicates transactions), and won't create the other side of transfer transactions, and more. If you use `importTransactions` it may adjust your data in ways that don't match the data you're importing.

Check out the [YNAB4](https://github.com/actualbudget/actual/blob/master/packages/loot-core/src/server/importers/ynab4.ts) and [YNAB5](https://github.com/actualbudget/actual/blob/master/packages/loot-core/src/server/importers/ynab5.ts) importers to see how a real importer works.

## Methods

These are the public methods that you can use. The API also exports low-level functions like `init`, `send`, `disconnect`, and `loadBudget` if you want to manually manage the connection. You can [read the source](https://github.com/actualbudget/actual/blob/master/packages/loot-core/src/server/main.ts) to learn about those methods (search for `export const lib`).

#### `init`

<Method name="init" argsObject={true} args={[{ properties: [{ name: 'dataDir', type: 'string' }, { name: 'serverURL', type: 'string' }, { name: 'password', type: 'string' }, { name: 'verbose', type: 'boolean' }]}]} returns="Promise<void>" />

Call this before attempting to use any of the API methods. This will connect to the server using the provided password and load the budget data.

`dataDir` defaults to the current working directory.

If no `serverURL` is provided, no network connections will be made, and you'll only be able to access budget files already downloaded locally.

You can find your budget id in the "Advanced" section of the settings page.

#### `shutdown`

<Method name="shutdown" args={[]} returns="Promise<void>" />

Close the current budget file, and stop any other ongoing processes. It's recommended to call this before exiting your script.

#### `utils.amountToInteger`

<Method name="utils.amountToInteger" args={[{ name: 'amount', type: 'number' }]} returns="number" />

Convert a currency amount (such as `123.45`) represented as a floating point number to the integer format Actual uses internally (i.e. `12345`).

#### `utils.integerToAmount`

<Method name="utils.integerToAmount" args={[{ name: 'amount', type: 'number' }]} returns="number" />

Convert an integer amount as used internally by Actual (such as `12345`) to the traditional floating point (i.e. `123.45`).
