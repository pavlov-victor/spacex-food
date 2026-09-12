"""Build immutable fal.ai variant from the validated direct-x.ai snapshot."""
from pathlib import Path
import uuid
import yaml
from build import Dumper

HERE = Path(__file__).resolve().parent


def build():
    doc = yaml.safe_load((HERE / '0.0.6.yml').read_text())
    doc['app']['description'] = 'Product 0.0.8: Grok Imagine 2.0 via fal.ai, dish/table references only; graphic style from text to avoid copied advertisement text.'
    env = doc['workflow']['environment_variables']
    env[:] = [v for v in env if v['name'] != 'XAI_API_KEY']
    env.append({'id': str(uuid.uuid5(uuid.NAMESPACE_DNS, 'spacex-product-FAL_KEY')), 'name': 'FAL_KEY', 'value_type': 'secret', 'value': '', 'description': 'fal.ai API key. Text Grok still uses the configured Dify xAI provider.'})
    for node in doc['workflow']['graph']['nodes']:
        data = node['data']
        if node['id'] == '1789210000005':
            data['code'] += '\n\n' + (HERE / 'src/fal_adapter.py').read_text()
        elif node['id'] == '1789210000006':
            data['title'] = 'fal.ai generate / edit food card'
            data['authorization'] = {'type': 'no-auth'}
            data['headers'] = 'Content-Type:application/json\nAuthorization:Key {{#env.FAL_KEY#}}'
        elif node['id'] == '1789210000007':
            data['code'] = data['code'].replace("json.loads(image_body)['data'][0]['url']", "json.loads(image_body)['images'][0]['url']")
            data['code'] = data['code'].replace("image['url'] = url", "image['url'] = url\n    image['http_status'] = image_status")
    with (HERE / '0.0.8.yml').open('x') as file:
        yaml.dump(doc, file, Dumper=Dumper, allow_unicode=True, sort_keys=False, width=110)


if __name__ == '__main__':
    build()
