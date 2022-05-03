FROM node:16-bullseye as base
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
ENV NODE_ENV=production
ADD yarn.lock package.json ./
RUN npm rebuild bcrypt --build-from-source
RUN yarn install --production

FROM node:16-bullseye-slim as prod
RUN apt-get update && apt-get install openssl tini && apt-get clean -y && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=base /app /app
ADD . .
ENTRYPOINT ["/usr/bin/tini","-g",  "--"]
CMD ["node", "app.js"]
