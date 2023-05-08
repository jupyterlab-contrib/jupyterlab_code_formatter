import json
import typing as t

import pytest
from jupyter_server.serverapp import ServerApp
from tornado.httpclient import HTTPResponse

from jupyterlab_code_formatter import load_jupyter_server_extension


@pytest.fixture(autouse=True)
def jcf_serverapp(jp_serverapp: ServerApp) -> ServerApp:
    load_jupyter_server_extension(jp_serverapp)
    return jp_serverapp


@pytest.fixture
def request_format(jp_fetch):  # type: ignore[no-untyped-def]
    def do_request(
        formatter: str,
        code: t.List[str],
        options: t.Dict[str, t.Any],
        headers: t.Optional[t.Dict[str, t.Any]] = None,
        **kwargs: t.Any,
    ) -> HTTPResponse:
        return jp_fetch(  # type: ignore[no-any-return]
            "jupyterlab_code_formatter",
            "format",
            method="POST",
            body=json.dumps(
                {
                    "code": code,
                    "options": options,
                    "notebook": True,
                    "formatter": formatter,
                }
            ),
            headers=headers,
            **kwargs,
        )

    return do_request


@pytest.fixture
def request_list_formatters(jp_fetch):  # type: ignore[no-untyped-def]
    def do_request(
        headers: t.Optional[t.Dict[str, t.Any]] = None,
        **kwargs: t.Any,
    ) -> HTTPResponse:
        return jp_fetch(  # type: ignore[no-any-return]
            "jupyterlab_code_formatter",
            "formatters",
            method="GET",
            headers=headers,
            **kwargs,
        )

    return do_request
