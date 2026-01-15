Actual on the web

## E2E tests

E2E (end-to-end) tests use [Playwright](https://playwright.dev/). Running them requires an Actual server to be running either locally or on a remote server.

### Functional

Running against the local server:

```sh
# Start the development server
yarn start

# Run against the local server (localhost:3001)
yarn e2e
```

Running against a remote server:

```sh
E2E_START_URL=http://my-remote-server.com yarn e2e
```

### Visual regression

Visual regression tests (also known as screenshot tests) check that the visual appearance of the product has not regressed. Each environment has slightly different colors, fonts etc. Mac differs from Windows which differs from Linux. In order to have a stable test environment for visual comparisons - you must use a standartised docker container. This ensures that the tests are always ran in a consistent environment.

Prerequisites:

- Docker installed

#### Running against the local server

First start a dev instance:

```sh
HTTPS=true yarn start
```

or using the dev container:

```
HTTPS=true docker compose up --build
```

Note the network IP address and port the dev instance is listening on.

Next, navigate to the root of your project folder, run the standardized docker container, and launch the visual regression tests from within it.

Run via yarn:

```sh
# By default, this connects to https://localhost:3001
yarn vrt:docker

    # To use a different ip and port:
    yarn vrt:docker --e2e-start-url https://ip:port

    # To update snapshots, use the following command:
    yarn vrt:docker --e2e-start-url https://ip:port --update-snapshots
```

Run manually:

```sh
# Run docker container
docker run --rm --network host -v $(pwd):/work/ -w /work/ -it mcr.microsoft.com/playwright:v1.57.0-jammy /bin/bash

    # If you receive an error such as "docker: invalid reference format", please instead use the following command:
    docker run --rm --network host -v ${pwd}:/work/ -w /work/ -it mcr.microsoft.com/playwright:v1.57.0-jammy /bin/bash

# Once inside the docker container, run the VRT tests: important - they MUST be ran against a HTTPS server.
# Use the ip and port noted earlier
E2E_START_URL=https://ip:port yarn vrt

    # To update snapshots, use the following command:
    E2E_START_URL=https://ip:port yarn vrt --update-snapshots
```

#### Running against a remote server

You can also run the tests against a remote server by passing the URL:

Run in standardized docker container:

```sh
E2E_START_URL=https://my-remote-server.com yarn vrt:docker

    # Or pass in server URL as argument
    yarn vrt:docker --e2e-start-url https://my-remote-server.com
```

Run locally:

```sh
E2E_START_URL=https://my-remote-server.com yarn vrt
```

## Browser Tests (Vitest Browser Mode)

Browser tests (`.browser.test.tsx` files) use Vitest's browser mode to test React components with visual regression screenshots. These tests generate screenshots that can vary significantly by environment (fonts, rendering, DPI, etc.).

**IMPORTANT: For consistent screenshot quality, always run browser tests in Docker.**

### Running Browser Tests in Docker

From the project root:

```sh
# Run all browser tests
yarn test:browser:docker

# Run a specific browser test file
yarn test:browser:docker AuthSettings.browser

# Run with update flag to update snapshots
yarn test:browser:docker AuthSettings.browser --update
```

From the `packages/desktop-client` directory:

```sh
# Run all browser tests
yarn test:browser:docker

# Run a specific browser test file
yarn test:browser:docker AuthSettings.browser

# Run with update flag
yarn test:browser:docker AuthSettings.browser --update
```

### Why Docker?

Running browser tests locally will produce inconsistent screenshots due to:

- System-specific font rendering
- Different DPI/display scaling
- OS-specific rendering differences
- Font availability variations

Docker ensures all tests run in the same standardized environment (`mcr.microsoft.com/playwright:v1.56.0-jammy`), producing consistent, reproducible screenshots.
