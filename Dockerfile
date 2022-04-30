FROM alpine as base

RUN apk add --no-cache nodejs yarn openssl tini
RUN mkdir /app
WORKDIR /app
ENV NODE_ENV=production
ADD yarn.lock package.json ./
RUN yarn install --production

FROM alpine as prod

RUN apk add --no-cache nodejs yarn openssl tini
WORKDIR /app
COPY --from=base /app /app
ADD . .

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["yarn", "start"]
