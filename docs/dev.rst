Developement
============

For developement, I am using a conda environment, follow the installation guide in the official site, it doesn't matter what flavor it is really.

Initial Setup
~~~~~~~~~~~~~

First create the conda environment for working on this plugin with

.. code-block:: bash

    make conda-install-frozen

Enter the conda environment with

.. code-block:: bash

    source ./start_env.sh

.. important::

    You will need to execute this command every time you want to work on this plugin with conda!

Then install both the server extension and lab extension locally with

.. code-block:: bash

    make dev-install

Live Recompiling Lab Extension
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To recompile the lab extension under watch mode,

.. code-block:: bash

    make dev-watch


Running Jupyterlab
~~~~~~~~~~~~~~~~~~

With JupyterLab 3 and onwards if you are watching the extension source
then you can start JupyterLab normally and on refresh your changes will be available.

.. code-block:: bash

    jupyter lab

Start Hacking
~~~~~~~~~~~~~

Assuming you have both the live recompile lab extension and a jupyter lab running as noted above, you can now start hacking!
