# jupyterlab_code_formatter

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/ryantam626/jupyterlab_code_formatter/master?urlpath=lab)
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

### Using pip
```bash
jupyter labextension install @ryantam626/jupyterlab_code_formatter
pip install jupyterlab_code_formatter
jupyter serverextension enable --py jupyterlab_code_formatter
# Remember to install one of the supported formatters (it's in the next section)
```

### Using conda
```bash
conda install -c conda-forge black
jupyter labextension install @ryantam626/jupyterlab_code_formatter
conda install -c conda-forge jupyterlab_code_formatter
jupyter serverextension enable --py jupyterlab_code_formatter
```
Make sure to restart jupyter server after installation.

## Installation of formatters

For `jupyterlab_code_formatter` to work, you would also need some formatters, three are currently supported:

### Python
- Black;
- YAPF;
- Autopep8;
- Isort;
Install at least one of them through `pip install black` for example (or its equivalent in other package management systems).

### R
- [formatR](https://github.com/yihui/formatR/)
    * using pip:  `pip install rpy2` and use R command to install formatR package
    * using conda: `conda install rpy2 r-formatr`
- [styler](https://github.com/r-lib/styler)
    * using pip:  `pip install rpy2` and use R command to install styler package
    * using conda: `conda install rpy2 r-styler`

### Usage

Assuming you do have one of the formatters installed in the Python environment that runs JupyterLab, some extra options would appear under `JUPYTERLAB CODE FORMATTER`, use those to apply formatting to current codecell.

For mass application of formatter, you will need to use `Format Cell` found in the context menu (right click on notebook), or `Format Notebook` on the command tools bar, you might need to configure your default formatters for this to work like you intended (see the "Configs" section below).

### Configs

There are some formatter config exposed through the Jupyter Lab Advanced Settings Editor, have a browse and change it if you wish. for example:
```
{
    "autopep8": {
        "max_line_length": 120,
        "ignore": [
            "E226",
            "E302",
            "E41"
        ]
    }
}
```

In order to use the `jupyterlab_code_formatter:format` and `jupyterlab_code_formatter:format_all` commands with your favourite formatters, you might need to configure your default formatters, for example:
```
{
    "preferences": {
        "default_formatter": {
            "python": "autopep8",
            "r": "styler"
        }
    }
}
```

### How about a keyboard shortcut?

Assuming you are using `jupyterlab>=1.0.0`,  you can add an extra entry to your keyboard shortcuts settings with something like

```
{
    "shortcuts": [
        {
            "command": "jupyterlab_code_formatter:black",
            "keys": [
                "Ctrl K",
                "Ctrl M"
            ],
            "selector": ".jp-Notebook.jp-mod-editMode"
        }
    ]
}
```

This basically says "Under edit mode (detected through the selector), using the chord Ctrl K + Ctrl M, invoke the `jupyterlab_code_formatter:black` command". And there you have it :tada:

For Autopep8, YAPF or Isort, simply do autopep8/yapf/isort instead of black.

For the mass application of formatters, the commands would be `jupyterlab_code_formatter:format` and `jupyterlab_code_formatter:format_all`, again please check out the "Configs" section to see how to choose the correct formatter.

## Using the Black formatter on Windows

You might see some errors about writing grammar tables when using the black formatter on Windows, simply manually create the directory as suggested in [here](https://github.com/ryantam626/jupyterlab_code_formatter/issues/10) and you should be good to go.

## Why are the commands not showing up in the command pallete?

Make sure you really have one of the formatters properly installed.

And also make sure you have a suitable notebook/script opened for the formatters to work on when checking if the commands are there.

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

