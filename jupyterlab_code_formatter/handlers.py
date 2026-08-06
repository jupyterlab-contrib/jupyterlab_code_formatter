import json
import typing as t
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as package_version

import tornado
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from packaging.version import InvalidVersion, Version

from jupyterlab_code_formatter.formatters import SERVER_FORMATTERS

# The oldest JupyterLab whose frontend API the bundled labextension is built
# against; on older releases the cell source getter it uses does not exist, so
# the labextension sends `null` for every cell instead of its code
MINIMAL_JUPYTERLAB_VERSION = Version("4.0.0")

# The last release of this package which supports JupyterLab 3, as documented in
# the installation instructions
LAST_JUPYTERLAB_3_RELEASE = "2.0.0"


def _outdated_jupyterlab_version() -> t.Optional[str]:
    """Return the installed JupyterLab version, if it is too old to be supported.

    JupyterLab is not a dependency of this package - it can legitimately be
    absent (e.g. when only Notebook 7 is installed) or be provided by a
    redistribution, in which case no claim about its version is made here.
    """
    try:
        installed = package_version("jupyterlab")
    except PackageNotFoundError:
        return None
    try:
        parsed = Version(installed)
    except InvalidVersion:
        return None
    return installed if parsed < MINIMAL_JUPYTERLAB_VERSION else None


class FormattersAPIHandler(APIHandler):
    @tornado.web.authenticated
    def get(self) -> None:
        """Show what formatters are installed and available."""
        use_cache = self.get_query_argument("cached", default=None)
        self.finish(
            json.dumps({
                "formatters": {
                    name: {
                        "enabled": formatter.cached_importable
                        if use_cache
                        else formatter.importable,
                        "label": formatter.label,
                    }
                    for name, formatter in SERVER_FORMATTERS.items()
                }
            })
        )


class FormatAPIHandler(APIHandler):
    def _finish_with_error(self, status_code: int, message: str) -> None:
        """Report an error as JSON, as the other Jupyter Server APIs do.

        A plain-text reason in the status line is not reliably available to the
        client (it is dropped by HTTP/2 and by some proxies), so the message is
        sent in the body instead.
        """
        self.set_status(status_code)
        self.finish(json.dumps({"message": message}))

    def _malformed_code_message(self, code: t.Any) -> str:
        """Explain a `code` payload which is not a list of strings.

        The most likely culprit is a JupyterLab which is too old for the bundled
        labextension, so point at that when the versions do not add up.
        """
        if not isinstance(code, list):
            bad_type = type(code).__name__
            problem = f"expected `code` to be a list of strings, got {bad_type}"
        else:
            bad_type = next(
                type(cell).__name__ for cell in code if not isinstance(cell, str)
            )
            problem = f"expected every entry of `code` to be a string, got {bad_type}"

        outdated_jupyterlab = _outdated_jupyterlab_version()
        if outdated_jupyterlab is not None:
            return (
                f"Malformed format request ({problem}), most likely because "
                f"JupyterLab {outdated_jupyterlab} is too old for this version of "
                "jupyterlab-code-formatter, which requires JupyterLab "
                f"{MINIMAL_JUPYTERLAB_VERSION} or newer. Please either upgrade "
                "JupyterLab, or pin jupyterlab-code-formatter to "
                f"{LAST_JUPYTERLAB_3_RELEASE}."
            )
        return (
            f"Malformed format request ({problem}), which suggests that the "
            "frontend and the server extension come from different versions of "
            "jupyterlab-code-formatter; please make sure that both are up to date "
            "and file an issue on GitHub if the problem persists."
        )

    @tornado.web.authenticated
    def post(self) -> None:
        data = json.loads(self.request.body.decode("utf-8"))
        formatter_name = data["formatter"]
        formatter_instance = SERVER_FORMATTERS.get(formatter_name)
        use_cache = self.get_query_argument("cached", default=None)
        code = data.get("code")

        if formatter_instance is None:
            known = ", ".join(sorted(SERVER_FORMATTERS))
            self._finish_with_error(
                404,
                f"Formatter {formatter_name!r} is unknown, please check the "
                f"`default_formatter` setting; known formatters are: {known}.",
            )
        elif not (
            formatter_instance.cached_importable
            if use_cache
            else formatter_instance.importable
        ):
            self._finish_with_error(
                404,
                f"Formatter {formatter_name!r} is not available, please make sure "
                "that it is installed in the environment running Jupyter Server.",
            )
        elif not isinstance(code, list) or not all(
            isinstance(cell, str) for cell in code
        ):
            self._finish_with_error(400, self._malformed_code_message(code))
        else:
            notebook = data["notebook"]
            options = data.get("options", {})
            formatted_code = []
            for cell in code:
                try:
                    formatted_code.append({
                        "code": formatter_instance.format_code(
                            cell, notebook, **options
                        )
                    })
                except Exception as e:
                    formatted_code.append({"error": str(e)})
            self.finish(json.dumps({"code": formatted_code}))


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]

    web_app.add_handlers(
        host_pattern,
        [
            (
                url_path_join(base_url, "jupyterlab_code_formatter/formatters"),
                FormattersAPIHandler,
            )
        ],
    )

    web_app.add_handlers(
        host_pattern,
        [
            (
                url_path_join(base_url, "/jupyterlab_code_formatter/format"),
                FormatAPIHandler,
            )
        ],
    )
