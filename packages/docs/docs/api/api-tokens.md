# API Token Authentication

API tokens provide a secure way to authenticate with the Actual server when using the `@actual-app/api` package. This page covers how to use tokens in your scripts and integrations.

For instructions on creating and managing tokens, see the [Settings documentation](/docs/settings/#api-tokens).

## Using Tokens

When initializing the API client, use the `token` parameter instead of `password`:

```js
const api = require('@actual-app/api');

(async () => {
  await api.init({
    dataDir: '/some/path',
    serverURL: 'http://localhost:5006',
    token: 'act_your_token_here',
  });

  await api.downloadBudget('your-budget-id');

  // ... your code here ...

  await api.shutdown();
})();
```

## Token vs Password Authentication

| Feature | Password | Token |
|---------|----------|-------|
| Revocable without changing credentials | No | Yes |
| Can have multiple active credentials | No | Yes |
| Usage tracking (last used) | No | Yes |
| Expiration support | No | Yes |
| Recommended for scripts | No | Yes |

## Storing Tokens Securely

Never hardcode tokens in your source code, especially if using version control. Use environment variables or a secrets manager instead:

```js
const api = require('@actual-app/api');

(async () => {
  await api.init({
    dataDir: process.env.ACTUAL_DATA_DIR || './data',
    serverURL: process.env.ACTUAL_SERVER_URL,
    token: process.env.ACTUAL_API_TOKEN,
  });

  // ...
})();
```

Then set the environment variables when running your script:

```bash
export ACTUAL_SERVER_URL="https://actual.example.com"
export ACTUAL_API_TOKEN="act_..."
node my-script.js
```

Or use a `.env` file with a library like `dotenv`:

```js
require('dotenv').config();
const api = require('@actual-app/api');

// process.env.ACTUAL_API_TOKEN is now available
```

## Error Handling

The API exports error types for handling authentication failures:

```js
const api = require('@actual-app/api');
const {
  AuthError,
  TokenExpiredError,
  InvalidTokenError,
  TokenScopeError
} = api;

try {
  await api.init({
    serverURL: process.env.ACTUAL_SERVER_URL,
    token: process.env.ACTUAL_API_TOKEN,
  });
} catch (error) {
  if (error instanceof TokenExpiredError) {
    console.error('Token has expired. Please create a new token.');
  } else if (error instanceof InvalidTokenError) {
    console.error('Invalid token. Check that you copied it correctly.');
  } else if (error instanceof TokenScopeError) {
    console.error('Token does not have access to this budget.');
  } else if (error instanceof AuthError) {
    console.error('Authentication failed:', error.message);
  } else {
    throw error;
  }
}
```

## Token Format

Tokens follow the format `act_` followed by 32 random characters:

```text
act_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

The `act_` prefix identifies Actual API tokens and the first 12 characters (including prefix) are stored as a prefix for identification in the UI.
