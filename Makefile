.ONESHELL:
.SHELLFLAGS = -ec
.PHONY: help dev-install remove-dev-env
SHELL := /bin/bash
.DEFAULT_GOAL: help

help:
	@awk -F ':|##' '/^[^\t].+?:.*?##/ {\
	printf "\033[36m%-30s\033[0m %s\n", $$1, $$NF \
	}' $(MAKEFILE_LIST)


conda-install:  ## Use conda to install dev dependencies using unpinned env specification
	conda env create -f environment.yml --force --name jupyterlab_code_formatter

conda-freeze:  ## Use conda to freeze the current env available
	conda env export | grep -v prefix: > environment-frozen.yml

conda-install-frozen:  ## Use conda to install dev dependencies using pinned env specification - subject to repodata.json changes
	conda env create -f environment-frozen.yml --force --name jupyterlab_code_formatter

dev-install:
	pip install -e .
	jupyter labextension develop . --overwrite
	jlpm run build

dev-watch-labextension:  ## Recompile labextension on changes
	npm run watch

lint:  # Run linters
	find jupyterlab_code_formatter -name '*.py' | xargs black --check
	npm run lint

format:  # Run formatters
	find jupyterlab_code_formatter -name '*.py' | xargs black
	npm run format

install:
	jlpm install
	python -m pip install .

test:  # Run test
	pytest $(SERVEREXTENSION_PATH)
	jupyter server extension list 2>&1 | grep -ie "jupyterlab_code_formatter.*OK"
	jupyter labextension list 2>&1 | grep -ie "@ryantam626/jupyterlab_code_formatter.*OK"
	python -m jupyterlab.browser_check

publish:  # Publish
	bin/publish.sh
