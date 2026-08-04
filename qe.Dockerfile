###################################################
# QE take-home only — not part of upstream. Copies the
# repo into the image instead of bind-mounting, so
# platform-specific native modules (better-sqlite3,
# esbuild) are built for the container, not the host.
###################################################

FROM node:22-bookworm
RUN apt-get update -y && apt-get upgrade -y && apt-get install -y openssl
WORKDIR /app
COPY . .
RUN corepack enable && yarn install
# Case-sensitivity workaround: package.json exports map to lowercase
# 'src/themes/*.css' but the directory on disk is 'src/Themes/'. That's
# silently tolerated on macOS's case-insensitive filesystem (where this repo
# is usually developed) but breaks Vite's module resolution here, since this
# image is built on case-sensitive Linux.
RUN ln -s Themes packages/component-library/src/themes
EXPOSE 3001
CMD ["sh", "-c", "BROWSER=0 yarn start:browser"]
