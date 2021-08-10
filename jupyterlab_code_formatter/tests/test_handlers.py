import json
import typing as t

import pkg_resources
import pytest
import requests
from jsonschema import validate
from jupyterlab_code_formatter.formatters import SERVER_FORMATTERS
from jupyterlab_code_formatter.handlers import setup_handlers
from notebook.tests.launchnotebook import NotebookTestBase


def _generate_list_formaters_entry_json_schema(
    formatter_name: str,
) -> t.Dict[str, t.Any]:
    return {
        "type": "object",
        "properties": {
            formatter_name: {
                "type": "object",
                "properties": {
                    "enabled": {"type": "boolean"},
                    "label": {"type": "string"},
                },
            }
        },
    }


EXPECTED_VERSION_SCHEMA = {
    "type": "object",
    "properties": {
        "version": {
            "type": "string",
        }
    },
}

EXPECTED_LIST_FORMATTERS_SCHEMA = {
    "type": "object",
    "properties": {
        "formatters": {
            formatter_name: _generate_list_formaters_entry_json_schema(formatter_name)
            for formatter_name in SERVER_FORMATTERS
        }
    },
}
EXPECTED_FORMAT_SCHEMA = {
    "type": "object",
    "properties": {
        "code": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"code": {"type": "string"}, "error": {"type": "string"}},
            },
        }
    },
}


SIMPLE_VALID_PYTHON_CODE = "x= 22;  e          =1"


class TestHandlers(NotebookTestBase):
    def setUp(self) -> None:
        setup_handlers(self.notebook.web_app)

    def _create_headers(
        self, plugin_version: t.Optional[str] = None
    ) -> t.Dict[str, str]:
        return {
            "Plugin-Version": plugin_version
            if plugin_version is not None
            else pkg_resources.get_distribution("jupyterlab_code_formatter").version
        }

    def _format_code_request(
        self,
        formatter: str,
        code: t.List[str],
        options: t.Dict[str, t.Any],
        plugin_version: t.Optional[str] = None,
    ) -> requests.Response:
        return self.request(
            verb="POST",
            path="/jupyterlab_code_formatter/format",
            data=json.dumps(
                {
                    "code": code,
                    "options": options,
                    "notebook": True,
                    "formatter": formatter,
                }
            ),
            headers=self._create_headers(plugin_version),
        )

    @staticmethod
    def _check_http_200_and_schema(response):
        assert response.status_code == 200
        json_result = response.json()
        validate(instance=json_result, schema=EXPECTED_FORMAT_SCHEMA)
        return json_result

    def test_list_formatters(self):
        """Check if the formatters list route works."""
        response = self.request(
            verb="GET",
            path="/jupyterlab_code_formatter/formatters",
            headers=self._create_headers(),
        )
        validate(instance=response.json(), schema=EXPECTED_LIST_FORMATTERS_SCHEMA)

    def test_404_on_unknown(self):
        """Check that it 404 correctly if formatter name is bad."""
        response = self._format_code_request(
            formatter="UNKNOWN", code=[SIMPLE_VALID_PYTHON_CODE], options={}
        )
        assert response.status_code == 404

    def test_can_apply_python_formatter(self):
        """Check that it can apply black with simple config."""
        response = self._format_code_request(
            formatter="black",
            code=[SIMPLE_VALID_PYTHON_CODE],
            options={"line_length": 88},
        )
        json_result = self._check_http_200_and_schema(response)
        assert json_result["code"][0]["code"] == "x = 22\ne = 1"

    def test_can_use_black_config(self):
        """Check that it can apply black with advanced config."""
        given = "some_string='abc'"
        expected = "some_string = 'abc'"

        response = self._format_code_request(
            formatter="black",
            options={"line_length": 123, "string_normalization": False},
            code=[given],
        )
        json_result = self._check_http_200_and_schema(response)
        assert json_result["code"][0]["code"] == expected

    def test_return_error_if_any(self):
        """Check that it returns the error if any."""
        bad_python = "this_is_bad = 'hihi"
        response = self._format_code_request(
            formatter="black",
            options={"line_length": 123, "string_normalization": False},
            code=[bad_python],
        )
        json_result = self._check_http_200_and_schema(response)
        assert (
            json_result["code"][0]["error"] == "Cannot parse: 1:13: this_is_bad = 'hihi"
        )

    def test_can_handle_magic(self):
        """Check that it's fine to run formatters for code with magic."""
        given = '%%timeit\nsome_string = "abc"'
        expected = '%%timeit\nsome_string = "abc"'
        for formatter in ["black", "yapf", "isort"]:
            response = self._format_code_request(
                formatter=formatter,
                code=[given],
                options={},
            )
            json_result = self._check_http_200_and_schema(response)
            assert json_result["code"][0]["code"] == expected

    def test_can_handle_shell_cmd(self):
        """Check that it's fine to run formatters for code with shell cmd."""
        given = '%%timeit\nsome_string = "abc"\n!pwd'
        expected = '%%timeit\nsome_string = "abc"\n!pwd'
        for formatter in ["black", "yapf", "isort"]:
            response = self._format_code_request(
                formatter=formatter,
                code=[given],
                options={},
            )
            json_result = self._check_http_200_and_schema(response)
            assert json_result["code"][0]["code"] == expected

    def test_can_handle_incompatible_magic_language(self):
        """Check that it will ignore incompatible magic language cellblock."""
        given = "%%html\n<h1>Hi</h1>"
        expected = "%%html\n<h1>Hi</h1>"
        for formatter in ["black", "yapf", "isort"]:
            response = self._format_code_request(
                formatter=formatter,
                code=[given],
                options={},
            )
            json_result = self._check_http_200_and_schema(response)
            assert json_result["code"][0]["code"] == expected

    def test_can_handle_incompatible_magic_language_single(self):
        """Check that it will ignore incompatible magic language cellblock with single %."""
        given = "%html <h1>Hi</h1>"
        expected = "%html <h1>Hi</h1>"
        for formatter in ["black", "yapf", "isort"]:
            response = self._format_code_request(
                formatter=formatter,
                code=[given],
                options={},
            )
            json_result = self._check_http_200_and_schema(response)
            assert json_result["code"][0]["code"] == expected

    def test_can_ipython_help_single(self) -> None:
        """Check that it will ignore single question mark interactive help lines on the fly."""
        given = "    bruh?\nprint('test')\n#test?"
        expected = '    bruh?\nprint("test")\n# test?'
        response = self._format_code_request(
            formatter="black",
            code=[given],
            options={},
        )
        json_result = self._check_http_200_and_schema(response)
        assert json_result["code"][0]["code"] == expected

    def test_can_ipython_help_double(self) -> None:
        """Check that it will ignore double question mark interactive help lines on the fly."""
        given = "    bruh??\nprint('test')\n#test?"
        expected = '    bruh??\nprint("test")\n# test?'
        response = self._format_code_request(
            formatter="black",
            code=[given],
            options={},
        )
        json_result = self._check_http_200_and_schema(response)
        assert json_result["code"][0]["code"] == expected

    def test_will_ignore_question_mark(self) -> None:
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
        response = self._format_code_request(
            formatter="black",
            code=[given],
            options={},
        )
        json_result = self._check_http_200_and_schema(response)
        assert json_result["code"][0]["code"] == expected

    def test_will_ignore_question_mark2(self) -> None:
        """Check that it will ignore single question mark in comments."""
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
        response = self._format_code_request(
            formatter="black",
            code=[given],
            options={},
        )
        json_result = self._check_http_200_and_schema(response)
        assert json_result["code"][0]["code"] == expected

    def test_will_ignore_question_weird(self) -> None:
        given = """wat
wat??"""
        expected = """wat
wat??"""
        response = self._format_code_request(
            formatter="black",
            code=[given],
            options={},
        )
        json_result = self._check_http_200_and_schema(response)
        assert json_result["code"][0]["code"] == expected

    def test_can_use_styler(self):
        given = "a = 3; 2"
        expected = "a <- 3\n2"
        response = self._format_code_request(
            formatter="styler",
            code=[given],
            options={"scope": "tokens"},
        )
        json_result = self._check_http_200_and_schema(response)
        assert json_result["code"][0]["code"] == expected

    def test_can_use_styler_2(self):
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
        response = self._format_code_request(
            code=[given],
            options={"strict": False},
            formatter="styler",
        )
        json_result = self._check_http_200_and_schema(response)
        assert json_result["code"][0]["code"] == expected

    def test_can_use_styler_3(self):
        given = "1++1/2*2^2"
        expected = "1 + +1/2*2^2"
        response = self._format_code_request(
            formatter="styler",
            options={
                "math_token_spacing": {
                    "one": ["'+'", "'-'"],
                    "zero": ["'/'", "'*'", "'^'"],
                }
            },
            code=[given],
        )
        json_result = self._check_http_200_and_schema(response)
        assert json_result["code"][0]["code"] == expected

    def test_can_use_styler_4(self):
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

        response = self._format_code_request(
            code=[given],
            formatter="styler",
            options=dict(
                reindention=dict(regex_pattern="^###", indention=0, comments_only=True)
            ),
        )
        json_result = self._check_http_200_and_schema(response)
        assert json_result["code"][0]["code"] == expected

    def test_can_use_styler_5(self):
        given = """call(
#          SHOULD BE ONE SPACE BEFORE
1,2)
"""
        expected = """call(
    # SHOULD BE ONE SPACE BEFORE
    1, 2
)"""
        response = self._format_code_request(
            code=[given],
            formatter="styler",
            options=dict(indent_by=4, start_comments_with_one_space=True),
        )
        json_result = self._check_http_200_and_schema(response)
        assert json_result["code"][0]["code"] == expected

    def test_can_use_styler_6(self):
        given = "1+1-3"
        expected = "1 + 1 - 3"

        response = self._format_code_request(
            code=[given],
            formatter="styler",
            options={
                "math_token_spacing": "tidyverse_math_token_spacing",
                "reindention": "tidyverse_reindention",
            },
        )
        json_result = self._check_http_200_and_schema(response)
        assert json_result["code"][0]["code"] == expected

    def test_422_on_mismatch_version_1(self):
        response = self.request(
            verb="GET",
            path="/jupyterlab_code_formatter/formatters",
            headers=self._create_headers("0.0.0"),
        )
        assert response.status_code == 422

    def test_200_on_version_without_header(self):
        response = self.request(
            verb="GET",
            path="/jupyterlab_code_formatter/version",
        )
        assert response.status_code == 200
        validate(instance=response.json(), schema=EXPECTED_VERSION_SCHEMA)

    def test_200_on_version_with_wrong_header(self):
        response = self.request(
            verb="GET",
            path="/jupyterlab_code_formatter/version",
            headers=self._create_headers("0.0.0"),
        )
        assert response.status_code == 200
        validate(instance=response.json(), schema=EXPECTED_VERSION_SCHEMA)

    def test_200_on_version_with_correct_header(self):
        response = self.request(
            verb="GET",
            path="/jupyterlab_code_formatter/version",
            headers=self._create_headers(),
        )
        assert response.status_code == 200
        validate(instance=response.json(), schema=EXPECTED_VERSION_SCHEMA)
