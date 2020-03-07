#!/usr/bin/env bash

SERVEREXTENSION_VERSION=$(grep "version" -- ${SERVEREXTENSION_PATH}/setup.py | awk -F'"' '{ print $2 }')
LABEXTENSION_VERSION=$(cat ${LABEXTENSION_PATH}/package.json | jq -r '.version')
LABEXTENSION_LOCKED_VERSION=$(cat ${LABEXTENSION_PATH}/package-lock.json | jq -r '.version')
CHANGELOG_VERSION=$(awk 'match($0, /(.*) [0-9]{4}-[0-9]{2}-[0-9]{2}/, a) {print a[1]}' docs/changelog.rst | head -n 1)
HARDCODED_LABEXTENSION_CLIENT_VERSION=$(grep "PLUGIN_VERSION" -- ${LABEXTENSION_PATH}/src/constants.ts | awk -F"'" '{ print $2 }')

versions=( $SERVEREXTENSION_VERSION $LABEXTENSION_VERSION $LABEXTENSION_LOCKED_VERSION $CHANGELOG_VERSION $HARDCODED_LABEXTENSION_CLIENT_VERSION )
unique_versions_count=$(echo ${versions[@]} | tr ' ' '\n' | uniq | wc -l)
if [ "${unique_versions_count}" = 1 ] \
  && [ ! -z "${LABEXTENSION_LOCKED_VERSION}" ] \
  && [ ! -z "${LABEXTENSION_VERSION}" ] \
  && [ ! -z "${CHANGELOG_VERSION}" ] \
  && [ ! -z "${HARDCODED_LABEXTENSION_CLIENT_VERSION}" ]
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
