#!/bin/bash

set -euxo pipefail

jupyter lab --watch --allow-root --ip 0.0.0.0 --port 8011 --NotebookApp.token='' --NotebookApp.password=''
