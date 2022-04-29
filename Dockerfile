# base node image
FROM node:16-bullseye-slim as base

RUN apt-get update && apt-get install -y openssl

RUN mkdir /app
WORKDIR /app
ENV NODE_ENV=production

RUN yarn install --production

ADD . .

CMD ["yarn", "start"]