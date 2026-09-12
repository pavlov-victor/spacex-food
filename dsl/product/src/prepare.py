import json
import math
import re
from urllib.parse import urlparse


def main(product_json: str, target_languages: str = '', restaurant_context: str = '', image_prompt: str = '', table_image_url: str = '') -> dict:
    product = json.loads(product_json)
    if not isinstance(product, dict) or not isinstance(product.get('name'), str) or not product['name'].strip():
        raise ValueError('product_json must be one product object with a nonempty name.')
    for key in ('id', 'category_id', 'category_name', 'description', 'currency', 'portion'):
        if product.get(key) is not None and not isinstance(product[key], str):
            raise ValueError(key + ' must be a string or null.')
    price = product.get('price')
    if price is not None and (type(price) not in (int, float) or not math.isfinite(price) or price < 0):
        raise ValueError('price must be a nonnegative finite number or null.')
    if product.get('currency') is not None and not re.fullmatch('[A-Z]{3}', product['currency']):
        raise ValueError('currency must be an uppercase ISO code or null.')
    languages = list(dict.fromkeys(x.strip() for x in (target_languages or 'sr,en,ru').split(',') if x.strip()))
    if not languages or len(languages) > 6 or any(not re.fullmatch(r'[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*', x) for x in languages):
        raise ValueError('Provide 1–6 language codes, for example sr,en,ru.')
    table = (table_image_url or '').strip()
    if table:
        parsed = urlparse(table)
        if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError('table_image_url must be an HTTPS image URL without embedded credentials.')
    confirmed = product.get('confirmed', {})
    if not isinstance(confirmed, dict):
        raise ValueError('confirmed must be an object provided by the restaurant.')
    for key in ('vegan', 'low_calorie', 'spicy', 'kids_menu', 'takeaway'):
        if key in confirmed and type(confirmed[key]) is not bool:
            raise ValueError('confirmed.' + key + ' must be boolean.')
    for key in ('allergens', 'ingredients'):
        if key in confirmed and (not isinstance(confirmed[key], list) or any(not isinstance(x, str) or not x.strip() for x in confirmed[key])):
            raise ValueError('confirmed.' + key + ' must be an array of nonempty strings.')
    if 'allergens_complete' in confirmed and type(confirmed['allergens_complete']) is not bool:
        raise ValueError('confirmed.allergens_complete must be boolean.')
    normalized = {key: product.get(key) for key in ('id', 'category_id', 'category_name', 'name', 'description', 'price', 'currency', 'portion')}
    normalized['confirmed'] = confirmed
    normalized['source_images'] = product.get('source_images', [])
    normalized['source_needs_review'] = product.get('needs_review', True)
    context = {'product': normalized, 'target_languages': languages, 'restaurant_context': restaurant_context or '', 'image_style': image_prompt or '', 'table_image_url': table}
    search = {'query': product['name'] + ' dish culinary history origin facts', 'numResults': 3, 'contents': {'text': True}}
    return {'context_json': json.dumps(context, ensure_ascii=False, allow_nan=False), 'search_body': json.dumps(search, ensure_ascii=False)}
