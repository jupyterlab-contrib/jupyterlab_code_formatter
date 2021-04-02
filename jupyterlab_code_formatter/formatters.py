import abc
import copy
import re
import logging
from functools import wraps

try:
    import rpy2
    import rpy2.robjects
except ImportError:
    pass
from packaging import version


logger = logging.getLogger(__name__)
SHELL_COMMAND_RE = re.compile(r"^!", flags=re.M)
COMMENTED_SHELL_COMMAND_RE = re.compile(r"^# !#", flags=re.M)
MAGIC_COMMAND_RE = re.compile(r"^%", flags=re.M)
COMMENTED_MAGIC_COMMAND_RE = re.compile(r"^# %#", flags=re.M)
IPYTHON_HELP_RE = re.compile(r"(^(?!\s*#)(.*)\?\??)$", flags=re.M)
COMMENTED_IPYTHON_HELP_RE = re.compile(r"# \?#", flags=re.M)


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
    "local"
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


def handle_line_ending_and_magic(func):
    @wraps(func)
    def wrapped(self, code: str, notebook: bool, **options) -> str:
        if any(
            code.startswith(f"%{lang}") for lang in INCOMPATIBLE_MAGIC_LANGUAGES
        ) or any(code.startswith(f"%%{lang}") for lang in INCOMPATIBLE_MAGIC_LANGUAGES):
            logger.info("Non compatible magic language cell block detected, ignoring.")
            return code

        has_semicolon = code.strip().endswith(";")

        code = re.sub(MAGIC_COMMAND_RE, "# %#", code)
        code = re.sub(SHELL_COMMAND_RE, "# !#", code)
        code = re.sub(IPYTHON_HELP_RE, r"# ?#\1", code)
        code = func(self, code, notebook, **options)
        code = re.sub(COMMENTED_MAGIC_COMMAND_RE, "%", code)
        code = re.sub(COMMENTED_SHELL_COMMAND_RE, "!", code)
        code = re.sub(COMMENTED_IPYTHON_HELP_RE, "", code)

        if notebook:
            code = code.rstrip()

        if has_semicolon and notebook and not code.endswith(";"):
            code += ";"
        return code

    return wrapped


class BlackFormatter(BaseFormatter):

    label = "Apply Black Formatter"

    @property
    def importable(self) -> bool:
        try:
            import black

            return True
        except ImportError:
            return False

    @staticmethod
    def handle_options(**options):
        import black

        file_mode_change_version = version.parse("19.3b0")
        current_black_version = version.parse(black.__version__)
        if current_black_version >= file_mode_change_version:
            return {"mode": black.FileMode(**options)}
        else:
            return options

    @handle_line_ending_and_magic
    def format_code(self, code: str, notebook: bool, **options) -> str:
        import black

        code = black.format_str(code, **self.handle_options(**options))
        return code


class Autopep8Formatter(BaseFormatter):

    label = "Apply Autopep8 Formatter"

    @property
    def importable(self) -> bool:
        try:
            import autopep8

            return True
        except ImportError:
            return False

    @handle_line_ending_and_magic
    def format_code(self, code: str, notebook: bool, **options) -> str:
        from autopep8 import fix_code

        return fix_code(code, options=options)


class YapfFormatter(BaseFormatter):

    label = "Apply YAPF Formatter"

    @property
    def importable(self) -> bool:
        try:
            import yapf

            return True
        except ImportError:
            return False

    @handle_line_ending_and_magic
    def format_code(self, code: str, notebook: bool, **options) -> str:
        from yapf.yapflib.yapf_api import FormatCode

        return FormatCode(code, **options)[0]


class IsortFormatter(BaseFormatter):

    label = "Apply Isort Formatter"

    @property
    def importable(self) -> bool:
        try:
            import isort

            return True
        except ImportError:
            return False

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


SERVER_FORMATTERS = {
    "black": BlackFormatter(),
    "autopep8": Autopep8Formatter(),
    "yapf": YapfFormatter(),
    "isort": IsortFormatter(),
    "formatR": FormatRFormatter(),
    "styler": StylerFormatter(),
}
