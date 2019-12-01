import json
import typing as t

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


EXPECTED_LIST_FORMATTERS_SCHEMA = {
    "type": "object",
    "properties": {
        "formatters": {
            formatter_name: _generate_list_formaters_entry_json_schema(formatter_name)
            for formatter_name in SERVER_FORMATTERS
        }
    },
}
EXPECTED_FROMAT_SCHEMA = {
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

    def test_list_formatters(self):
        """Check if the formatters list route works."""
        response = self.request(
            verb="GET", path="/jupyterlab_code_formatter/formatters"
        )
        validate(instance=response.json(), schema=EXPECTED_LIST_FORMATTERS_SCHEMA)

    def test_404_on_unknown(self):
        """Check that it 404 correctly if formatter name is bad."""
        response = self.request(
            verb="POST",
            path="/jupyterlab_code_formatter/format",
            data=json.dumps(
                {
                    "code": [SIMPLE_VALID_PYTHON_CODE],
                    "options": {},
                    "formatter": "something_unknown",
                }
            ),
        )
        assert response.status_code == 404

    def test_can_apply_python_formatter(self):
        """Check that it can apply black with simple config."""
        response = self.request(
            verb="POST",
            path="/jupyterlab_code_formatter/format",
            data=json.dumps(
                {
                    "code": [SIMPLE_VALID_PYTHON_CODE],
                    "options": {"line_length": 88},
                    "formatter": "black",
                }
            ),
        )
        assert response.status_code == 200
        json_result = response.json()
        validate(instance=json_result, schema=EXPECTED_FROMAT_SCHEMA)
        assert json_result["code"][0]["code"] == "x = 22\ne = 1"

    def test_can_use_black_config(self):
        """Check that it can apply black with advanced config."""
        given = "some_string='abc'"
        expected = "some_string = 'abc'"

        response = self.request(
            verb="POST",
            path="/jupyterlab_code_formatter/format",
            data=json.dumps(
                {
                    "code": [given],
                    "options": {"line_length": 123, "string_normalization": False},
                    "formatter": "black",
                }
            ),
        )
        assert response.status_code == 200
        json_result = response.json()
        validate(instance=json_result, schema=EXPECTED_FROMAT_SCHEMA)
        assert response.json()["code"][0]["code"] == expected

    def test_return_error_if_any(self):
        """Check that it returns the error if any."""
        bad_python = "this_is_bad = 'hihi"

        response = self.request(
            verb="POST",
            path="/jupyterlab_code_formatter/format",
            data=json.dumps(
                {
                    "code": [bad_python],
                    "options": {"line_length": 123, "string_normalization": False},
                    "formatter": "black",
                }
            ),
        )
        assert response.status_code == 200
        json_result = response.json()
        validate(instance=json_result, schema=EXPECTED_FROMAT_SCHEMA)
        assert (
            json_result["code"][0]["error"] == "Cannot parse: 1:13: this_is_bad = 'hihi"
        )

    def test_can_handle_magic(self):
        """Check that it's fine to run formatters for code with magic."""
        given = "%%timeit\nsome_string='abc'"
        expected = "%%timeit\nsome_string = 'abc'"

        response = self.request(
            verb="POST",
            path="/jupyterlab_code_formatter/format",
            data=json.dumps(
                {
                    "code": [given],
                    "options": {"line_length": 123, "string_normalization": False},
                    "formatter": "black",
                }
            ),
        )
        assert response.status_code == 200
        json_result = response.json()
        validate(instance=json_result, schema=EXPECTED_FROMAT_SCHEMA)
        assert response.json()["code"][0]["code"] == expected

    def test_can_use_styler(self):
        given = "a = 3; 2"
        expected = "a <- 3\n2"
        response = self.request(
            verb="POST",
            path="/jupyterlab_code_formatter/format",
            data=json.dumps(
                {
                    "code": [given],
                    "options": {"scope": "tokens"},
                    "formatter": "styler",
                }
            ),
        )
        assert response.status_code == 200
        json_result = response.json()
        validate(instance=json_result, schema=EXPECTED_FROMAT_SCHEMA)
        assert response.json()["code"][0]["code"] == expected

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
        response = self.request(
            verb="POST",
            path="/jupyterlab_code_formatter/format",
            data=json.dumps(
                {"code": [given], "options": {"strict": False}, "formatter": "styler",}
            ),
        )
        assert response.status_code == 200
        json_result = response.json()
        validate(instance=json_result, schema=EXPECTED_FROMAT_SCHEMA)
        assert response.json()["code"][0]["code"] == expected

    def test_can_use_styler_3(self):
        given = "1++1/2*2^2"
        expected = "1 + +1/2*2^2"
        response = self.request(
            verb="POST",
            path="/jupyterlab_code_formatter/format",
            data=json.dumps(
                {
                    "code": [given],
                    "options": {
                        "math_token_spacing": {
                            "one": ["'+'", "'-'"],
                            "zero": ["'/'", "'*'", "'^'"],
                        }
                    },
                    "formatter": "styler",
                }
            ),
        )
        assert response.status_code == 200
        json_result = response.json()
        validate(instance=json_result, schema=EXPECTED_FROMAT_SCHEMA)
        assert response.json()["code"][0]["code"] == expected

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

        response = self.request(
            verb="POST",
            path="/jupyterlab_code_formatter/format",
            data=json.dumps(
                {
                    "code": [given],
                    "options": dict(
                        reindention=dict(
                            regex_pattern="^###", indention=0, comments_only=True
                        )
                    ),
                    "formatter": "styler",
                }
            ),
        )
        assert response.status_code == 200
        json_result = response.json()
        validate(instance=json_result, schema=EXPECTED_FROMAT_SCHEMA)
        assert response.json()["code"][0]["code"] == expected
