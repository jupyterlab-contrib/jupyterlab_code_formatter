Prerequisites and Installation Steps
====================================

Prerequisites
-------------

**This plugin requires JupyterLab installed under a Python3.6+ environment.**

.. note::
    Black (one of the most popular formatter) requires Python3.6+.

    Also this project uses typing, a 3.6+ feature.

Installation Step 1 (Installing the plugin itself)
--------------------------------------------------

With Pip
~~~~~~~~

.. code-block:: bash

    jupyter labextension install @ryantam626/jupyterlab_code_formatter
    pip install jupyterlab_code_formatter
    jupyter serverextension enable --py jupyterlab_code_formatter

.. important::
    You will also need to install a code formatter for this plugin to work.

With Conda
~~~~~~~~~~

.. code-block:: bash

    conda install -c conda-forge black
    jupyter labextension install @ryantam626/jupyterlab_code_formatter
    conda install -c conda-forge jupyterlab_code_formatter
    jupyter serverextension enable --py jupyterlab_code_formatter

.. important::
    You will also need to install a code formatter for this plugin to work.


Installation Step 2 (Installing a supported code formatter)
-----------------------------------------------------------

Python Code Formatters
~~~~~~~~~~~~~~~~~~~~~~

Supported formatters are:

    - `Black`_;
    - `YAPF`_;
    - `Autopep8`_;
    - `Isort`_;

Install one of them via your favourite package management tool. For example, one of the following (these are not exhaustive!)

.. code-block:: bash

    # ONLY ONE OF THESE WILL DO!!!!!!!!
    pip install black
    conda install black
    poetry add black

R Code Formatters
~~~~~~~~~~~~~~~~~

Supported formatters are:

    - `formatR`_;
    - `styler`_;

Install one of them via your favourite package management tool again. For example, via conda or via R directly.

.. danger::
    **You will also need to install the :code:`rpy2` Python package for this plugin to work!**


Installation Step 3 (Restarting Jupyterlab)
-------------------------------------------

If you have been following the above steps while Jupyterlab is already running, you will need to restart it for the changes to fully take effect.


Installation Step 4 (Configuring the plugin)
--------------------------------------------

You might need to change the default formatter selection via configuration as shown in  :ref:`Changing Default Formatter`, if you are unsure, continue reading in :ref:`How To Use This Plugin`.


.. _Autopep8: https://github.com/hhatto/autopep8
.. _Black: https://github.com/psf/black
.. _Isort: https://github.com/timothycrosley/isort
.. _YAPF: https://github.com/google/yapf
.. _formatR: https://github.com/yihui/formatR/
.. _styler: https://github.com/r-lib/styler
