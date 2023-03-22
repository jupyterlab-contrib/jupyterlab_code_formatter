#!/bin/bash

set -euxo pipefail

pip install -e .
jupyter labextension develop . --overwrite
jupyter server extension enable jupyterlab_code_formatter
jlpm run build
