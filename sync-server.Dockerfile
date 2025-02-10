FROM node:18-bookworm as base
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
COPY .yarn ./.yarn
COPY yarn.lock packages/sync-server/package.json .yarnrc.yml ./

# Working here - this should work - will need to do it for the stable docker images too

# First install everything for the build process
RUN yarn worksapces focus --all
# Then build the browser
RUN yarn build:browser
# Then cleanup the node_modules by installing only what we to run the server
RUN yarn workspaces focus actual-sync --production

FROM node:18-bookworm-slim as prod
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
