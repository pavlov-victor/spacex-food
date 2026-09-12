"""Regression checks for the Dify editor fallback and Python input checks."""
import unittest
from dsl_lint import Report, check_code, check_llm_http_start


class LintTests(unittest.TestCase):
    def test_editor_fallback(self):
        for value, errors in [({}, 1), ('{}', 0), ('[]', 1), ('bad', 1)]:
            with self.subTest(value=value):
                rep = Report()
                check_llm_http_start({'http': {'data': {'type': 'http-request', 'error_strategy': 'default-value', 'default_value': [{'key': 'headers', 'type': 'object', 'value': value}]}}}, rep)
                self.assertEqual(rep.counts()[0], errors)

    def test_code_inputs(self):
        for code, variables, errors, warnings in [
            ('from urllib.parse import urlparse\ndef main(x, legacy=""):\n return {}', ['x'], 0, 0),
            ('def main(x):\n return {}', [], 1, 0),
            ('def main(x):\n return {}', ['x', 'unknown'], 1, 0),
            ('def main(*, x):\n return {}', [], 1, 0),
            ('import urllib.request\ndef main():\n return {}', [], 0, 1),
        ]:
            with self.subTest(code=code):
                rep = Report()
                check_code({'code': {'data': {'type': 'code', 'code': code, 'variables': [{'variable': v} for v in variables]}}}, rep)
                self.assertEqual(rep.counts(), (errors, warnings))


if __name__ == '__main__':
    unittest.main()
