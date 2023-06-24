#!/bin/bash -e

ROOT=`dirname $0`
VERSION=""
RELEASE=""
CI=${CI:-false}

cd "$ROOT/.."

POSITIONAL=()
while [[ $# -gt 0 ]]; do
  key="$1"

  case $key in
      --version)
      VERSION="$2"
      shift
      shift
      ;;
      --beta)
      RELEASE="beta"
      shift
      ;;
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

if [ -z "$VERSION" ] && [ -n "$RELEASE" ]; then
    echo "Version is required if making a release"
    exit 1
fi

if [ -n "$RELEASE" ]; then
    read -p "Deploy release for browser: $RELEASE v$VERSION? [y/N] " -r
    if [ -z "$REPLY" ] || [ "$REPLY" != "y" ]; then
        exit 2
    fi

    PACKAGE_VERSION=`node -p -e "require('./packages/desktop-electron/package.json').version"`
    if [ "$VERSION" != "$PACKAGE_VERSION" ] && [ "$VERSION-next" != "$PACKAGE_VERSION" ]; then
        echo "Version in desktop-electron/package.json does not match given version! ($PACKAGE_VERSION)"
        exit 4
    fi
fi

# There's no need to check linting in CI as it'll be done in a different step.
if [ $CI != true ]; then
    yarn lint
fi

ACTUAL_RELEASE_TYPE=$RELEASE yarn workspace loot-core build:browser

REACT_APP_RELEASE_TYPE=$RELEASE yarn workspace @actual-app/web build:browser

echo "packages/desktop-client/build"
