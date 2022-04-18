#!/bin/bash

set -euxo pipefail

git subtree push --prefix docs origin gh-pages
