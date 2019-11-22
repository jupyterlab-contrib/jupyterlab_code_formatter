import abc
import copy
import re

import rpy2
import rpy2.robjects
from packaging import version


MAGIC_COMMAND_RE = re.compile(r"^%", flags=re.M)
COMMENTED_MAGIC_COMMAND_RE = re.compile(r"^#%#", flags=re.M)


class BaseFormatter:
    @property
    @abc.abstractmethod
    def label(self) -> str:
        pass

    @property
    @abc.abstractmethod
    def importable(self) -> bool:
        pass

    @abc.abstractmethod
    def format_code(self, code: str, **options) -> str:
        pass


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

    def format_code(self, code: str, **options) -> str:
        import black

        has_semicolon = code.strip().endswith(";")

        code = re.sub(MAGIC_COMMAND_RE, "#%#", code)
        code = black.format_str(code, **self.handle_options(**options))[:-1]
        code = re.sub(COMMENTED_MAGIC_COMMAND_RE, "%", code)

        if has_semicolon:
            code += ";"

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

    def format_code(self, code: str, **options) -> str:
        from autopep8 import fix_code

        return fix_code(code, options=options)[:-1]


class YapfFormatter(BaseFormatter):

    label = "Apply YAPF Formatter"

    @property
    def importable(self) -> bool:
        try:
            import yapf

            return True
        except ImportError:
            return False

    def format_code(self, code: str, **options) -> str:
        from yapf.yapflib.yapf_api import FormatCode

        return FormatCode(code, **options)[0][:-1]


class IsortFormatter(BaseFormatter):

    label = "Apply Isort Formatter"

    @property
    def importable(self) -> bool:
        try:
            import isort

            return True
        except ImportError:
            return False

    def format_code(self, code: str, **options) -> str:
        from isort import SortImports

        return SortImports(file_contents=code, **options).output[:-1]


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

    def format_code(self, code: str, **options) -> str:
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

    def format_code(self, code: str, **options) -> str:
        import rpy2.robjects.packages as rpackages

        styler_r = rpackages.importr(self.package_name)
        formatted_code = styler_r.style_text(code, **self._transform_options(options))
        return "\n".join(formatted_code)

    @staticmethod
    def _transform_options(options):
        transformed_options = copy.deepcopy(options)

        if "math_token_spacing" in transformed_options:
            transformed_options["math_token_spacing"] = rpy2.robjects.ListVector(
                transformed_options["math_token_spacing"]
            )

        if "reindention" in transformed_options:
            transformed_options["reindention"] = rpy2.robjects.ListVector(
                transformed_options["reindention"]
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
