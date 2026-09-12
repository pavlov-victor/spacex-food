import unittest
from dsl_release import populate


class ReleaseTest(unittest.TestCase):
    def test_only_declared_values_and_source_unchanged(self):
        doc = {'workflow': {'environment_variables': [{'name': 'FAL_KEY', 'value_type': 'secret', 'value': ''}, {'name': 'IMAGE_MODEL', 'value_type': 'string', 'value': 'default'}]}}
        result = populate(doc, {'FAL_KEY': 'test-key', 'UNRELATED_SECRET': 'excluded'})
        self.assertEqual(result['workflow']['environment_variables'][0]['value'], 'test-key')
        self.assertEqual(result['workflow']['environment_variables'][1]['value'], 'default')
        self.assertEqual(doc['workflow']['environment_variables'][0]['value'], '')
        self.assertNotIn('excluded', str(result))

    def test_missing_key_fails_without_exposing_other_values(self):
        doc = {'workflow': {'environment_variables': [{'name': 'FAL_KEY', 'value_type': 'secret', 'value': ''}]}}
        with self.assertRaisesRegex(ValueError, '^Missing secrets in .env: FAL_KEY$'):
            populate(doc, {'OTHER': 'test-secret'})


if __name__ == '__main__':
    unittest.main()
