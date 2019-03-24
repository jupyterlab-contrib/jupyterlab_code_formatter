import abc


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

        if black.__version__ >= '19.3b0':
            return black.format_str(code, mode=black.FileMode(**options))[:-1]
        else:
            return black.format_str(code, **options)[:-1]


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


SERVER_FORMATTERS = {
    "black": BlackFormatter(),
    "autopep8": Autopep8Formatter(),
    "yapf": YapfFormatter(),
    "isort": IsortFormatter(),
}
