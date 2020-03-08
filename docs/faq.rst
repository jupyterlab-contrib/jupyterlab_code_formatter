Frequently Asked Questions
==========================

Error when writing grammar tables?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You might see some errors about writing grammar tables when using the black formatter, simply manually create the directory by running: `python -c "import black; black.CACHE_DIR.mkdir(parents=True, exist_ok=True)"`. For more information see `here`_.

Why are the commands not showing up in the command pallete?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Make sure you really have one of the formatters properly installed.

And also make sure you have a suitable notebook/script opened for the formatters to work on when checking if the commands are there.

404 POST on Jupyterhub
~~~~~~~~~~~~~~~~~~~~~~

Due to the difference in how Jupyterhub starts the Jupyter Lab insance, one would need to enable the server exntesion with the :code:`--sys-prefix` flag, that is:

.. code-block:: bash

    jupyter serverextension enable --py jupyterlab_code_formatter --sys-prefix


.. _here: https://github.com/ryantam626/jupyterlab_code_formatter/issues/10
