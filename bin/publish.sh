#!/usr/bin/env sh

source bin/pre-publish-check.sh
cd $LABEXTENSION_PATH
npm publish --access public
cd $SERVEREXTENSION_PATH
PYTHONPATH="" poetry build
PYTHONPATH="" poetry publish
git tag -a "${PUBLISH_VERSION}" -m "${PUBLISH_VERSION}"
git push origin --tags
