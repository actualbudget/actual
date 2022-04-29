#!/bin/sh -e
if [ -d "/Users/james/projects/electron-builder" ]; then
  electron-builder  
  # NODE_PATH=/Users/james/projects/electron-builder/packages \
  #          ~/projects/electron-builder/packages/electron-builder/out/cli/cli.js $@
else
  NODE_PATH=/c/Users/User/electron-builder/packages \
           node /c/Users/User/electron-builder/packages/electron-builder/out/cli/cli.js $@
fi
