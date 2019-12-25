#!/usr/bin/env sh

SERVEREXTENSION_VERSION=$(grep "^version" -- ${SERVEREXTENSION_PATH}/pyproject.toml | awk -F'[" ]' '{print $4}')
LABEXTENSION_VERSION=$(cat ${LABEXTENSION_PATH}/package.json | jq -r '.version')
LABEXTENSION_LOCKED_VERSION=$(cat ${LABEXTENSION_PATH}/package-lock.json | jq -r '.version')
CHANGELOG_VERSION=$(awk 'match($0, /(.*) [0-9]{4}-[0-9]{2}-[0-9]{2}/, a) {print a[1]}' docs/changelog.rst | head -n 1)
HARDCODED_LABEXTENSION_CLIENT_VERSION=$(awk 'match($0, /\047Plugin-Version\047: \047(.*)\047/, a) {print a[1]}' ${LABEXTENSION_PATH}/src/client.ts)

versions=( $SERVEREXTENSION_VERSION $LABEXTENSION_VERSION $LABEXTENSION_LOCKED_VERSION $CHANGELOG_VERSION $HARDCODED_LABEXTENSION_CLIENT_VERSION )
unique_versions_count=$(echo ${versions[@]} | tr ' ' '\n' | uniq | wc -l)
if [ "${unique_versions_count}" = 1 ]
then
   echo "Versions seem fine."
   export PUBLISH_VERSION="v${CHANGELOG_VERSION}"
else
   echo "Versions don't match."
   echo "Server extension version: ${SERVEREXTENSION_VERSION}"
   echo "Lab extension version:    ${LABEXTENSION_VERSION}"
   echo "Lab extension lock version:    ${LABEXTENSION_LOCKED_VERSION}"
   echo "Latest changelog version: ${CHANGELOG_VERSION}"
   echo "Lab extension client hardcoded version: ${HARDCODED_LABEXTENSION_CLIENT_VERSION}"
   exit 1
fi
