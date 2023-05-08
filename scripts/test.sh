#!/bin/bash

set -euxo pipefail

pytest /plugin
jupyter server extension list
jupyter server extension list 2>&1 | grep -ie "jupyterlab_code_formatter.*OK"
jupyter labextension list
jupyter labextension list 2>&1 | grep -ie "jupyterlab_code_formatter.*OK"
python -m jupyterlab.browser_check --allow-root

