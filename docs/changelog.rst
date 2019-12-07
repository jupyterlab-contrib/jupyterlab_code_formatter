Changelog
+++++++++

1.0.3 2019-12-07
================

Server extension
----------------

* Handle :code:`indent_by` and :code:`start_comments_with_one_space` for styler;
* Unify magic and semicolon handling for Python formatters;

Jupyterlab extension
--------------------

* Handle :code:`indent_by` and :code:`start_comments_with_one_space` for styler;

General
-------

* Various fixes to docs;
* Various fixes to Makefile;

1.0.2 2019-12-01
================

Server extension
----------------

* Fix optional :code:`rpy2` import crashing server extension;

Jupyterlab extension
--------------------

No change.

1.0.1 2019-12-01
================

No change, simply fixing versioning error.


1.0.0 2019-12-01
================

Server extension
----------------

* Fix missing `rpy2` import error;
* Add tests;

Jupyterlab extension
--------------------

* Major refactoring;
* Temporarily removed language filtering for command palette;
* Tooltip format notebook changed to icon - thanks to mlucool;

General
-------

* Project reorgnaisation;
* Use nix for local development environment;
* Documentation generation;

0.7.0 2019-11-02
================

Server extension
----------------

* Support more styler options;
* Fix bad string comparsion of version strings;
* Compile regex once only;


Jupyterlab extension
--------------------

* Support more styler options;
* Fix bad capitalisation of config schema;

0.6.1 2019-10-23
================

Server extension
----------------

* Retain semicolon after black's formatting action - courtesy of dfm;


Jupyterlab extension
--------------------

No Change.


0.6.0 2019-10-16
================

Server extension
----------------

* Support formatting multiple code cell at the same time - courtesy of mlucool;
* Return formatting error if they exists - courtesy of mlucool;


Jupyterlab extension
--------------------

* Add `jupyterlab_code_foramtter:format` command and context menu button - courtesy of mlucool;
* Add `jupyterlab_code_foramtter:format_all` command and command tools bar button - courtesy of mlucool;


0.5.2 2019-09-29
================

Server extension
----------------

* Trim trialing newline for autopep8;


Jupyterlab extension
--------------------

No change.


0.5.1 2019-09-09
================

Server extension
----------------

* Fix bug where presence of `rpy2` could cause plugin to be useless;


Jupyterlab extension
--------------------

No change.

0.5.0 2019-08-21
================

Server extension
----------------

* Support `styler` - Another R code formatter - courtesy of dev-wei;

Jupyterlab extension
--------------------

* Support `styler` - Another R code formatter - courtesy of dev-wei;

0.4.0 2019-08-19
================

Server extension
----------------

* Support `formatr` - A R code formatter - courtesy of dev-wei;

Jupyterlab extension
--------------------

* Support `formatr` - A R code formatter - courtesy of dev-wei;

0.3.0 2019-07-10
================

General
-------

* Minor updates to README - courtesy of reza1615;


Server extension
----------------

No Change

Jupyterlab extension
--------------------

* Support Jupyterlab ^1.0.0 - courtesy of gnestor;
* Remove custom_style enum restriction - courtesy of CaselIT;
* Add companion packages info;

0.2.3 2019-06-17
================

Same as v0.2.2 - Re-publishing because I messed up the versioning.

0.2.2 2019-06-17
================

General
-------

* Minor updates to README - courtesy of akashlakhera and mzakariaCERN;

Server extension
----------------

No Change

Jupyterlab extension
--------------------

* Remove some excessive logging - courtesy of jtpio;
* Make formatter commands visible for Python files and notebooks only - courtesy of jtpio;

0.2.1 2019-04-29
================

General
-------

* Add Binder to README - courtesy of jtpio;
* Add a test notebook for easier testing with Binder;

Server extension
----------------

* Add LICENSE in sdist - courtesy of xhochy;
* Handle the exsistence of magic commands in codecell for Black - courtesy of Lif3line;

Jupyterlab extension
--------------------

No Change

0.2.0 2019-03-24
================

* Handle format_str interface change for black>=19.3b0;
* Support Isort as a formatter;
* Bugfixes - courtesy of gnestor;

0.1.8 2019-02-16
================

* Minor fix for formatting files in code cells;

0.1.7 2019-02-16
================

* Support formatting files in FileEditor - courtesy of rbedi;

0.1.6 2019-01-19
================

* Expose autopep8 options - courtesy of timlod;

0.1.5 2018-12-01
================

* Add commands to the main menu for better accessibility - courtesy of jtpio;

0.1.4 2018-10-10
================

* Bump dependency ranges;

0.1.3 2018-08-24
================

* Fix typo in command;

0.1.2 2018-08-24
================

* Bump dependency ranges;

0.1.1 2018-08-18
================

* Minor README update;

0.1.0 2018-08-18
================

* Inital implementation;
