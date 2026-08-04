# Setup

Steps to get this exercise running on a fresh machine.

## 0. Get the code

```bash
git clone https://github.com/actualbudget/actual.git
cd actual
git checkout -b qe-takehome/e2e-budget-transactions
```

Then copy these into the repo root — none of this is pushed anywhere yet, so it has to be
carried over manually (e.g. AirDrop, USB, cloud drive):

- `qe-exercise/` (this folder)
- `qe.Dockerfile`
- `docker-compose.qe.yml`

## 1. Toolchain

Requires **Node >=22** and **Yarn ^4.9.1** (enforced by the repo's `engines` field). This
repo pins the exact Node version in `.nvmrc`.

```bash
# Node, via nvm (picks up .nvmrc -> v22.18.0)
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm install
nvm use

# Yarn 4, via corepack (ships with Node 22)
corepack enable
yarn -v   # should print 4.17.1
```

If `nvm` itself isn't installed yet:
`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash`, then
open a new shell before the commands above.

## 2. Dependencies

```bash
yarn install
yarn workspace @actual-app/web playwright install chromium
```

`yarn install` pulls ~2500 packages (~375 MiB) and builds a few native modules
(`better-sqlite3`, `esbuild`, `electron`, `bcrypt`, `sharp`) — several minutes on first
run, not a hang. Some peer-dependency warnings are expected and pre-existing in this repo;
they don't block anything.

## 3. Docker (app under test)

Requires Docker Desktop running (`docker info` should succeed; `open -a Docker` launches it
on macOS if it's installed but not running — wait ~10-20s for the daemon to come up).

The repo's own `docker-compose.yml` bind-mounts the whole repo into the container, which
shares `node_modules` between host and container — breaks things because native modules
(`better-sqlite3`, `esbuild`) are platform-specific. `qe.Dockerfile` /
`docker-compose.qe.yml` avoid this: they `COPY` the repo in and run their own
`yarn install` inside the image, so the container has an independent `node_modules`. They
don't touch the upstream Docker files.

```bash
docker compose -f docker-compose.qe.yml up --build -d
```

First build takes several minutes (`yarn install` inside the image, ~375 MiB). Once it's
up:

```bash
curl -s http://localhost:3001 -o /dev/null -w "%{http_code}\n"   # should print 200
```

**Known gotcha, already fixed in `qe.Dockerfile`:** `packages/component-library`'s
`package.json` maps CSS imports to lowercase `src/themes/*.css`, but the directory on disk
is `src/Themes/` (capital T). That's silently tolerated on macOS's default case-insensitive
filesystem but breaks Vite module resolution on this case-sensitive Linux image — surfaces
as `Failed to resolve import "...themes/dark.css?inline"` in `docker compose logs`.
`qe.Dockerfile` works around it with `RUN ln -s Themes packages/component-library/src/themes`;
no source files are modified. If you ever see that error, this symlink is the first thing
to check.

To stop the container: `docker compose -f docker-compose.qe.yml down`.

## Verify the setup

```bash
node -v      # v22.18.0
yarn -v      # 4.17.1
docker info  # should succeed, not error
git branch --show-current   # qe-takehome/e2e-budget-transactions
curl -s http://localhost:3001 -o /dev/null -w "%{http_code}\n"   # 200
```
