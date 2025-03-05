FROM node:18-bookworm AS base
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
COPY .yarn ./.yarn
COPY yarn.lock package.json .yarnrc.yml tsconfig.json ./

RUN if [ "$(uname -m)" = "armv7l" ]; then yarn config set taskPoolConcurrency 2; yarn config set networkConcurrency 5; fi

# Copying workspace so @actual-app/web can be built
COPY ./bin/package-browser ./bin/package-browser
COPY ./packages/$BUILD_CONTEXT/ ./packages/$BUILD_CONTEXT/

# Building @actual-app/web
RUN yarn install
RUN yarn build:browser

# Installing dependencies in production mode (including the @actual-app/web built above)
RUN yarn workspaces focus @actual-app/sync-server --production

# Yarn uses symbolic links to reference workspace packages, remove link to @actual-app/web and copy it manually so we don't need the /packages dir
RUN rm ./node_modules/@actual-app/web ./node_modules/@actual-app/sync-server
COPY ./packages/desktop-client/package.json ./node_modules/@actual-app/web/package.json
COPY ./packages/desktop-client/build ./node_modules/@actual-app/web/build

FROM node:18-bookworm-slim AS prod
RUN apt-get update && apt-get install tini && apt-get clean -y && rm -rf /var/lib/apt/lists/*

ARG USERNAME=actual
ARG USER_UID=1001
ARG USER_GID=$USER_UID
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME
RUN mkdir /data && chown -R ${USERNAME}:${USERNAME} /data

WORKDIR /app
ENV NODE_ENV production
COPY --from=base /app/node_modules /app/node_modules
COPY /packages/sync-server/package.json /packages/sync-server/app.js ./
COPY /packages/sync-server/src ./src
COPY /packages/sync-server/migrations ./migrations
ENTRYPOINT ["/usr/bin/tini","-g",  "--"]
EXPOSE 5006
CMD ["node", "app.js"]
