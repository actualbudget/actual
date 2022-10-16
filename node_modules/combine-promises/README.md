# Combine-Promises

[![NPM](https://img.shields.io/npm/dm/combine-promises.svg)](https://www.npmjs.com/package/combine-promises)
![Size min](https://img.shields.io/bundlephobia/min/combine-promises.svg)
![Size minzip](https://img.shields.io/bundlephobia/minzip/combine-promises.svg)

  Like Promise.all(array) but with an object.

```ts
import combinePromises from 'combine-promises';

const { user, company } = await combinePromises({
  user: fetchUser(),
  company: fetchCompany(),
});
```

Why:

- Insensitive to destructuring order typos
- Simpler async functional code

Features:

- TypeScript support
- Lightweight
- Feature complete
- Well-tested
- ESM / CJS

## TypeScript support

Good, native and strict TypeScript support:

- Return type correctly inferred from the input object
- All object values should be async
- Only accept objects (reject arrays, null, undefined...)

```ts
const result: { user: User; company: Company } = await combinePromises({
  user: fetchUser(),
  company: fetchCompany(),
});
```

## Insensitive to destructuring order

A common error with `Promise.all` is to have a typo in the destructuring order.

```js
// Bad: destructuring order reversed
const [company, user] = await Promise.all([fetchUser(), fetchCompany()]);
```

This code becomes particularly dangerous as size of the array promise grows over time.

With `combinePromises`, you are using explicit names instead of array indices, which makes the code more robust and not sensitive to destructuring order:

```js
// Good: we don't care about the order anymore
const { company, user } = await combinePromises({
  user: fetchUser(),
  company: fetchCompany(),
});
```

## Simpler async functional code

Suppose you have an object representing a friendship like `{user1: "userId-1", user2: "userId-2"}`, and you want to transform it to `{user1: User, user2: User}`.

You can easily do that:

```js
import combinePromises from 'combine-promises';
import { mapValues } from 'lodash';

const friendsIds = { user1: 'userId-1', user2: 'userId-2' };

const friends = await combinePromises(mapValues(friendsIds, fetchUserById));
```

Without this library: good luck to keep your code simple.

## Inspirations

Name inspired by [combineReducers](https://redux.js.org/api/combinereducers) from Redux.
