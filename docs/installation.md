# Detailed Installation Guide

## Python

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

2. **Install some supported formatters**

Install any desired formatter from the below list

- [black](https://github.com/psf/black);
- [yapf](https://github.com/google/yapf);
- [autopep8](https://github.com/peter-evans/autopep8);
- [isort](https://github.com/PyCQA/isort);

````{tab} Pip
```bash
# NOTE: You don't have to install all of them if you don't want to.
pip install black
pip install yapf
pip install isort
pip install autopep8
```
````

````{tab} Conda
```bash
# NOTE: You don't have to install all of them if you don't want to.
conda install -c conda-forge black
conda install -c conda-forge yapf
conda install -c conda-forge isort
conda install -c conda-forge autopep8
```
````

````{tab} Poetry
```bash
# NOTE: You don't have to install all of them if you don't want to.
poetry add black
poetry add yapf
poetry add isort
poetry add autopep8
```
````

````{tab} Pipenv
```bash
# NOTE: You don't have to install all of them if you don't want to.
pipenv install black
pipenv install yapf
pipenv install isort
pipenv install autopep8
```
````

3. **Restart JupyterLab**

This plugin includes a server plugin, restart JupyterLab if you have followed the above steps while it's running.

4. **Configure plugin**

To configure which/how formatters are invoked, see [configuration](configuration.md).

## R

1. **Install Python -> R Bridge**

````{tab} Pip
```bash
pip install rpy2
```
````

````{tab} Conda
```bash
conda install -c conda-forge rpy2
```
````

````{tab} Poetry
```bash
poetry add rpy2
```
````

````{tab} Pipenv
```bash
pipenv install jupyterlab-code-formatter
```
````

2. **Install the package**

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

3. **Install some supported formatters**
   Install any desired formatter from the below list.

- [formatR](https://github.com/yihui/formatR/);
- [styler](https://github.com/r-lib/styler);

```bash
# NOTE: You don't have to install all of them if you don't want to.
R --vanilla -e 'install.packages("formatR", repos = "http://cran.us.r-project.org")'
R --vanilla -e 'install.packages("styler", repos = "http://cran.us.r-project.org")'
```

4. **Restart JupyterLab**

This plugin includes a server plugin, restart JupyterLab if you have followed the above steps while it's running.

5. **Configure plugin**

To configure which/how formatters are invoked, see [configuration](configuration.md).
