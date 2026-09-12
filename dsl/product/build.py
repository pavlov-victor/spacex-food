"""Build a new immutable product DSL snapshot; requires PyYAML."""
import copy
from pathlib import Path
import uuid
import yaml

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


class Dumper(yaml.SafeDumper):
    pass


def string(dumper, value):
    return dumper.represent_scalar('tag:yaml.org,2002:str', value, style='|' if '\n' in value else None)


Dumper.add_representer(str, string)


def build():
    doc = yaml.safe_load((ROOT / '0.0.2.yml').read_text())
    doc['app'].update(name='spacex-product', description='Product 0.0.1: descriptions, translations, classification, sourced facts and x.ai illustration.')
    doc['workflow']['environment_variables'] = [
        {'id': str(uuid.uuid5(uuid.NAMESPACE_DNS, 'spacex-product-' + key)), 'name': key, 'value_type': typ, 'value': value, 'description': description}
        for key, typ, value, description in [
            ('XAI_API_KEY', 'secret', '', 'x.ai key for image generation; also configure the xAI model provider.'),
            ('EXA_API_KEY', 'secret', '', 'Exa search API key for sourced culinary facts.'),
            ('IMAGE_MODEL', 'string', 'grok-imagine-image-2.0', 'x.ai image generation/editing model; verify availability for your account.'),
        ]
    ]
    ids = {key: str(1789210000000 + i) for i, key in enumerate(['start', 'prepare', 'search', 'sources', 'llm', 'build', 'image', 'final', 'end'])}
    nodes = []

    def ref(key, variable):
        return '{{#' + ids[key] + '.' + variable + '#}}'

    def node(key, data):
        x = 80 + 310 * len(nodes)
        nodes.append({'id': ids[key], 'data': dict(data, selected=False), 'type': 'custom', 'position': {'x': x, 'y': 250}, 'positionAbsolute': {'x': x, 'y': 250}, 'width': 242, 'height': 130, 'selected': False, 'sourcePosition': 'right', 'targetPosition': 'left'})

    def code(key, title, source, inputs, outputs):
        node(key, {'title': title, 'type': 'code', 'code_language': 'python3', 'code': (HERE / 'src' / source).read_text(), 'variables': [{'variable': var, 'value_selector': selector} for var, selector in inputs.items()], 'outputs': {var: {'type': typ, 'children': None} for var, typ in outputs.items()}})

    def http(key, title, url, body, auth, header, read_timeout):
        node(key, {'title': title, 'type': 'http-request', 'method': 'post', 'url': url, 'authorization': {'type': 'api-key', 'config': {'type': auth, 'api_key': '{{#env.' + ('XAI_API_KEY' if key == 'image' else 'EXA_API_KEY') + '#}}', 'header': header}}, 'headers': 'Content-Type:application/json', 'params': '', 'body': {'type': 'json', 'data': [{'key': '', 'type': 'text', 'value': body}]}, 'timeout': {'connect': 10, 'read': read_timeout, 'write': 20}, 'ssl_verify': True, 'error_strategy': 'default-value', 'default_value': [{'key': 'body', 'type': 'string', 'value': '{}'}, {'key': 'status_code', 'type': 'number', 'value': 0}, {'key': 'headers', 'type': 'object', 'value': {}}], 'retry_config': {'retry_enabled': False, 'max_retries': 0, 'retry_interval': 1000}})

    variables = []
    for name, label, typ, required, default, limit in [
        ('product_json', 'One product JSON from menu', 'paragraph', True, '', 20000),
        ('target_languages', 'Languages (comma-separated)', 'text-input', False, 'sr,en,ru', 100),
        ('restaurant_context', 'Restaurant notes / recipe details', 'paragraph', False, '', 5000),
        ('image_prompt', 'Image style / instructions', 'paragraph', False, '', 2000),
        ('table_image_url', 'Optional table photo HTTPS URL', 'text-input', False, '', 4000),
    ]:
        variables.append({'variable': name, 'label': label, 'type': typ, 'required': required, 'default': default, 'max_length': limit, 'options': []})
    node('start', {'title': 'Product input', 'type': 'start', 'variables': variables})
    code('prepare', 'Validate input / prepare search', 'prepare.py', {v['variable']: [ids['start'], v['variable']] for v in variables}, {'context_json': 'string', 'search_body': 'string'})
    http('search', 'Exa culinary facts search', 'https://api.exa.ai/search', ref('prepare', 'search_body'), 'custom', 'x-api-key', 30)
    code('sources', 'Keep usable source text', 'search_context.py', {'body': [ids['search'], 'body'], 'status_code': [ids['search'], 'status_code']}, {'search_json': 'string', 'warnings': 'array[string]'})
    node('llm', {'title': 'Grok product enrichment', 'type': 'llm', 'context': {'enabled': False, 'variable_selector': []}, 'model': {'provider': 'langgenius/x/x', 'name': 'grok-4-fast-non-reasoning', 'mode': 'chat', 'completion_params': {'temperature': 0, 'response_format': 'json_object'}}, 'prompt_template': [{'id': 'product-system', 'role': 'system', 'text': (HERE / 'src/enrich.txt').read_text()}, {'id': 'product-user', 'role': 'user', 'text': 'PRODUCT INPUT DATA:\n' + ref('prepare', 'context_json') + '\nSEARCH SOURCE DATA:\n' + ref('sources', 'search_json')}], 'vision': {'enabled': False}, 'variables': []})
    code('build', 'Validate / build product and image request', 'build_product.py', {'raw': [ids['llm'], 'text'], 'context_json': [ids['prepare'], 'context_json'], 'search_json': [ids['sources'], 'search_json'], 'search_warnings': [ids['sources'], 'warnings'], 'image_model': ['env', 'IMAGE_MODEL']}, {'draft_json': 'string', 'image_endpoint': 'string', 'image_body': 'string'})
    http('image', 'x.ai generate / edit table photo', ref('build', 'image_endpoint'), ref('build', 'image_body'), 'bearer', '', 120)
    code('final', 'Return complete product draft', 'finalize.py', {'draft_json': [ids['build'], 'draft_json'], 'image_body': [ids['image'], 'body'], 'image_status': [ids['image'], 'status_code']}, {'product': 'object', 'warnings': 'array[string]', 'status': 'string', 'processing': 'object', 'product_json': 'string'})
    final_outputs = nodes[-1]['data']['outputs']
    node('end', {'title': 'Product output', 'type': 'end', 'outputs': [{'variable': key, 'value_selector': [ids['final'], key], 'value_type': val['type']} for key, val in final_outputs.items()]})
    edges = [{'id': a['id'] + '-source-' + b['id'] + '-target', 'source': a['id'], 'sourceHandle': 'source', 'target': b['id'], 'targetHandle': 'target', 'type': 'custom', 'zIndex': 0, 'data': {'sourceType': a['data']['type'], 'targetType': b['data']['type'], 'isInIteration': False, 'isInLoop': False}} for a, b in zip(nodes, nodes[1:])]
    doc['workflow']['graph'] = {'nodes': nodes, 'edges': edges, 'viewport': {'x': 0, 'y': 0, 'zoom': 0.6}}
    with (HERE / '0.0.1.yml').open('x') as file:
        yaml.dump(doc, file, Dumper=Dumper, allow_unicode=True, sort_keys=False, width=110)


if __name__ == '__main__':
    build()
