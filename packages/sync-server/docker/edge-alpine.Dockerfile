FROM alpine:3.18 AS base
RUN apk add --no-cache nodejs yarn npm python3 openssl build-base jq curl
WORKDIR /app
COPY .yarn ./.yarn
COPY yarn.lock package.json .yarnrc.yml ./
RUN if [ "$(uname -m)" = "armv7l" ]; then yarn config set taskPoolConcurrency 2; yarn config set networkConcurrency 5; fi
RUN yarn workspaces focus --all --production
RUN if [ "$(uname -m)" = "armv7l" ]; then npm install bcrypt better-sqlite3 --build-from-source; fi

RUN mkdir /public
COPY artifacts.json /tmp/artifacts.json
RUN jq -r '[.artifacts[] | select(.workflow_run.head_branch == "master" and .workflow_run.head_repository_id == .workflow_run.repository_id)][0]' /tmp/artifacts.json > /tmp/latest-build.json

ARG GITHUB_TOKEN
RUN curl -L -o /tmp/desktop-client.zip --header "Authorization: Bearer ${GITHUB_TOKEN}" $(jq -r '.archive_download_url' /tmp/latest-build.json)
RUN unzip /tmp/desktop-client.zip -d /public

FROM alpine:3.18 AS prod
RUN apk add --no-cache nodejs tini

ARG USERNAME=actual
ARG USER_UID=1001
ARG USER_GID=$USER_UID
RUN addgroup -S ${USERNAME} -g ${USER_GID} && adduser -S ${USERNAME} -G ${USERNAME} -u ${USER_UID}
RUN mkdir /data && chown -R ${USERNAME}:${USERNAME} /data

WORKDIR /app
ENV NODE_ENV production
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /public /public
COPY package.json app.js ./
COPY src ./src
COPY migrations ./migrations
ENTRYPOINT ["/sbin/tini","-g",  "--"]
ENV ACTUAL_WEB_ROOT=/public
EXPOSE 5006
CMD ["node", "app.js"]
