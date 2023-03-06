FROM node:16-bullseye as base
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
ADD .yarn ./.yarn
ADD yarn.lock package.json .yarnrc.yml ./
RUN yarn workspaces focus --all --production

FROM node:16-bullseye as frontend
WORKDIR /frontend
# Rebuild whenever there are new commits to the frontend
ADD "https://api.github.com/repos/actualbudget/actual/commits" /tmp/actual-commit.json
RUN git clone --depth=1 https://github.com/actualbudget/actual /frontend
RUN yarn install
RUN ./bin/package-browser

FROM node:16-bullseye-slim as prod
RUN apt-get update && apt-get install tini && apt-get clean -y && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=base /app/node_modules /app/node_modules
COPY --from=frontend /frontend/packages/desktop-client/build /public
ADD package.json app.js ./
ADD src ./src
ENTRYPOINT ["/usr/bin/tini","-g",  "--"]
ENV ACTUAL_WEB_ROOT=/public
EXPOSE 5006
CMD ["node", "app.js"]
