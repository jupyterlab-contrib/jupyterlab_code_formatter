#!/bin/bash

set -euxo pipefail

find /plugin/jupyterlab_code_formatter -name '*.py' | xargs isort --profile black
find /plugin/jupyterlab_code_formatter -name '*.py' | xargs black --line-length 110
yarn run prettier
