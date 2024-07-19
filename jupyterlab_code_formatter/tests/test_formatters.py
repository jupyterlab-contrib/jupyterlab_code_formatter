import json
import os
import sys
from subprocess import run
from unittest import mock

import pytest

from jupyterlab_code_formatter.formatters import SERVER_FORMATTERS


def test_env_pollution_on_import():
    # should not pollute environment on import
    code = "; ".join(
        [
            "from jupyterlab_code_formatter import formatters",
            "import json",
            "import os",
            "assert formatters",
            "print(json.dumps(os.environ.copy()))",
        ]
    )
    result = run([sys.executable, "-c", f"{code}"], capture_output=True, text=True, check=True, env={})
    environ = json.loads(result.stdout)
    assert set(environ.keys()) - {"LC_CTYPE"} == set()


@pytest.mark.parametrize("name", SERVER_FORMATTERS)
def test_env_pollution_on_importable_check(name):
    formatter = SERVER_FORMATTERS[name]
    # should not pollute environment on `importable` check
    with mock.patch.dict(os.environ, {}, clear=True):
        # invoke the property getter
        is_importable = formatter.importable
        # the environment should have no extra keys
        assert set(os.environ.keys()) == set()
        if not is_importable:
            pytest.skip(f"{name} formatter was not importable, the test may yield false negatives")
