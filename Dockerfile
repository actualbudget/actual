FROM node:16-bullseye as base
RUN apt-get update -y && apt-get upgrade -y && apt-get install -y openssl
WORKDIR /app
COPY .yarn ./.yarn
COPY yarn.lock package.json .yarnrc.yml ./
COPY . .
RUN yarn
CMD ["tail", "-f", "/dev/null"]