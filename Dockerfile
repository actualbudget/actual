# base node image
FROM node:16-bullseye as base

RUN apt-get update && apt-get install -y openssl

RUN mkdir /app
WORKDIR /app
ENV NODE_ENV=production

ADD . .

RUN yarn install --production
RUN mkdir ./server-files
RUN mkdir ./user-files

CMD ["yarn", "start"]
