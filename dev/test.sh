#!/bin/bash

set -euxo pipefail

pytest /host/jupyterlab_code_formatter
jupyter server extension list 2>&1 | grep -ie "jupyterlab_code_formatter.*OK"
jupyter labextension list 2>&1 | grep -ie "@ryantam626/jupyterlab_code_formatter.*OK"
python -m jupyterlab.browser_check

