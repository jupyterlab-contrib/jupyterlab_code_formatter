#!/bin/bash

set -euxo pipefail

BASE_DIR="$(git rev-parse --show-toplevel)"

docker run --entrypoint bash \
  -it \
  -p 8011:8011 \
  -v ${BASE_DIR}:/host \
  --rm \
  jupyterlab-code-formatter-dev \
  $@
