FROM alpine:3.17 as base
RUN apk add --no-cache nodejs yarn npm python3 openssl build-base jq curl
WORKDIR /app
ADD .yarn ./.yarn
ADD yarn.lock package.json .yarnrc.yml ./
RUN yarn workspaces focus --all --production
RUN if [ "$(uname -m)" = "armv7l" ]; then npm install bcrypt better-sqlite3 --build-from-source; fi

RUN mkdir /public
ADD "https://api.github.com/repos/actualbudget/actual/actions/artifacts?name=actual-web&per_page=100" /tmp/artifacts.json
RUN jq -r '[.artifacts[] | select(.workflow_run.head_branch == "master")][0]' /tmp/artifacts.json > /tmp/latest-build.json

ARG GITHUB_TOKEN
RUN curl -L -o /tmp/desktop-client.zip --header "Authorization: Bearer ${GITHUB_TOKEN}" $(jq -r '.archive_download_url' /tmp/latest-build.json)
RUN unzip /tmp/desktop-client.zip -d /public

FROM alpine:3.17 as prod
RUN apk add --no-cache nodejs tini
WORKDIR /app
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /public /public
ADD package.json app.js ./
ADD src ./src
ENTRYPOINT ["/sbin/tini","-g",  "--"]
ENV ACTUAL_WEB_ROOT=/public
EXPOSE 5006
CMD ["node", "app.js"]
