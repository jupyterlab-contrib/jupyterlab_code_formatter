import json

from notebook.notebookapp import NotebookWebApplication
from notebook.utils import url_path_join
from notebook.base.handlers import APIHandler

from jupyterlab_code_formatter.formatters import SERVER_FORMATTERS


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


class FormattersAPIHandler(APIHandler):
    def get(self) -> None:
        """Show what formatters are installed and avaliable."""
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
    def post(self) -> None:
        data = json.loads(self.request.body.decode("utf-8"))
        formatter_instance = SERVER_FORMATTERS.get(data["formatter"])

        if formatter_instance is None or not formatter_instance.importable:
            self.set_status(404, "Formatter not found!")
            self.finish()
        else:
            formatted_code = formatter_instance.format_code(
                data["code"], **(data["options"] or {})
            )
            self.finish(json.dumps(formatted_code))
