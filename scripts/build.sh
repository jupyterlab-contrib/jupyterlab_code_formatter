#!/bin/bash

set -euxo pipefail

rm -rf dist/*
rm -rf /plugin/jupyterlab_code_formatter/labextension
hatch build
