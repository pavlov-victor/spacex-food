import json
from urllib.parse import urlparse


def main(draft_json: str, image_body: str, image_status: float) -> dict:
    result = json.loads(draft_json)
    image = result['product']['image']
    url = None
    if 200 <= image_status < 300:
        try:
            value = json.loads(image_body)['data'][0]['url']
            if isinstance(value, str) and urlparse(value).scheme == 'https' and urlparse(value).hostname:
                url = value
        except (ValueError, TypeError, KeyError, IndexError):
            pass
    image['status'] = 'ok' if url else 'failed'
    image['url'] = url
    result['processing']['image'] = image['status']
    if not url:
        result['warnings'].append('Image generation failed; enriched product preserved. Retry image generation separately.')
    result['status'] = 'partial' if not url or result['processing']['search'] == 'failed' else 'needs_review'
    return {'product': result['product'], 'warnings': result['warnings'], 'status': result['status'], 'processing': result['processing'], 'product_json': json.dumps(result, ensure_ascii=False, allow_nan=False)}
