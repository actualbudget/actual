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

First start the dev server:

```sh
HTTPS=true yarn start
```

Next, navigate to the root of your project folder, run the standartised docker container, and launch the visual regression tests from within the desktop-client package.

```sh
# Run docker container
docker run --rm --network host -v $(pwd):/work/ -w /work/ -it mcr.microsoft.com/playwright:v1.41.1-jammy /bin/bash

    # If you receive an error such as "docker: invalid reference format", please instead use the following command:
    docker run --rm --network host -v ${pwd}:/work/ -w /work/ -it mcr.microsoft.com/playwright:v1.41.1-jammy /bin/bash

# Change directories
cd packages/desktop-client

# Run the VRT tests: important - they MUST be ran against a HTTPS server
E2E_START_URL=https://192.168.0.178:3001 yarn vrt

    # To update snapshots, use the following command:
    E2E_START_URL=https://192.168.0.178:3001 yarn vrt --update-snapshots
```

#### Running against a remote server

You can also run the tests against a remote server by passing the URL:

```sh
E2E_START_URL=https://my-remote-server.com yarn vrt
```
