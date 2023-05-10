FROM node:16-bullseye as base
RUN apt-get update && apt-get upgrade && apt-get install -y openssl
WORKDIR /app
ADD .yarn ./.yarn
ADD yarn.lock package.json .yarnrc.yml ./
RUN yarn install
COPY . .
CMD ["yarn", "start:browser"]