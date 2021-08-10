import json
import re

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join

import pkg_resources

from notebook.notebookapp import NotebookWebApplication

from .formatters import SERVER_FORMATTERS


def setup_handlers(web_app: NotebookWebApplication) -> None:
    host_pattern = ".*$"
    web_app.add_handlers(
        host_pattern,
        [
            (
                url_path_join(
                    web_app.settings["base_url"],
                    "/jupyterlab_code_formatter/formatters",
                ),
                FormattersAPIHandler,
            )
        ],
    )

    web_app.add_handlers(
        host_pattern,
        [
            (
                url_path_join(
                    web_app.settings["base_url"], "/jupyterlab_code_formatter/format"
                ),
                FormatAPIHandler,
            )
        ],
    )
    web_app.add_handlers(
        host_pattern,
        [
            (
                url_path_join(
                    web_app.settings["base_url"], "/jupyterlab_code_formatter/version"
                ),
                VersionAPIHandler,
            )
        ],
    )


def check_plugin_version(handler: APIHandler):
    server_extension_version = pkg_resources.get_distribution(
        "jupyterlab_code_formatter"
    ).version
    lab_extension_version = handler.request.headers.get("Plugin-Version")
    version_matches = server_extension_version == lab_extension_version
    if not version_matches:
        handler.set_status(
            422,
            f"Mismatched versions of server extension ({server_extension_version}) "
            f"and lab extension ({lab_extension_version}). "
            f"Please ensure they are the same.",
        )
        handler.finish()
    return version_matches


class FormattersAPIHandler(APIHandler):
    def get(self) -> None:
        """Show what formatters are installed and avaliable."""
        if check_plugin_version(self):
            self.finish(
                json.dumps(
                    {
                        "formatters": {
                            name: {
                                "enabled": formatter.importable,
                                "label": formatter.label,
                            }
                            for name, formatter in SERVER_FORMATTERS.items()
                        }
                    }
                )
            )


class FormatAPIHandler(APIHandler):
    def _split_imports_nonimports(self, code):
        """Split a cell into import lines and non-import lines"""
        imports = []
        non_imports = []
        in_multiline_import = False

        for line in code.splitlines():
            if re.match(r"^(#\s*)?((import .+)|from .+ import [^\(]+)$", line):
                imports.append(line)
            elif re.match(r"^(#\s*)?from .+? import \(", line):
                in_multiline_import = True
            else:
                imports.append(line) if in_multiline_import else non_imports.append(line)
                if ")" in line:
                    in_multiline_import = False

        # if this cell contained only imports
        if imports and not "".join(non_imports).strip():
            # keep original content untouched (so we don't destroy isorting)
            imports = code.splitlines()

            # we have to keep this b/c we can't change the number of cells
            # otherwise the extension throws an error
            non_imports = []

        return imports, non_imports

    def post(self) -> None:
        if check_plugin_version(self):
            data = json.loads(self.request.body.decode("utf-8"))
            formatter_instance = SERVER_FORMATTERS.get(data["formatter"])

            if formatter_instance is None or not formatter_instance.importable:
                self.set_status(404, f"Formatter {data['formatter']} not found!")
                self.finish()
            else:
                notebook = data["notebook"]
                options = data.get("options", {})
                formatted_code = []

                group_imports = True

                if group_imports:
                    first_import_cell = None
                    nb_imports = []

                for cellno, code in enumerate(data["code"]):
                    try:
                        if group_imports:
                            imports, non_imports = self._split_imports_nonimports(code)
                            code = "\n".join(non_imports)
                            if imports:
                                nb_imports.append(imports)

                                # save cell number of first import cell,
                                # that's where we'll put all imports into
                                if first_import_cell is None:
                                    first_import_cell = cellno

                        formatted_code.append(
                            {
                                "code": formatter_instance.format_code(
                                    code, notebook, **options
                                )
                            }
                        )
                    except Exception as e:
                        formatted_code.append({"error": str(e)})

                if group_imports:
                    flattened_imports = "\n".join(["\n".join(imps) for imps in nb_imports])

                    grouped_imports_cell_code = formatter_instance.format_code(
                        flattened_imports, notebook, **options
                    )

                    existing_first_cell_code = formatted_code[first_import_cell]["code"]
                    formatted_code[first_import_cell]["code"] = (
                        grouped_imports_cell_code
                        + ("\n\n" + existing_first_cell_code if existing_first_cell_code else "")
                    )

                self.finish(json.dumps({"code": formatted_code}))


class VersionAPIHandler(APIHandler):
    def get(self) -> None:
        """Show what version this server plugin is on."""
        self.finish(
            json.dumps(
                {
                    "version": pkg_resources.get_distribution(
                        "jupyterlab_code_formatter"
                    ).version
                }
            )
        )
