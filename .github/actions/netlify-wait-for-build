#!/bin/bash

current_commit=$(git rev-parse HEAD)

echo "Running on commit $COMMIT_SHA"

function get_status() {
  echo "::group::API Response"
  curl --header "Authorization: Bearer $GITHUB_TOKEN" "https://api.github.com/repos/actualbudget/actual/commits/$COMMIT_SHA/statuses" > /tmp/status.json
  cat /tmp/status.json
  echo "::endgroup::"
  netlify=$(jq '[.[] | select(.context == "netlify/actualbudget/deploy-preview")][0]' /tmp/status.json)
  state=$(jq -r '.state' <<< "$netlify")
  echo "::group::Netlify Status"
  echo "$netlify"
  echo "::endgroup::"
}

get_status

while [ "$netlify" == "null" ]; do
  echo "Waiting for Netlify to start building..."
  sleep 10
  get_status
done

while [ "$state" == "pending" ]; do
  echo "Waiting for Netlify to finish building..."
  sleep 10
  get_status
done

if [ "$state" == "success" ]; then
  echo -e "\033[0;32mNetlify build succeeded!\033[0m"
  jq -r '"url=" + .target_url' <<< "$netlify" > $GITHUB_OUTPUT
  exit 0
else
  echo -e "\033[0;31mNetlify build failed. Cancelling end-to-end tests.\033[0m"
  exit 1
fi
