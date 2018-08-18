# jupyterlab_code_formatter

Code formatter for JupyterLab.

![](https://github.com/ryantam626/jupyterlab_code_formatter/raw/master/code-formatter-demo.gif)

## Prerequisites

* JupyterLab installed under Python3.6+ environment

### Why Python3.6+

* Mainly because Black requires 3.6+, and I like using Black the most;
* Typing support requires 3.5+, and I like typing;

## Installation

```bash
jupyter labextension install jupyterlab_code_formatter
pip install jupyterlab_code_formatter
jupyter serverextension enable --py jupyterlab_code_formatter
```

## Installation of formatters

For `jupyterlab_code_formatter` to work, you would also need some formatters, three are currently supported:

- Black;
- YAPF;
- Autopep8;

Install at least one of them through `pip install black` for example (or its equivalent in other package management systems).

### Usage

Assuming you do have one of the formatters installed in the Python environment that runs JupyterLab, some extra options would appear under `JUPYTERLAB CODE FORMATTER`, use those to apply formatting to current codecell (no multiple code cell application atm).

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

For Autopep8 or YAPF, simply do autopep8/yapf instead of black.


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

