FROM alpine as base
RUN apk add --no-cache nodejs yarn npm python3 openssl build-base
WORKDIR /app
ENV NODE_ENV=production
ADD yarn.lock package.json ./
RUN npm rebuild bcrypt --build-from-source
RUN yarn install --production

FROM alpine as prod
RUN apk add --no-cache nodejs yarn openssl tini
WORKDIR /app
COPY --from=base /app /app
ADD . .
ENTRYPOINT ["/sbin/tini","-g",  "--"]
CMD ["node", "app.js"]
