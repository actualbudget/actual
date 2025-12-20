# Actual Server repository move

In February 2025 the actual-server repository was merged into the Actual repository.

The reasons for this change are as follows:

- Streamlines Development: Developers will only need to clone/sync one repo instead of two.
- Improves Debugging: It makes end-to-end debugging for server/client easier as they will be in the same workspace.
- Simplifies Desktop App Packaging: Enables the desktop app to embed the sync server.
- Ensures code consistency and reduces the maintenance burden.
- Simplifies the release process

### Questions

- **Q.** _I use Docker Hub/Github's container registry, how do I stay up to date?_

  **A.** We will continue to push images to [Docker Hub](https://hub.docker.com/r/actualbudget/actual-server) and [Github's container registry](https://ghcr.io/actualbudget/actual) as usual.

- **Q.** _I build the docker image locally, can I still do that?_

  **A.** All of the docker files are still available. To build the sync server locally you can use the `sync-server.Dockerfile` located in the root of the repository. The `docker-compose.yml` is located in the `/packages/sync-server` directory.

- **Q.** _I [Build from source](https://actualbudget.org/docs/install/build-from-source). How do I keep up to date?_

  **A.** Below are steps to clone the updated setup and then migrate your existing data:

  (If you are on Windows, you'll need to install [Git Bash](https://git-scm.com/download).)
  1. Open Bash, then Clone the [Actual repository](https://github.com/actualbudget/actual). You can use the following command:

  ```
  git clone https://github.com/actualbudget/actual.git
  ```

  2. Navigate to the Actual project root directory:

  ```
  cd actual
  ```

  3. Install the required dependencies for the server:

  ```
  yarn install
  ```

  4. Build the server:

  ```
  yarn build:server
  ```

  5. If you have a [config.json](/docs/config/) file you will need to copy it into the following directory:

  ```
  packages/sync-server
  ```

  You may need to make some adjustments (e.g., `ACTUAL_DATA_DIR` becomes `dataDir`), please refer to [troubleshooting the server](/docs/troubleshooting/server) for some help 6. Copy over the data from your `actual-server` directory (`user-files`, `server-files`, and `.migrate`) into the `packages/sync-server` directory. 7. Run the server with:

  ```
  yarn start:server
  ```
