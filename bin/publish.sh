#!/usr/bin/env bash

set -euxo pipefail

TMP_DIR=npm-tmp

source bin/pre-publish-check.sh
mkdir -p $TMP_DIR
pushd $TMP_DIR
npm pack ../
npm publish ryantam626-jupyterlab_code_formatter-"${PUBLISH_VERSION/v/}".tgz --access public
popd
python setup.py sdist
twine upload dist/jupyterlab_code_formatter-"${PUBLISH_VERSION/v/}".tar.gz
python setup.py bdist_wheel
twine upload dist/jupyterlab_code_formatter-"${PUBLISH_VERSION/v/}"-py3-none-any.whl
git tag -a "${PUBLISH_VERSION}" -m "${PUBLISH_VERSION}"
git push origin --tags
