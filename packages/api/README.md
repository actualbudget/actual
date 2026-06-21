# @actual-app/api

[![npm version](https://img.shields.io/npm/v/@actual-app/api.svg)](https://www.npmjs.com/package/@actual-app/api)
[![npm downloads](https://img.shields.io/npm/dm/@actual-app/api.svg)](https://www.npmjs.com/package/@actual-app/api)
[![license](https://img.shields.io/npm/l/@actual-app/api.svg)](https://github.com/actualbudget/actual/blob/master/LICENSE.txt)

The official Node.js API for [Actual](https://actualbudget.org), a local-first
personal finance tool. Use it to programmatically read and write budgets,
accounts, transactions, categories, rules, and more — perfect for building
integrations, automations, importers, and reports.

## Installation

```sh
npm install @actual-app/api
```

or with Yarn:

```sh
yarn add @actual-app/api
```

## Usage

```js
const api = require('@actual-app/api');

(async () => {
  await api.init({
    // The directory where the API caches data and stores the budget files
    dataDir: '/path/to/data/dir',
    // The URL of the running Actual sync server
    serverURL: 'https://actual.example.com',
    // The password for the sync server
    password: 'password',
  });

  // Load a budget by its Sync ID (Settings → Advanced → Sync ID)
  await api.downloadBudget('your-sync-id');

  const budget = await api.getBudgetMonth('2024-01');
  console.log(budget);

  await api.shutdown();
})();
```

## Documentation

Full documentation, including the complete list of available methods and data
models, is available at:

**https://actualbudget.org/docs/api/**

## TypeScript

`@actual-app/api` publishes TypeScript declarations. Consumers using TypeScript
must set `moduleResolution` to `"bundler"`, `"nodenext"`, or `"node16"` in their
`tsconfig.json`. Legacy `"node"` / `"node10"` / `"classic"` resolution is not
supported in strict mode — the published declarations rely on package.json
`exports` conditions that older resolvers don't honor.

## Contributing

This package lives in the [Actual monorepo](https://github.com/actualbudget/actual).
Issues and pull requests are welcome — see the
[contributing guide](https://actualbudget.org/docs/contributing/) to get started,
or join the [community Discord](https://discord.gg/pRYNYr4W5A).

## License

[MIT](https://github.com/actualbudget/actual/blob/master/LICENSE.txt)
</content>
</invoke>
