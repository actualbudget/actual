#!/bin/sh

rm */*.js
yarn svgr --expand-props start --ext js -d . .
