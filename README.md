# jupyterlab_code_formatter

[![npm version](https://badge.fury.io/js/%40ryantam626%2Fjupyterlab_code_formatter.svg)](https://badge.fury.io/js/%40ryantam626%2Fjupyterlab_code_formatter)
[![npm downloads](https://img.shields.io/npm/dw/%40ryantam626%2Fjupyterlab_code_formatter.svg)](https://badge.fury.io/js/%40ryantam626%2Fjupyterlab_code_formatter)
[![code style](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/ambv/black)

Code formatter for JupyterLab.

![](https://github.com/ryantam626/jupyterlab_code_formatter/raw/master/code-formatter-demo.gif)

## Prerequisites

* JupyterLab installed under Python3.6+ environment

### Why Python3.6+

* Mainly because Black requires 3.6+, and I like using Black the most;
* Typing support requires 3.5+, and I like typing;

## Installation

```bash
jupyter labextension install @ryantam626/jupyterlab_code_formatter
pip install jupyterlab_code_formatter
jupyter serverextension enable --py jupyterlab_code_formatter
# Remember to install one of the supported formatters (it's in the next section)
```

## Installation of formatters

For `jupyterlab_code_formatter` to work, you would also need some formatters, three are currently supported:

- Black;
- YAPF;
- Autopep8;
- Isort;

Install at least one of them through `pip install black` for example (or its equivalent in other package management systems).

### Usage

Assuming you do have one of the formatters installed in the Python environment that runs JupyterLab, some extra options would appear under `JUPYTERLAB CODE FORMATTER`, use those to apply formatting to current codecell (no multiple code cell application atm).

### Configs

There are some formatter config exposed through the Jupyter Lab Advanced Settings Editor, have a browse and change it if you wish.

### How about a keyboard shortcut?

Add an extra extry to your keyboard shortcuts settings with something like

```
{"jupyterlab_code_formatter:black":{
    "command": "jupyterlab_code_formatter:black",
    "keys": [
        "Ctrl K",
        "Ctrl M"
    ],
    "selector": ".jp-Notebook.jp-mod-editMode"
}}
```

This basically says "Under edit mode (detected through the selector), using the chord Ctrl K + Ctrl M, invoke the `jupyterlab_code_formatter:black` command". And there you have it :tada:

For Autopep8, YAPF or Isort, simply do autopep8/yapf/isort instead of black.

## Using the Black formatter on Windows

You might see some errors about writing grammar tables when using the black formatter on Windows, simply manually create the directory as suggested in [here](https://github.com/ryantam626/jupyterlab_code_formatter/issues/10) and you should be good to go.

## Development

For a development install (requires npm version 4 or later), do the following in the repository directory:

```bash
npm install
npm run build
jupyter labextension link .
pip install -e .
```

To rebuild the package and the JupyterLab app:

```bash
npm run build
jupyter lab build
```

