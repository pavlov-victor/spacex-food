"""Local contract tests of the code actually embedded in the versioned DSL."""
import copy
import json
from pathlib import Path
import unittest
import yaml

HERE = Path(__file__).resolve().parent
DOC = yaml.safe_load((HERE / '0.0.1.yml').read_text())
NODES = DOC['workflow']['graph']['nodes']


def run_code(title, **kwargs):
    node = next(n['data'] for n in NODES if n['data']['title'] == title)
    scope = {}
    exec(compile(node['code'], title, 'exec'), scope)
    result = scope['main'](**kwargs)
    assert set(result) == set(node['outputs'])
    return result


class ProductWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.inputs = json.loads((HERE / 'example-inputs.json').read_text())
        self.context = run_code('Validate input / prepare search', **self.inputs)['context_json']
        self.search = run_code('Keep usable source text', body=json.dumps({'results': [{'url': 'https://example.org/history', 'title': 'History', 'text': 'This dish became popular in local restaurants.'}]}), status_code=200)
        self.enriched = {
            'source_language': 'sr', 'description': 'Karađorđeva, jelo iz ponude restorana.',
            'translations': {lang: {'name': 'Karađorđeva', 'description': 'Restaurant dish.'} for lang in ['sr', 'en', 'ru']},
            'classification_suggestions': {key: {'value': True, 'reason': 'Model hypothesis.'} for key in ['vegan', 'low_calorie', 'spicy', 'kids_menu', 'takeaway']},
            'possible_allergens': ['milk'], 'fun_facts': [], 'image_prompt': 'A food illustration.', 'warnings': [],
        }

    def draft(self, enriched=None, context=None, search=None):
        source = search or self.search
        return run_code('Validate / build product and image request', raw=json.dumps(enriched or self.enriched), context_json=context or self.context, search_json=source['search_json'], search_warnings=source['warnings'], image_model='grok-imagine-image-2.0')

    def test_input_quotes_unicode_and_price_preserved(self):
        result = json.loads(self.draft()['draft_json'])['product']
        self.assertEqual((result['id'], result['price'], result['currency'], result['name']), ('prod_4', 480, None, 'Karađorđeva'))
        self.assertEqual(result['publication_status'], 'draft')
        self.assertTrue(result['needs_review'])

    def test_suggestions_cannot_become_confirmed_labels(self):
        result = json.loads(self.draft()['draft_json'])['product']
        for key in ['vegan', 'low_calorie', 'spicy', 'kids_menu', 'takeaway']:
            self.assertEqual(result['classification'][key]['value'], 'unknown')
        self.assertEqual(result['classification']['allergens']['status'], 'unknown')

    def test_restaurant_confirmation_wins(self):
        original = json.loads(self.inputs['product_json'])
        original['confirmed'] = {'vegan': False, 'takeaway': True, 'allergens': ['milk'], 'allergens_complete': True}
        self.inputs['product_json'] = json.dumps(original)
        context = run_code('Validate input / prepare search', **self.inputs)['context_json']
        result = json.loads(self.draft(context=context)['draft_json'])['product']
        self.assertFalse(result['classification']['vegan']['value'])
        self.assertTrue(result['classification']['takeaway']['value'])
        self.assertTrue(result['classification']['allergens']['list_complete'])

    def test_table_reference_uses_edit_endpoint(self):
        self.inputs['table_image_url'] = 'https://example.org/table.jpg'
        context = run_code('Validate input / prepare search', **self.inputs)['context_json']
        result = self.draft(context=context)
        self.assertEqual(result['image_endpoint'], 'https://api.x.ai/v1/images/edits')
        self.assertEqual(json.loads(result['image_body'])['image']['url'], self.inputs['table_image_url'])
        plain = self.draft()
        self.assertEqual(plain['image_endpoint'], 'https://api.x.ai/v1/images/generations')
        self.assertNotIn('image', json.loads(plain['image_body']))

    def test_failed_services_preserve_product(self):
        search = run_code('Keep usable source text', body='{}', status_code=0)
        draft = self.draft(search=search)
        result = run_code('Return complete product draft', draft_json=draft['draft_json'], image_body='{}', image_status=0)
        self.assertEqual(result['status'], 'partial')
        self.assertEqual(result['product']['price'], 480)
        self.assertEqual(len(result['product']['translations']), 3)
        self.assertIsNone(result['product']['image']['url'])

    def test_image_success_and_bad_body(self):
        draft = self.draft()['draft_json']
        result = run_code('Return complete product draft', draft_json=draft, image_body='{"data":[{"url":"https://example.org/dish.jpg"}]}', image_status=200)
        self.assertEqual(result['product']['image']['status'], 'ok')
        self.assertEqual(result['status'], 'needs_review')
        for body in ['not json', 'null', '{}', '{"data":[]}']:
            result = run_code('Return complete product draft', draft_json=draft, image_body=body, image_status=200)
            self.assertEqual(result['status'], 'partial')

    def test_fact_sources_and_quotes(self):
        fact = {'text': 'A historical note.', 'source_url': 'https://example.org/history', 'source_quote': 'became popular in local restaurants', 'translations': {lang: 'A historical note.' for lang in ['sr', 'en', 'ru']}}
        self.enriched['fun_facts'] = [fact]
        self.assertEqual(len(json.loads(self.draft()['draft_json'])['product']['fun_facts']), 1)
        fact['source_url'] = 'https://invented.example/fact'
        self.assertEqual(json.loads(self.draft()['draft_json'])['product']['fun_facts'], [])
        fact['source_url'] = 'https://example.org/history'
        fact['source_quote'] = 'An invented quotation'
        self.assertEqual(json.loads(self.draft()['draft_json'])['product']['fun_facts'], [])

    def test_invalid_inputs_and_missing_translation(self):
        for value in ['{}', '[]', '{"name":"x","price":-1}', '{"name":"x","confirmed":{"vegan":"true"}}']:
            with self.assertRaises(ValueError):
                run_code('Validate input / prepare search', **dict(self.inputs, product_json=value))
        del self.enriched['translations']['ru']
        with self.assertRaises(ValueError):
            self.draft()

    def test_graph_and_fallbacks(self):
        ids = {node['id'] for node in NODES}
        for edge in DOC['workflow']['graph']['edges']:
            self.assertIn(edge['source'], ids)
            self.assertIn(edge['target'], ids)
        for node in NODES:
            data = node['data']
            for var in data.get('variables', []):
                if 'value_selector' in var:
                    self.assertIn(var['value_selector'][0], ids | {'env'})
            if data['type'] == 'http-request':
                self.assertEqual(data['error_strategy'], 'default-value')
                self.assertFalse(data['retry_config']['retry_enabled'])
        for var in DOC['workflow']['environment_variables']:
            if var['value_type'] == 'secret':
                self.assertEqual(var['value'], '')


if __name__ == '__main__':
    unittest.main()
