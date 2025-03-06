FROM node:18-bookworm AS base
RUN apt-get update && apt-get install -y openssl
# jq
WORKDIR /app
COPY .yarn ./.yarn
COPY yarn.lock package.json .yarnrc.yml tsconfig.json ./

# Copying workspace so @actual-app/web can be built
COPY ./bin/package-browser ./bin/package-browser
COPY ./packages/ ./packages/

# Building @actual-app/web
RUN yarn install
RUN yarn build:browser
# RUN ./bin/package-browser

RUN if [ "$(uname -m)" = "armv7l" ]; then yarn config set taskPoolConcurrency 2; yarn config set networkConcurrency 5; fi

# Installing dependencies in production mode (including the @actual-app/web built above)
RUN yarn workspaces focus @actual-app/sync-server --production

# Yarn uses symbolic links to reference workspace packages, remove link to @actual-app/web and copy it manually so we don't need the /packages dir
RUN rm ./node_modules/@actual-app/web ./node_modules/@actual-app/sync-server
COPY ./packages/desktop-client/package.json ./node_modules/@actual-app/web/package.json
RUN echo $(ls -1 ./packages/desktop-client/)

RUN cp ./packages/desktop-client/build ./node_modules/@actual-app/web/build
# COPY ./packages/desktop-client/build ./node_modules/@actual-app/web/build

# RUN mkdir /public
# COPY artifacts.json /tmp/artifacts.json
# RUN jq -r '[.artifacts[] | select(.workflow_run.head_branch == "master" and .workflow_run.head_repository_id == .workflow_run.repository_id)][0]' /tmp/artifacts.json > /tmp/latest-build.json

# ARG GITHUB_TOKEN
# RUN curl -L -o /tmp/desktop-client.zip --header "Authorization: Bearer ${GITHUB_TOKEN}" $(jq -r '.archive_download_url' /tmp/latest-build.json)
# RUN unzip /tmp/desktop-client.zip -d /public

FROM node:18-bookworm-slim AS prod
RUN apt-get update && apt-get install tini && apt-get clean -y && rm -rf /var/lib/apt/lists/*

ARG USERNAME=actual
ARG USER_UID=1001
ARG USER_GID=$USER_UID
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME
RUN mkdir /data && chown -R ${USERNAME}:${USERNAME} /data

WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules /app/node_modules
# COPY --from=base /public /public
COPY /packages/sync-server/package.json /packages/sync-server/app.js ./
COPY /packages/sync-server/src ./src
COPY /packages/sync-server/migrations ./migrations
ENTRYPOINT ["/usr/bin/tini","-g",  "--"]
# ENV ACTUAL_WEB_ROOT=/public
EXPOSE 5006
CMD ["node", "app.js"]
