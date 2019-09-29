import abc
import re


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

    def format_code(self, code: str, **options) -> str:
        import black

        code = re.sub("^%", "#%#", code, flags=re.M)

        if black.__version__ >= '19.3b0':
            code = black.format_str(code, mode=black.FileMode(**options))[:-1]
        else:
            code = black.format_str(code, **options)[:-1]

        code = re.sub("^#%#", "%", code, flags=re.M)

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

        format_r = rpackages.importr(self.package_name, robject_translations={".env": "env"})
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
        formatted_code = styler_r.style_text(code, **options)
        return "\n".join(formatted_code)


SERVER_FORMATTERS = {
    "black": BlackFormatter(),
    "autopep8": Autopep8Formatter(),
    "yapf": YapfFormatter(),
    "isort": IsortFormatter(),
    "formatR": FormatRFormatter(),
    "styler": StylerFormatter()
}
