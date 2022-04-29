#!/bin/sh

find ../loot-core \
     -not -ipath '*src/client*' \
     -not -ipath '*src/bin*' \
     -not -ipath '*tests*' \
     -not -iname '*.test.js' \
     -not -iname '.#*' |
    xargs ../../node_modules/.bin/babel --plugins babel-plugin-transform-es2015-modules-commonjs,babel-plugin-transform-object-rest-spread --no-babelrc -d lib-node
