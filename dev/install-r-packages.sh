#!/bin/bash

set -euxo pipefail

R --vanilla -e 'install.packages("formatR", repos = "http://cran.us.r-project.org")'
R --vanilla -e 'install.packages("styler", repos = "http://cran.us.r-project.org")'
