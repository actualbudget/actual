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
