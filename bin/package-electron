#!/bin/bash -e


ROOT=`dirname $0`
RELEASE=""
RELEASE_NOTES="" # TODO: figure out automation for release notes when we start publishing electron versions
CI=${CI:-false}

cd "$ROOT/.."

POSITIONAL=()
while [[ $# -gt 0 ]]; do
  key="$1"

  case $key in
      --release)
      RELEASE="production"
      shift
      ;;
      *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done
set -- "${POSITIONAL[@]}"

if [ "$OSTYPE" == "msys" ]; then
    if [ $CI != true ]; then
        read -s -p "Windows certificate password: " -r CSC_KEY_PASSWORD
        export CSC_KEY_PASSWORD
    elif [ -n "$CIRCLE_TAG" ]; then
        # We only want to run this on CircleCI as Github doesn't have the CSC_KEY_PASSWORD secret set.
        certutil -f -p ${CSC_KEY_PASSWORD} -importPfx ~/windows-shift-reset-llc.p12
    fi
fi

yarn patch-package

yarn rebuild-electron

yarn workspace loot-core build:node

yarn workspace @actual-app/web build

yarn workspace desktop-electron update-client

(
    cd packages/desktop-electron;
    yarn clean;

    export npm_config_better_sqlite3_binary_host="https://static.actualbudget.com/prebuild/better-sqlite3"

    if [ "$RELEASE" == "production" ]; then
        if [ -f ../../.secret-tokens ]; then
            source ../../.secret-tokens
        fi
        yarn build --publish always -c.releaseInfo.releaseNotes="$RELEASE_NOTES" --arm64 --x64

        echo "\nCreated release with release notes \"$RELEASE_NOTES\""
    else
        SKIP_NOTARIZATION=true yarn build --publish never --x64
    fi
)
