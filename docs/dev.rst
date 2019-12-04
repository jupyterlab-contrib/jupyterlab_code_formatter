Developement
============

For developement, I am experimenting with nix, follow the installation guide in the official site.

.. danger::

    Do not take anything you see in this repo as good nix usage, I am still learning nix.

Initial Setup
~~~~~~~~~~~~~

First go into a shell with the correct environment, with

.. code-block:: bash

    nix-shell

This will take a while if you are doing this for the first time.

.. important::

    You will need to execute this command every time you want to work on this plugin with nix!

Then install both the server extension and lab extension locally with

.. code-block:: bash

    make dev-install

Live Recompiling Lab Extension
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To recompile the lab extension under watch mode,

.. code-block:: bash
    make dev-watch-labextension  # Make sure you are actually in the nix shell


Running Jupyterlab
~~~~~~~~~~~~~~~~~~

To run Jupyterlab under watch mode,

.. code-block:: bash

    make dev-watch-jupyterlab  # Make sure you are actually in the nix shell
