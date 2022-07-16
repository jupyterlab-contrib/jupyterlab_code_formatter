import abc
import copy
import importlib
import logging
import re
import sys
from functools import wraps
from typing import List, Type

import pkg_resources

try:
    import rpy2
    import rpy2.robjects
except ImportError:
    pass
from packaging import version

logger = logging.getLogger(__name__)


INCOMPATIBLE_MAGIC_LANGUAGES = [
    "html",
    "js",
    "javascript",
    "latex",
    "perl",
    "markdown",
    "ruby",
    "script",
    "sh",
    "svg",
    "bash",
    "info",
    "cleanup",
    "delete",
    "configure",
    "logs",
    "sql",
    "local",
    "sparksql",
]


class BaseFormatter(abc.ABC):
    @property
    @abc.abstractmethod
    def label(self) -> str:
        pass

    @property
    @abc.abstractmethod
    def importable(self) -> bool:
        pass

    @abc.abstractmethod
    def format_code(self, code: str, notebook: bool, **options) -> str:
        pass


class BaseLineEscaper(abc.ABC):
    """A base class for defining how to escape certain sequence of text to avoid formatting."""

    def __init__(self, code: str) -> None:
        self.code = code

    @property
    @abc.abstractmethod
    def langs(self) -> List[str]:
        return

    @abc.abstractmethod
    def escape(self, line: str) -> str:
        pass

    @abc.abstractmethod
    def unescape(self, line: str) -> str:
        pass


class MagicCommandEscaper(BaseLineEscaper):
    langs = ["python"]
    escaped_line_start = "# \x01 "
    unesacpe_start = len(escaped_line_start)

    def escape(self, line: str) -> str:
        if line.lstrip().startswith("%"):
            line = f"{self.escaped_line_start}{line}"
        return line

    def unescape(self, line: str) -> str:
        if line.lstrip().startswith(self.escaped_line_start):
            line = line[self.unesacpe_start :]
        return line


class RunScriptEscaper(BaseLineEscaper):
    langs = ["python"]
    escaped_line_start = "# \x01 "
    unesacpe_start = len(escaped_line_start)

    def escape(self, line: str) -> str:
        if re.match(pattern="run\s+\w+", string=line.lstrip()):
            line = f"{self.escaped_line_start}{line}"
        return line

    def unescape(self, line: str) -> str:
        if line.lstrip().startswith(self.escaped_line_start):
            line = line[self.unesacpe_start :]
        return line


class HelpEscaper(BaseLineEscaper):

    langs = ["python"]
    escaped_line_start = "# \x01 "
    unesacpe_start = len(escaped_line_start)

    def escape(self, line: str) -> str:
        if (line.endswith("??") or line.endswith("?")) and "#" not in line:
            line = f"{self.escaped_line_start}{line}"
        return line

    def unescape(self, line: str) -> str:
        if line.lstrip().startswith(self.escaped_line_start):
            line = line[self.unesacpe_start :]
        return line


class CommandEscaper(BaseLineEscaper):

    langs = ["python"]
    escaped_line_start = "# \x01 "
    unesacpe_start = len(escaped_line_start)

    def escape(self, line: str) -> str:
        if line.lstrip().startswith("!"):
            line = f"{self.escaped_line_start}{line}"
        return line

    def unescape(self, line: str) -> str:
        if line.lstrip().startswith(self.escaped_line_start):
            line = line[self.unesacpe_start :]
        return line


class QuartoCommentEscaper(BaseLineEscaper):

    langs = ["python"]
    escaped_line_start = "# \x01 "
    unesacpe_start = len(escaped_line_start)

    def escape(self, line: str) -> str:
        if line.lstrip().startswith("#| "):
            line = f"{self.escaped_line_start}{line}"
        return line

    def unescape(self, line: str) -> str:
        if line.lstrip().startswith(self.escaped_line_start):
            line = line[self.unesacpe_start :]
        return line


ESCAPER_CLASSES: List[Type[BaseLineEscaper]] = [
    MagicCommandEscaper,
    HelpEscaper,
    CommandEscaper,
    QuartoCommentEscaper,
    RunScriptEscaper,
]


def handle_line_ending_and_magic(func):
    @wraps(func)
    def wrapped(self, code: str, notebook: bool, **options) -> str:
        if any(
            code.startswith(f"%{lang}") for lang in INCOMPATIBLE_MAGIC_LANGUAGES
        ) or any(code.startswith(f"%%{lang}") for lang in INCOMPATIBLE_MAGIC_LANGUAGES):
            logger.info("Non compatible magic language cell block detected, ignoring.")
            return code

        has_semicolon = code.strip().endswith(";")

        escapers = [escaper_cls(code) for escaper_cls in ESCAPER_CLASSES]

        lines = code.splitlines()
        for escaper in escapers:
            lines = map(escaper.escape, lines)
        code = "\n".join(lines)

        code = func(self, code, notebook, **options)

        lines = code.splitlines()
        for escaper in escapers:
            lines = map(escaper.unescape, lines)
        code = "\n".join(lines)

        if notebook:
            code = code.rstrip()

        if has_semicolon and notebook and not code.endswith(";"):
            code += ";"
        return code

    return wrapped


BLUE_MONKEY_PATCHED = False


def is_importable(pkg_name: str) -> bool:
    # Need to reload for packages are installed/uninstalled after JupyterLab started
    importlib.reload(pkg_resources)

    return pkg_name in {pkg.key for pkg in pkg_resources.working_set}


def import_black():
    global BLUE_MONKEY_PATCHED
    if BLUE_MONKEY_PATCHED:
        for module in list(sys.modules):
            if module.startswith("black."):
                importlib.reload(sys.modules[module])

        import black

        black = importlib.reload(black)
        BLUE_MONKEY_PATCHED = False
    else:
        import black

    return black


def import_blue():
    """Import blue and perform monkey patch."""
    global BLUE_MONKEY_PATCHED
    import blue

    if not BLUE_MONKEY_PATCHED:
        blue.monkey_patch_black(blue.Mode.synchronous)
        BLUE_MONKEY_PATCHED = True

    return blue


class BlueFormatter(BaseFormatter):

    label = "Apply Blue Formatter"

    @property
    def importable(self) -> bool:
        return is_importable("blue")

    @staticmethod
    def handle_options(**options):
        blue = import_blue()

        return {"mode": blue.black.FileMode(**options)}

    @handle_line_ending_and_magic
    def format_code(self, code: str, notebook: bool, **options) -> str:
        blue = import_blue()

        code = blue.black.format_str(code, **self.handle_options(**options))
        return code


class BlackFormatter(BaseFormatter):

    label = "Apply Black Formatter"

    @property
    def importable(self) -> bool:
        return is_importable("black")

    @staticmethod
    def handle_options(**options):
        black = import_black()

        file_mode_change_version = version.parse("19.3b0")
        current_black_version = version.parse(black.__version__)
        if current_black_version >= file_mode_change_version:
            return {"mode": black.FileMode(**options)}
        else:
            return options

    @handle_line_ending_and_magic
    def format_code(self, code: str, notebook: bool, **options) -> str:
        black = import_black()

        code = black.format_str(code, **self.handle_options(**options))
        return code


class Autopep8Formatter(BaseFormatter):

    label = "Apply Autopep8 Formatter"

    @property
    def importable(self) -> bool:
        return is_importable("autopep8")

    @handle_line_ending_and_magic
    def format_code(self, code: str, notebook: bool, **options) -> str:
        from autopep8 import fix_code

        return fix_code(code, options=options)


class YapfFormatter(BaseFormatter):

    label = "Apply YAPF Formatter"

    @property
    def importable(self) -> bool:
        return is_importable("yapf")

    @handle_line_ending_and_magic
    def format_code(self, code: str, notebook: bool, **options) -> str:
        from yapf.yapflib.yapf_api import FormatCode

        return FormatCode(code, **options)[0]


class IsortFormatter(BaseFormatter):

    label = "Apply Isort Formatter"

    @property
    def importable(self) -> bool:
        return is_importable("isort")

    @handle_line_ending_and_magic
    def format_code(self, code: str, notebook: bool, **options) -> str:
        try:
            from isort import SortImports

            return SortImports(file_contents=code, **options).output
        except ImportError:
            import isort

            return isort.code(code=code, **options)


class FormatRFormatter(BaseFormatter):

    label = "Apply FormatR Formatter"
    package_name = "formatR"

    @property
    def importable(self) -> bool:
        try:
            import rpy2.robjects.packages as rpackages

            rpackages.importr(self.package_name, robject_translations={".env": "env"})

            return True
        except Exception:
            return False

    @handle_line_ending_and_magic
    def format_code(self, code: str, notebook: bool, **options) -> str:
        import rpy2.robjects.packages as rpackages

        format_r = rpackages.importr(
            self.package_name, robject_translations={".env": "env"}
        )
        formatted_code = format_r.tidy_source(text=code, output=False, **options)
        return "\n".join(formatted_code[0])


class StylerFormatter(BaseFormatter):

    label = "Apply Styler Formatter"
    package_name = "styler"

    @property
    def importable(self) -> bool:
        try:
            import rpy2.robjects.packages as rpackages

            rpackages.importr(self.package_name)

            return True
        except Exception:
            return False

    @handle_line_ending_and_magic
    def format_code(self, code: str, notebook: bool, **options) -> str:
        import rpy2.robjects.packages as rpackages

        styler_r = rpackages.importr(self.package_name)
        formatted_code = styler_r.style_text(
            code, **self._transform_options(styler_r, options)
        )
        return "\n".join(formatted_code)

    @staticmethod
    def _transform_options(styler_r, options):
        transformed_options = copy.deepcopy(options)

        if "math_token_spacing" in transformed_options:
            if isinstance(options["math_token_spacing"], dict):
                transformed_options["math_token_spacing"] = rpy2.robjects.ListVector(
                    options["math_token_spacing"]
                )
            else:
                transformed_options["math_token_spacing"] = rpy2.robjects.ListVector(
                    getattr(styler_r, options["math_token_spacing"])()
                )

        if "reindention" in transformed_options:
            if isinstance(options["reindention"], dict):
                transformed_options["reindention"] = rpy2.robjects.ListVector(
                    options["reindention"]
                )
            else:
                transformed_options["reindention"] = rpy2.robjects.ListVector(
                    getattr(styler_r, options["reindention"])()
                )
        return transformed_options


class ScalafmtFormatter(BaseFormatter):

    label = "Apply scalafmt Formatter"

    @property
    def importable(self) -> bool:
        try:
            import subprocess

            return True
        except ImportError:
            return False

    @handle_line_ending_and_magic
    def format_code(self, code: str, notebook: bool, **options) -> str:
        import subprocess

        process = subprocess.run(
            ["scalafmt", "--stdin"],
            input=code,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
        )

        if process.stderr:
            logger.info("An error with scalafmt has ocurred:")
            logger.info(process.stderr)
            return code
        else:
            return process.stdout


SERVER_FORMATTERS = {
    "black": BlackFormatter(),
    "blue": BlueFormatter(),
    "autopep8": Autopep8Formatter(),
    "yapf": YapfFormatter(),
    "isort": IsortFormatter(),
    "formatR": FormatRFormatter(),
    "styler": StylerFormatter(),
    "scalafmt": ScalafmtFormatter(),
}
