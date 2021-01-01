#!/usr/bin/env bash

LABEXTENSION_VERSION=$(cat package.json | jq -r '.version')
CHANGELOG_VERSION=$(awk 'match($0, /(.*) [0-9]{4}-[0-9]{2}-[0-9]{2}/, a) {print a[1]}' docs/changelog.rst | head -n 1)
HARDCODED_LABEXTENSION_CLIENT_VERSION=$(grep "PLUGIN_VERSION" -- ${LABEXTENSION_PATH}/constants.ts | awk -F"'" '{ print $2 }')

versions=( $LABEXTENSION_VERSION $CHANGELOG_VERSION $HARDCODED_LABEXTENSION_CLIENT_VERSION )
unique_versions_count=$(echo ${versions[@]} | tr ' ' '\n' | uniq | wc -l)
if [ "${unique_versions_count}" = 1 ] \
  && [ ! -z "${LABEXTENSION_VERSION}" ] \
  && [ ! -z "${CHANGELOG_VERSION}" ] \
  && [ ! -z "${HARDCODED_LABEXTENSION_CLIENT_VERSION}" ]
then
   echo "Versions seem fine."
   export PUBLISH_VERSION="v${CHANGELOG_VERSION}"
else
   echo "Versions don't match."
   echo "Lab extension version:    ${LABEXTENSION_VERSION}"
   echo "Latest changelog version: ${CHANGELOG_VERSION}"
   echo "Lab extension client hardcoded version: ${HARDCODED_LABEXTENSION_CLIENT_VERSION}"
   exit 1
fi
