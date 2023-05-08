```{toctree}
:hidden:

installation.md
usage.md
configuration.md
custom-formatter.md
faq.md
jupyterhub.md
changelog.md
dev.md
your-support.md

```

# JupyterLab Code Formatter

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/ryantam626/jupyterlab_code_formatter/master?urlpath=lab)
[![npm version](https://badge.fury.io/js/%40ryantam626%2Fjupyterlab_code_formatter.svg)](https://badge.fury.io/js/%40ryantam626%2Fjupyterlab_code_formatter)
[![npm downloads](https://img.shields.io/npm/dw/%40ryantam626%2Fjupyterlab_code_formatter.svg)](https://badge.fury.io/js/%40ryantam626%2Fjupyterlab_code_formatter)
[![code style](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/ambv/black)
[![Github Actions Status](https://github.com/ryantam626/jupyterlab_code_formatter/workflows/CI/badge.svg)](https://github.com/ryantam626/jupyterlab_code_formatter/actions)

*A JupyterLab plugin to facilitate invocation of code formatters.*

**Source Code**: [GitHub](https://github.com/ryantam626/jupyterlab_code_formatter/).

## Demo

![format-all](_static/format-all.gif)

## Requirements

- Python 3.6+
- JupyterLab >= 3.0.0
- Any supported code formatters (you can also specify your own, see [custom formatter](custom-formatter.md)).

:::{important}
JupyterLab Code Formatter only provides an interface for invoking code formatters on Jupyter Server, and does not include any code formatter by default.
:::

## Quick Start

[//]: # (TODO: Add tab for common package managers)

1. **Install the package**
````{tab} Pip
```bash
pip install jupyterlab-code-formatter
```
````

````{tab} Conda
```bash
conda install -c conda-forge jupyterlab_code_formatter
```
````

````{tab} Poetry
```bash
poetry add jupyterlab-code-formatter
```
````

````{tab} Pipenv
```bash
pipenv install jupyterlab-code-formatter
```
````

2. **Install some supported formatters** (isort+black are default for Python)
```bash
# NOTE: Install black and isort,
#       JL code formatter is configured to invoke isort and black by default
pip install black isort
```

3. **Restart JupyterLab**

This plugin includes a server plugin, restart JupyterLab if you have followed the above steps while it's running.

4. **Configure plugin**

To configure which/how formatters are invoked, see [configuration](configuration.md).
