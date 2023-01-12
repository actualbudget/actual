Actual on the web

## E2E tests

E2E (end-to-end) tests use [Playwright](https://playwright.dev/). Running them requires an Actual server to be running either locally or on a remote server.

Running against the local server:

```sh
# Start the development server
yarn start:browser

# Run against the local server (localhost:3001)
yarn e2e
```

Running against a remote server:

```sh
E2E_START_URL=http://my-remote-server.com yarn e2e
```
