#!/usr/bin/env sh

SERVEREXTENSION_VERSION=$(grep "^version" -- ${SERVEREXTENSION_PATH}/pyproject.toml | awk -F'[" ]' '{print $4}')
LABEXTENSION_VERSION=$(cat ${LABEXTENSION_PATH}/package.json | jq -r '.version')
LABEXTENSION_LOCKED_VERSION=$(cat ${LABEXTENSION_PATH}/package-lock.json | jq -r '.version')
CHANGELOG_VERSION=$(awk 'match($0, /(.*) [0-9]{4}-[0-9]{2}-[0-9]{2}/, a) {print a[1]}' docs/changelog.rst | head -n 1)


if [ "${SERVEREXTENSION_VERSION}" = "${LABEXTENSION_VERSION}" ] && [ "${LABEXTENSION_VERSION}" = "${CHANGELOG_VERSION}" ] && [ "${LABEXTENSION_VERSION}" = "${LABEXTENSION_LOCKED_VERSION}" ];
then
   echo "Versions seem fine."
else
   echo "Versions don't match."
   echo "Server extension version: ${SERVEREXTENSION_VERSION}"
   echo "Lab extension version:    ${LABEXTENSION_VERSION}"
   echo "Latest changelog version: ${CHANGELOG_VERSION}"
   exit 1
fi
