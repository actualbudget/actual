#!/bin/bash -e

VERSION=""

POSITIONAL=()
while [[ $# -gt 0 ]]; do
  key="$1"

  case $key in
      --version)
      VERSION="$2"
      shift
      shift
      ;;
      *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done
set -- "${POSITIONAL[@]}"

NOTES="$@"

if [ -z "$VERSION" ]; then
    echo "--version is required";
    exit 1
fi

echo "Version: $VERSION"
echo "Notes: $NOTES"
read -p "Make release? [y/N] " -r
if [ -z "$REPLY" ] || [ "$REPLY" != "y" ]; then
    exit 2
fi

source ./.secret-tokens

# Tag and push to make windows and linux versions
git push origin master
git tag -a "$VERSION" -m "$NOTES"
git push origin "$VERSION"

# Make a macOS version
./bin/package-electron --release --version "$VERSION"

# TODO: browser version

# Finally, update github issues
curl -X POST -H "x-release-token: $RELEASE_TOKEN"  https://actual-automoto.fly.dev/release/"$VERSION"
