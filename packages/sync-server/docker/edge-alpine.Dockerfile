FROM alpine:3.18 AS base
RUN apk add --no-cache nodejs yarn python3 openssl build-base
WORKDIR /app

RUN if [ "$(uname -m)" = "armv7l" ]; then yarn config set taskPoolConcurrency 2; yarn config set networkConcurrency 5; fi

# Copying workspace so @actual-app/web can be built
COPY .yarn ./.yarn
COPY yarn.lock package.json .yarnrc.yml ./
COPY packages ./packages

# Installing dependencies in production mode (including the @actual-app/web in the workspace)
RUN if [ "$(uname -m)" = "armv7l" ]; then npm_config_build_from_source=true yarn workspaces focus @actual-app/sync-server --production; else yarn workspaces focus @actual-app/sync-server --production; fi

# Yarn uses symbolic links to reference workspace packages, remove link to @actual-app/web and copy it manually so we don't need the /packages dir
RUN rm ./node_modules/@actual-app/web ./node_modules/@actual-app/sync-server
COPY packages/desktop-client/package.json ./node_modules/@actual-app/web/package.json
COPY packages/desktop-client/build ./node_modules/@actual-app/web/build

FROM alpine:3.18 AS prod
RUN apk add --no-cache nodejs tini

ARG USERNAME=actual
ARG USER_UID=1001
ARG USER_GID=$USER_UID
RUN addgroup -S ${USERNAME} -g ${USER_GID} && adduser -S ${USERNAME} -G ${USERNAME} -u ${USER_UID}
RUN mkdir /data && chown -R ${USERNAME}:${USERNAME} /data

WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules /app/node_modules
COPY /packages/sync-server/package.json /packages/sync-server/app.js ./
COPY /packages/sync-server/src ./src
COPY /packages/sync-server/migrations ./migrations
ENTRYPOINT ["/sbin/tini","-g",  "--"]
EXPOSE 5006
CMD ["node", "app.js"]
