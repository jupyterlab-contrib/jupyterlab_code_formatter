#!/bin/bash

set -euxo pipefail

pip install -e .
jupyter labextension develop . --overwrite
jlpm run build
