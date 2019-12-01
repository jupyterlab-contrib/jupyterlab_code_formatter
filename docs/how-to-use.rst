How To Use This Plugin
======================

Simple Usage (Single Code Cell or File)
---------------------------------------

Assuming you have installed this plugin correctly, extra commands will be registered under the section of :code:`JUPYTERLAB CODE FORMATTER` in the command palette, click on any of them to format whatever you were focused on.


Simple Usage (Selected Cells)
-----------------------------

Highlight cells you want to format, then right click and select :code:`Format Cells`.

.. important::

    This uses the default formatter defined in config. See :ref:`Changing Default Formatter` for more info.


Simple Usage (Selected All Cells)
---------------------------------

An extra button should appear in the toolbar (it should say :code:`Format Notebook` when hovering over it), click that and the whole notebook will be formatted where possible.

.. important::

    This uses the default formatter defined in config. See :ref:`Changing Default Formatter` for more info.

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


Other Available Commands
------------------------

To find out what formatters are available, you can query http://localhost:8888/jupyterlab_code_formatter/formatters (you might need to replace the port and address), the keys of formatter are shown there.

To bind the format selected cells/format all cells command, the command to use would be :code:`jupyterlab_code_formatter:format` and :code:`jupyterlab_code_formatter:format_all` respectively.


.. _Changing Default Formatter:

Changing Default Formatter
--------------------------

To change the default formatter used the format action in context menu/toolbar, you will need to change settings via Jupyter Lab Advanced Settings Editor, for example:

.. code-block:: json

    {
        "preferences": {
            "default_formatter": {
                "python": "autopep8",
                "R": "styler"
            }
        }
    }



Changing Formatter Parameter
----------------------------

There are also some formatter config exposed through the Jupyter Lab Advanced Settings Editor, have a browse and change it if you wish. for example:

.. code-block:: json

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

Styler Configuration Example
````````````````````````````

The :code:`list` construct is actually a JSON dictionary, to use :code:`math_token_spacing` and :code:`reindention` config, one would need to do something like the following.

.. code-block:: json

    {
        "styler": {
            "math_token_spacing": {
                "zero":["'^'"],
                "one":["'+'", "'-'", "'*'","'/'"]
            },
            "reindention": {
                "regex_pattern" : "^###",
                "indention" : 0,
                "comments_only" : true}
        }
    }
