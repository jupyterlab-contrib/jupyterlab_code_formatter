How To Use This Plugin
======================

Simple Usage (Single Code Cell or File)
---------------------------------------

Assuming you have installed this plugin correctly, extra commands will be registered under the section of :code:`JUPYTERLAB CODE FORMATTER` in the command palette, click on any of them to format whatever you were focused on.


Simple Usage (Selected Cells)
-----------------------------

Highlight cells you want to format, then right click and select :code:`Format Cells`.

.. important::

    This uses the default formatter defined in config. See <TODO> for more info.


Simple Usage (Selected All Cells)
---------------------------------

An extra button should appear in the toolbar (it should say :code:`Format Notebook` when hovering over it), click that and the whole notebook will be formatted where possible.

.. important::

    This uses the default formatter defined in config. See <TODO> for more info.

Keyboard Shortcuts
------------------

Scrolling down the command palette or clicking with the mouse is not efficient at all. To add to the available shortcuts, add something like the below to the shortcut section of the Advanced Setting Edtior of Jupyterlab.

.. code-block:: json

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

The above example breaks down to

    - Under edit mode (detected through the selector);
    - Using the chord :code:`Ctrl+K Ctrl+M`;
    - Invoke the :code:`jupyterlab_code_formatter:black` command;


Other available commands
------------------------

To find out what formatters are available, you can query http://localhost:8888/jupyterlab_code_formatter/formatters (you might need to replace the port and address), the keys of formatter are shown there.

To bind the format selected cells/format all cells command, the command to use would be :code:`jupyterlab_code_formatter:format` and :code:`jupyterlab_code_formatter:format_all` respectively.


