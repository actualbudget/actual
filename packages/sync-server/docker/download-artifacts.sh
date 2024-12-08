#!/bin/bash

URL="https://api.github.com/repos/actualbudget/actual/actions/artifacts?name=actual-web&per_page=100"

if [ -n "$GITHUB_TOKEN" ]; then
  curl -L -o artifacts.json --header "Authorization: Bearer ${GITHUB_TOKEN}" $URL
else
  curl -L -o artifacts.json $URL
fi

if [ $? -ne 0 ]; then
  echo "Failed to download artifacts.json"
  exit 1
fi
