"""Check the embedded fal request adapter across all reference combinations."""
import itertools
import json
import unittest
from unittest.mock import patch
import yaml
import test_workflow as base

DOC = yaml.safe_load((base.HERE / '0.0.8.yml').read_text())


class FalWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.nodes = patch.object(base, 'NODES', DOC['workflow']['graph']['nodes'])
        self.nodes.start()
        self.addCleanup(self.nodes.stop)
        self.fixture = base.ProductWorkflowTest()
        self.fixture.setUp()

    def test_reference_combinations(self):
        for flags in itertools.product([False, True], repeat=3):
            with self.subTest(flags=flags):
                inputs = dict(self.fixture.inputs)
                urls = []
                for field, enabled in zip(['dish_image_url', 'table_image_url', 'card_reference_url'], flags):
                    inputs[field] = 'https://example.org/' + field + '.jpg' if enabled else ''
                    if enabled and field != 'card_reference_url':
                        urls.append(inputs[field])
                ctx = base.run_code('Validate input / prepare search', **inputs)['context_json']
                output = self.fixture.draft(context=ctx)
                req = json.loads(output['image_body'])
                expected = 'xai/grok-imagine-image/v2.0/' + ('edit' if urls else 'text-to-image')
                self.assertEqual(output['image_endpoint'], 'https://fal.run/' + expected)
                self.assertEqual(req.get('image_urls', []), urls)
                self.assertNotIn('GRAPHIC CARD STYLE ONLY', req['prompt'])
                self.assertNotIn(inputs.get('card_reference_url') or 'unused-card-placeholder', req.get('image_urls', []))
                self.assertEqual(req['num_images'], 1)
                self.assertEqual(req['aspect_ratio'], '1:1')
                self.assertFalse({'model', 'images', 'image', 'n'} & req.keys())
                draft = json.loads(output['draft_json'])
                self.assertEqual(draft['workflow_version'], '0.0.8')
                self.assertEqual(draft['product']['image']['provider'], 'fal.ai')
                self.assertEqual(draft['product']['image']['card_language'], 'en')

    def test_response_and_failure_preserve_draft(self):
        draft = self.fixture.draft()['draft_json']
        for body, status, expected in [
            ({'images': [{'url': 'https://example.org/result.jpg'}]}, 200, 'ok'),
            ({'detail': 'Unauthorized'}, 401, 'failed'),
            ({'images': []}, 200, 'failed'),
            ({'images': [{'url': 'http://example.org/result.jpg'}]}, 200, 'failed'),
        ]:
            with self.subTest(status=status, body=body):
                result = base.run_code('Return complete product draft', draft_json=draft, image_body=json.dumps(body), image_status=status)
                self.assertEqual(result['product']['image']['status'], expected)
                self.assertEqual(result['product']['image']['http_status'], status)
                self.assertEqual(result['product']['price'], 480)

    def test_auth(self):
        data = next(n['data'] for n in base.NODES if n['id'] == '1789210000006')
        self.assertEqual(data['authorization'], {'type': 'no-auth'})
        self.assertIn('Authorization:Key {{#env.FAL_KEY#}}', data['headers'])
        self.assertNotIn('XAI_API_KEY', str(DOC))


if __name__ == '__main__':
    unittest.main()
