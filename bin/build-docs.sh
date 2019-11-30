#!/usr/bin/env sh

case "$1" in
  watch)
    rm -rf build/ &&
    python3 -m sphinx -a -b html docs build &&
    inotifywait -m docs -e modify docs |
    while read path action file; do
      python3 -m sphinx -W --keep-going -a -b html docs build
    done
    ;;

  *)
    python3 -m sphinx -W --keep-going -a -b html docs build
    ;;
esac
