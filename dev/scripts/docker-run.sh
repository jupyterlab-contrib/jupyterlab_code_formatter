#!/bin/bash

set -euxo pipefail

BASE_DIR="$(git rev-parse --show-toplevel)"

docker run --entrypoint bash \
  -it \
  -p 8011:8011 \
  -p 8012:8012 \
  -p 8013:8013 \
  -v ${BASE_DIR}:/host \
  -v ~/.gitconfig:/root/.gitconfig \
  --rm \
  jupyterlab-code-formatter-dev \
  $@
