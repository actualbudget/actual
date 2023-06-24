#!/bin/sh -e

ROOT=$(cd "`dirname $0`"; pwd)
NPM_NAME="$1"
NAME="$2"
PACKAGE_DIR="`dirname "$ROOT"`/packages/$NAME"

if [ -z "$NAME" ] || [ -z "$NPM_NAME" ]; then
    echo "Usage: `basename $0` <npm-name> <local-name>"
    exit 1
fi

if [ -d "$PACKAGE_DIR" ]; then
    read -p "Package exists, remove $PACKAGE_DIR? [y/N] " -r
    if [ -z "$REPLY" ] || [ "$REPLY" != "y" ]; then
        exit 2
    fi
fi

rm -rf "$PACKAGE_DIR"
URL="`npm view "$NPM_NAME" dist.tarball`"
TMPDIR="`mktemp -d`"

cd "$TMPDIR"
wget -O tar.tgz "$URL"
tar xvzf tar.tgz
mv package "$PACKAGE_DIR"
