FROM alpine:3.17 as base
RUN apk add --no-cache nodejs yarn npm python3 openssl build-base
WORKDIR /app
ADD .yarn ./.yarn
ADD yarn.lock package.json .yarnrc.yml ./
RUN yarn workspaces focus --all --production

# Since we’re just using static files, use the Ubuntu image to build the frontend
# (otherwise electron fails to build)
FROM node:16-bullseye as frontend
WORKDIR /frontend
# Rebuild whenever there are new commits to the frontend
ADD "https://api.github.com/repos/actualbudget/actual/commits" /tmp/actual-commit.json
RUN git clone --depth=1 https://github.com/actualbudget/actual /frontend
RUN yarn install
RUN ./bin/package-browser

FROM alpine:3.17 as prod
RUN apk add --no-cache nodejs tini
WORKDIR /app
COPY --from=base /app/node_modules /app/node_modules
COPY --from=frontend /frontend/packages/desktop-client/build /public
ADD package.json app.js ./
ADD src ./src
ENTRYPOINT ["/sbin/tini","-g",  "--"]
ENV ACTUAL_WEB_ROOT=/public
EXPOSE 5006
CMD ["node", "app.js"]
