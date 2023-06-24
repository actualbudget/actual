#!/bin/sh

#####################################################
# This startup script is used by the docker container
# to check if the node_modules folder is empty and
# if so, run yarn to install the dependencies.
#####################################################

if [ ! -d "node_modules" ] || [ "$(ls -A node_modules)" = "" ]; then
    yarn
fi

yarn start:browser
