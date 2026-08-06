import json
import sys
import typing as t

if sys.version_info >= (3, 8):
    from importlib.metadata import version
else:
    from importlib_metadata import version

import pytest
from jsonschema import validate
from tornado.httpclient import HTTPResponse

from jupyterlab_code_formatter import handlers
from jupyterlab_code_formatter.formatters import SERVER_FORMATTERS, BlackFormatter

try:
    import rpy2
except ImportError:
    MISSING_RPY2 = True
else:
    MISSING_RPY2 = False
skip_if_missing_rpy2 = pytest.mark.skipif(MISSING_RPY2, reason='missing rpy2')


def _generate_list_formaters_entry_json_schema(
    formatter_name: str,
) -> t.Dict[str, t.Any]:
    return {
        "type": "object",
        "required": [formatter_name],
        "properties": {
            formatter_name: {
                "type": "object",
                "required": ["enabled", "label"],
                "properties": {
                    "enabled": {"type": "boolean"},
                    "label": {"type": "string"},
                },
            }
        },
    }


EXPECTED_LIST_FORMATTERS_SCHEMA = {
    "type": "object",
    "required": ["formatters"],
    "properties": {
        "formatters": {
            formatter_name: _generate_list_formaters_entry_json_schema(formatter_name)
            for formatter_name in SERVER_FORMATTERS
        }
    },
}
EXPECTED_FROMAT_SCHEMA = {
    "type": "object",
    "required": ["code"],
    "properties": {
        "code": {
            "type": "array",
            "items": {
                "type": "object",
                "oneOf": [
                    {
                        "additionalProperties": False,
                        "properties": {"code": {"type": "string"}},
                    },
                    {
                        "additionalProperties": False,
                        "properties": {"error": {"type": "string"}},
                    },
                ],
            },
        }
    },
}


SIMPLE_VALID_PYTHON_CODE = "x= 22;  e          =1"


def _check_http_code_and_schema(
    response: HTTPResponse, expected_code: int, expected_schema: t.Dict[str, t.Any]
) -> t.Dict[str, t.Any]:
    assert response.code == expected_code
    json_result: t.Dict[str, t.Any] = json.loads(response.body)
    validate(instance=json_result, schema=expected_schema)
    return json_result


async def test_list_formatters(request_list_formatters):  # type: ignore[no-untyped-def]
    """Check if the formatters list route works."""
    response: HTTPResponse = await request_list_formatters()
    _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_LIST_FORMATTERS_SCHEMA,
    )


async def test_404_on_unknown(request_format):  # type: ignore[no-untyped-def]
    """Check that it 404 correctly if formatter name is bad."""
    response: HTTPResponse = await request_format(
        formatter="UNKNOWN",
        code=[SIMPLE_VALID_PYTHON_CODE],
        options={},
        raise_error=False,
    )
    assert response.code == 404
    # the reason has to be in the JSON body for the client to be able to show it
    message = json.loads(response.body)["message"]
    assert "UNKNOWN" in message
    assert "unknown" in message
    assert "black" in message


async def test_404_on_unavailable(request_format, monkeypatch):  # type: ignore[no-untyped-def]
    """Check that a formatter which is known but not installed is reported as such."""
    monkeypatch.setattr(BlackFormatter, "importable", property(lambda self: False))

    response: HTTPResponse = await request_format(
        formatter="black",
        code=[SIMPLE_VALID_PYTHON_CODE],
        options={},
        raise_error=False,
    )

    assert response.code == 404
    message = json.loads(response.body)["message"]
    assert "black" in message
    assert "not available" in message


@pytest.mark.parametrize(
    "code,expected_problem",
    (
        # a labextension running on a too old JupyterLab cannot read the cell
        # source, and `JSON.stringify` turns the resulting `undefined` into `null`
        ([SIMPLE_VALID_PYTHON_CODE, None], "entry of `code` to be a string, got NoneType"),
        ([123], "entry of `code` to be a string, got int"),
        (SIMPLE_VALID_PYTHON_CODE, "`code` to be a list of strings, got str"),
        (None, "`code` to be a list of strings, got NoneType"),
    ),
)
async def test_400_on_malformed_code(request_format, code, expected_problem):  # type: ignore[no-untyped-def]
    """Check that a `code` payload which is not a list of strings is rejected."""
    response: HTTPResponse = await request_format(
        formatter="black",
        code=code,
        options={},
        raise_error=False,
    )

    assert response.code == 400
    message = json.loads(response.body)["message"]
    assert expected_problem in message


async def test_400_on_malformed_code_mentions_jupyterlab(request_format, monkeypatch):  # type: ignore[no-untyped-def]
    """Check that an outdated JupyterLab is called out as the likely cause."""
    monkeypatch.setattr(
        handlers, "_outdated_jupyterlab_version", lambda: "3.4.5", raising=True
    )

    response: HTTPResponse = await request_format(
        formatter="black",
        code=[None],
        options={},
        raise_error=False,
    )

    assert response.code == 400
    message = json.loads(response.body)["message"]
    assert "JupyterLab 3.4.5 is too old" in message
    assert f"pin jupyterlab-code-formatter to {handlers.LAST_JUPYTERLAB_3_RELEASE}" in message


async def test_400_on_malformed_code_without_jupyterlab(request_format, monkeypatch):  # type: ignore[no-untyped-def]
    """Check the fallback message used when JupyterLab's version looks fine."""
    monkeypatch.setattr(
        handlers, "_outdated_jupyterlab_version", lambda: None, raising=True
    )

    response: HTTPResponse = await request_format(
        formatter="black",
        code=[None],
        options={},
        raise_error=False,
    )

    assert response.code == 400
    message = json.loads(response.body)["message"]
    assert "different versions of jupyterlab-code-formatter" in message


async def test_can_apply_python_formatter(request_format):  # type: ignore[no-untyped-def]
    """Check that it can apply black with simple config."""
    response: HTTPResponse = await request_format(
        formatter="black",
        code=[SIMPLE_VALID_PYTHON_CODE],
        options={"line_length": 88},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == "x = 22\ne = 1"


async def test_can_use_black_config(request_format):  # type: ignore[no-untyped-def]
    """Check that it can apply black with advanced config."""
    given = "some_string='abc'"
    expected = "some_string = 'abc'"

    response: HTTPResponse = await request_format(
        formatter="black",
        code=[given],
        options={"line_length": 123, "string_normalization": False},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


async def test_return_error_if_any(request_format):  # type: ignore[no-untyped-def]
    """Check that it returns the error if any."""
    bad_python = "this_is_bad = 'hihi"

    response: HTTPResponse = await request_format(
        formatter="black",
        code=[bad_python],
        options={"line_length": 123, "string_normalization": False},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["error"] == "Cannot parse: 1:13: this_is_bad = 'hihi"


@pytest.mark.parametrize("formatter", ("black", "yapf", "isort"))
async def test_can_handle_magic(request_format, formatter):  # type: ignore[no-untyped-def]
    """Check that it's fine to run formatters for code with magic."""
    given = '%%timeit\nsome_string = "abc"'
    expected = '%%timeit\nsome_string = "abc"'

    response: HTTPResponse = await request_format(
        formatter=formatter,
        code=[given],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


@pytest.mark.parametrize("formatter", ("black", "yapf", "isort"))
async def test_can_handle_shell_cmd(request_format, formatter):  # type: ignore[no-untyped-def]
    """Check that it's fine to run formatters for code with shell cmd."""
    given = '%%timeit\nsome_string = "abc"\n!pwd'
    expected = '%%timeit\nsome_string = "abc"\n!pwd'

    response: HTTPResponse = await request_format(
        formatter=formatter,
        code=[given],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


@pytest.mark.parametrize("formatter", ("black", "yapf", "isort"))
async def test_can_handle_incompatible_magic_language(request_format, formatter):  # type: ignore[no-untyped-def]
    """Check that it will ignore incompatible magic language cellblock."""
    given = "%%html\n<h1>Hi</h1>"
    expected = "%%html\n<h1>Hi</h1>"

    response: HTTPResponse = await request_format(
        formatter=formatter,
        code=[given],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


@pytest.mark.parametrize("formatter", ("black", "yapf", "isort"))
async def test_can_handle_incompatible_magic_language_single(request_format, formatter):  # type: ignore[no-untyped-def]
    """Check that it will ignore incompatible magic language cellblock with single %."""
    given = "%html <h1>Hi</h1>"
    expected = "%html <h1>Hi</h1>"

    response: HTTPResponse = await request_format(
        formatter=formatter,
        code=[given],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


async def test_can_ipython_help_signle(request_format):  # type: ignore[no-untyped-def]
    """Check that it will ignore single question mark interactive help lines on the fly."""
    given = "    bruh?\nprint('test')\n#test?"
    expected = '    bruh?\nprint("test")\n# test?'

    response: HTTPResponse = await request_format(
        formatter="black",
        code=[given],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


async def test_can_ipython_help_double(request_format):  # type: ignore[no-untyped-def]
    """Check that it will ignore double question mark interactive help lines on the fly."""
    given = "    bruh??\nprint('test')\n#test?"
    expected = '    bruh??\nprint("test")\n# test?'

    response: HTTPResponse = await request_format(
        formatter="black",
        code=[given],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


async def test_can_ipython_help_signle_leading(request_format):  # type: ignore[no-untyped-def]
    """Check that it will ignore leading single question mark interactive help lines on the fly."""
    given = "    ?bruh\nprint('test')\n#test?"
    expected = '    ?bruh\nprint("test")\n# test?'

    response: HTTPResponse = await request_format(
        formatter="black",
        code=[given],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


async def test_can_ipython_help_double_leading(request_format):  # type: ignore[no-untyped-def]
    """Check that it will ignore leading double question mark interactive help lines on the fly."""
    given = "    ??bruh\nprint('test')\n#test?"
    expected = '    ??bruh\nprint("test")\n# test?'

    response: HTTPResponse = await request_format(
        formatter="black",
        code=[given],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


async def test_will_ignore_quarto_comments(request_format):  # type: ignore[no-untyped-def]
    """Check that it will ignore Quarto's comments at the top of a block."""
    given = """#| eval: false
1 + 1"""

    response: HTTPResponse = await request_format(
        formatter="black",
        code=[given],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == given


async def test_will_ignore_run_command(request_format):  # type: ignore[no-untyped-def]
    """Check that it will ignore run command."""
    given = "     run     some_script.py"

    response: HTTPResponse = await request_format(
        formatter="black",
        code=[given],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == given


async def test_will_ignore_question_mark(request_format):  # type: ignore[no-untyped-def]
    """Check that it will ignore single question mark in comments."""
    given = """def f():
    # bruh what?
    # again bruh? really
    # a ? b
    print('hi')
    x = '?'"""
    expected = """def f():
    # bruh what?
    # again bruh? really
    # a ? b
    print("hi")
    x = "?\""""

    response: HTTPResponse = await request_format(
        formatter="black",
        code=[given],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


async def test_will_ignore_question_mark2(request_format):  # type: ignore[no-untyped-def]
    """Check that it will ignore double question mark in comments."""
    given = """def f():
    # bruh what??
    # again bruh?? really
    # a ? b ? c
    print('hi')"""
    expected = """def f():
    # bruh what??
    # again bruh?? really
    # a ? b ? c
    print("hi")"""

    response: HTTPResponse = await request_format(
        formatter="black",
        code=[given],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


async def test_will_ignore_question_weird(request_format):  # type: ignore[no-untyped-def]
    given = """wat
wat??"""
    expected = """wat
wat??"""

    response: HTTPResponse = await request_format(
        formatter="black",
        code=[given],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


@skip_if_missing_rpy2
async def test_can_use_styler(request_format):  # type: ignore[no-untyped-def]
    given = "a = 3; 2"
    expected = "a <- 3\n2"

    response: HTTPResponse = await request_format(
        formatter="styler",
        code=[given],
        options={"scope": "tokens"},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


@skip_if_missing_rpy2
async def test_can_use_styler2(request_format):  # type: ignore[no-untyped-def]
    given = """data_frame(
     small  = 2 ,
     medium = 4,#comment without space
     large  =6
)"""
    expected = """data_frame(
  small  = 2,
  medium = 4, # comment without space
  large  = 6
)"""

    response: HTTPResponse = await request_format(
        formatter="styler",
        code=[given],
        options={"strict": False},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


@skip_if_missing_rpy2
async def test_can_use_styler3(request_format):  # type: ignore[no-untyped-def]
    given = "1++1/2*2^2"
    expected = "1 + +1/2*2^2"

    response: HTTPResponse = await request_format(
        formatter="styler",
        code=[given],
        options={
            "math_token_spacing": {
                "one": ["'+'", "'-'"],
                "zero": ["'/'", "'*'", "'^'"],
            }
        },
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


@skip_if_missing_rpy2
async def test_can_use_styler4(request_format):  # type: ignore[no-untyped-def]
    given = """a <- function() {
    ### not to be indented
    # indent normally
    33
    }"""
    expected = """a <- function() {
### not to be indented
  # indent normally
  33
}"""

    response: HTTPResponse = await request_format(
        formatter="styler",
        code=[given],
        options={
            "reindention": {
                "regex_pattern": "^###",
                "indention": 0,
                "comments_only": True,
            }
        },
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


@skip_if_missing_rpy2
async def test_can_use_styler5(request_format):  # type: ignore[no-untyped-def]
    given = """call(
#          SHOULD BE ONE SPACE BEFORE
1,2)
"""
    expected = """call(
    # SHOULD BE ONE SPACE BEFORE
    1, 2
)"""

    response: HTTPResponse = await request_format(
        formatter="styler",
        code=[given],
        options={"indent_by": 4, "start_comments_with_one_space": True},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


@skip_if_missing_rpy2
async def test_can_use_styler6(request_format):  # type: ignore[no-untyped-def]
    given = "1+1-3"
    expected = "1 + 1 - 3"

    response: HTTPResponse = await request_format(
        formatter="styler",
        code=[given],
        options={
            "math_token_spacing": "tidyverse_math_token_spacing",
            "reindention": "tidyverse_reindention",
        },
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


@skip_if_missing_rpy2
@pytest.mark.parametrize(
    "formatter,options",
    (("styler", {}), ("formatR", {"indent": 2})),
)
async def test_will_not_escape_ipython_syntax_in_r(request_format, formatter, options):  # type: ignore[no-untyped-def]
    """Check that IPython-only escaping is not applied to R code.

    `!x` is negation in R, escaping it as a comment used to leave behind the
    escape marker (or comment the line out altogether).
    """
    given = """f <- function(x) {
  !x
}"""

    response: HTTPResponse = await request_format(
        formatter=formatter,
        code=[given],
        options=options,
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == given


@skip_if_missing_rpy2
@pytest.mark.parametrize(
    "formatter,options",
    (("styler", {}), ("formatR", {"indent": 2})),
)
async def test_will_escape_magic_in_r(request_format, formatter, options):  # type: ignore[no-untyped-def]
    """Check that magics are still hidden from R formatters.

    `%%R` is not valid R, but it can wrap an R cell in a Python notebook,
    so R would fail to parse the cell unless the line gets escaped.
    """
    given = """%%R
x <- 1"""

    response: HTTPResponse = await request_format(
        formatter=formatter,
        code=[given],
        options=options,
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == given


@skip_if_missing_rpy2
async def test_will_escape_quarto_comments_in_r(request_format):  # type: ignore[no-untyped-def]
    """Check that Quarto's comments are still hidden from R formatters.

    Without escaping, `start_comments_with_one_space` rewrites `#| eval: false`
    into `# | eval: false`, which Quarto no longer recognises as a cell option.
    """
    given = """#| eval: false
x <- 1"""

    response: HTTPResponse = await request_format(
        formatter="styler",
        code=[given],
        options={"start_comments_with_one_space": True},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == given


@pytest.mark.skip(
    reason="rust toolchain doesn't seem to be picked up here for some reason."
)
async def test_can_rustfmt(request_format):  # type: ignore[no-untyped-def]
    given = """// function to add two numbers
fn add() {
    let a = 5;
                let b = 10;

            let sum = a + b;

    println!("Sum of a and b = {}", 
        sum);
}

fn main() {
    // function call
    add();
}"""
    expected = """// function to add two numbers
fn add() {
    let a = 5;
    let b = 10;

    let sum = a + b;

    println!("Sum of a and b = {}", sum);
}

fn main() {
    // function call
    add();
}"""

    response: HTTPResponse = await request_format(
        formatter="rustfmt",
        code=[given],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


IMPORT_SORTING_EXAMPLE = (
    "import numpy as np\nimport sys,os\nfrom enum import IntEnum\nfrom enum import auto"
)


async def test_can_apply_ruff_formatter(request_format):  # type: ignore[no-untyped-def]
    """Check that it can apply ruff with simple config."""
    response: HTTPResponse = await request_format(
        formatter="ruffformat",
        code=[SIMPLE_VALID_PYTHON_CODE],
        options={},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == "x = 22\ne = 1"


async def test_can_apply_ruff_import_fix(request_format):  # type: ignore[no-untyped-def]
    """Check that it can organize imports with ruff."""

    given = "import foo\nimport numpy as np\nimport sys,os\nfrom enum import IntEnum\nfrom enum import auto"
    expected = "import os\nimport sys\nfrom enum import IntEnum, auto\n\nimport numpy as np\n\nimport foo"
    response: HTTPResponse = await request_format(
        formatter="ruff",
        code=[given],
        options={
            "args": [
                "--select=I001",
                "--config",
                "lint.isort.known-first-party=['foo']",
            ]
        },
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected


async def test_can_apply_ruff_fix_unsafe(request_format):  # type: ignore[no-untyped-def]
    """Check that it can apply unsafe fixes."""

    given = """if arg != None:
    pass"""
    expected = """if arg is not None:
    pass"""
    response: HTTPResponse = await request_format(
        formatter="ruff",
        code=[given],
        options={"args": ["--select=E711", "--unsafe-fixes"]},
    )
    json_result = _check_http_code_and_schema(
        response=response,
        expected_code=200,
        expected_schema=EXPECTED_FROMAT_SCHEMA,
    )
    assert json_result["code"][0]["code"] == expected
