from notebook.notebookapp import NotebookApp

from jupyterlab_code_formatter.handlers import setup_handlers


def _jupyter_server_extension_paths():
    return [{"module": "jupyterlab_code_formatter"}]


def load_jupyter_server_extension(notebook_app: NotebookApp):
    setup_handlers(notebook_app.web_app)
