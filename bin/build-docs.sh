#!/usr/bin/env sh

case "$1" in
  watch)
    rm -rf docs/ &&
    python3 -m sphinx -a -b html docs_src docs &&
    touch docs/.nojekyll &&
    inotifywait -m docs -e modify docs |
    while read path action file; do
      python3 -m sphinx -W --keep-going -a -b html docs_src docs
      touch docs/.nojekyll
    done
    ;;

  *)
    python3 -m sphinx -W --keep-going -a -b html docs_src docs
    touch docs/.nojekyll
    ;;
esac
