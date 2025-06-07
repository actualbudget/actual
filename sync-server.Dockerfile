FROM node:20-bookworm AS deps

# Install required packages
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

# Copy only the files needed for installing dependencies
COPY .yarn ./.yarn
COPY yarn.lock package.json .yarnrc.yml tsconfig.json ./
COPY packages/api/package.json packages/api/package.json
COPY packages/component-library/package.json packages/component-library/package.json
COPY packages/crdt/package.json packages/crdt/package.json
COPY packages/desktop-client/package.json packages/desktop-client/package.json
COPY packages/desktop-electron/package.json packages/desktop-electron/package.json
COPY packages/eslint-plugin-actual/package.json packages/eslint-plugin-actual/package.json
COPY packages/loot-core/package.json packages/loot-core/package.json
COPY packages/sync-server/package.json packages/sync-server/package.json

COPY ./bin/package-browser ./bin/package-browser

RUN yarn install

FROM deps AS builder

WORKDIR /app

COPY packages/ ./packages/
RUN yarn build:server

# Focus the workspaces in production mode (including @actual-app/web you just built)
RUN yarn workspaces focus @actual-app/sync-server --production

# Remove symbolic links for @actual-app/web and @actual-app/sync-server
RUN rm -rf ./node_modules/@actual-app/web ./node_modules/@actual-app/sync-server

# Copy in the @actual-app/web artifacts manually, so we don't need the entire packages folder
COPY ./packages/desktop-client/package.json ./node_modules/@actual-app/web/package.json
RUN cp -r ./packages/desktop-client/build ./node_modules/@actual-app/web/build

FROM node:20-bookworm-slim AS prod

# Minimal runtime dependencies
RUN apt-get update && apt-get install -y tini && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Create a non-root user
ARG USERNAME=actual
ARG USER_UID=1001
ARG USER_GID=$USER_UID
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && mkdir /data && chown -R ${USERNAME}:${USERNAME} /data

WORKDIR /app
ENV NODE_ENV=production

# Pull in only the necessary artifacts (built node_modules, server files, etc.)
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages/sync-server/package.json ./
COPY --from=builder /app/packages/sync-server/build ./build

ENTRYPOINT ["/usr/bin/tini", "-g", "--"]
EXPOSE 5006
CMD ["node", "build/app.js"]
