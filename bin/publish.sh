#!/usr/bin/env sh

source bin/pre-publish-check.sh
cd $LABEXTENSION_PATH
npm publish --access public
cd $SERVEREXTENSION_PATH
python setup.py sdist
twine upload dist/jupyterlab_code_formatter-"${PUBLISH_VERSION/v/}".tar.gz
git tag -a "${PUBLISH_VERSION}" -m "${PUBLISH_VERSION}"
git push origin --tags
