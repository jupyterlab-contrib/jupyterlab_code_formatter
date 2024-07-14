# Adding Custom Formatters

To define a custom formatter, you can do so in the Jupyter notebook configuration (usually found `~/.jupyter/jupyter_notebook_config.py` or something along those lines), the following example adds a rather useless formatter as a example.

```python

from jupyterlab_code_formatter.formatters import BaseFormatter, handle_line_ending_and_magic, SERVER_FORMATTERS

class ExampleCustomFormatter(BaseFormatter):

    label = "Apply Example Custom Formatter"

    @property
    def importable(self) -> bool:
        return True

    @handle_line_ending_and_magic
    def format_code(self, code: str, notebook: bool, **options) -> str:
        return "42"

SERVER_FORMATTERS["example"] = ExampleCustomFormatter()

```

When implementing your customer formatter using third party library, you will likely use `try... except` in the `importable` block instead of always returning `True`.

Remember you are always welcomed to submit a pull request!
