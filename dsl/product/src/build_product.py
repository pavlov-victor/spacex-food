import json


def main(raw: str, context_json: str, search_json: str, search_warnings: list, image_model: str) -> dict:
    text = raw.strip()
    if text.startswith('```') and text.endswith('```'):
        text = '\n'.join(text.splitlines()[1:-1])
    data = json.loads(text)
    context, search = json.loads(context_json), json.loads(search_json)
    original = context['product']
    languages = context['target_languages']
    if not isinstance(data, dict):
        raise ValueError('Expected enriched product JSON object.')
    for key in ('description', 'source_language', 'image_prompt'):
        if not isinstance(data.get(key), str) or not data[key].strip():
            raise ValueError('Missing nonempty ' + key)
    translations = data.get('translations')
    if not isinstance(translations, dict) or set(translations) != set(languages):
        raise ValueError('Translations must cover exactly the requested languages.')
    for value in translations.values():
        if not isinstance(value, dict) or any(not isinstance(value.get(k), str) or not value[k].strip() for k in ('name', 'description')):
            raise ValueError('Every translation requires name and description.')
    warnings = data.get('warnings')
    if not isinstance(warnings, list) or any(not isinstance(w, str) for w in warnings):
        raise ValueError('warnings must be strings.')
    warnings = list(search_warnings) + warnings + ['AI-generated content and illustration require restaurant review.']
    confirmed = original['confirmed']
    suggestions = data.get('classification_suggestions', {})
    if not isinstance(suggestions, dict):
        raise ValueError('classification_suggestions must be an object.')
    classification = {}
    for key in ('vegan', 'low_calorie', 'spicy', 'kids_menu', 'takeaway'):
        suggestion = suggestions.get(key)
        # Some JSON-mode responses encode booleans as strings. Normalize only
        # the model's suggestions; restaurant confirmations remain strict.
        if isinstance(suggestion, dict) and isinstance(suggestion.get('value'), str):
            value = suggestion['value'].strip().lower()
            if value in ('true', 'false'):
                suggestion = dict(suggestion, value=value == 'true')
        if not isinstance(suggestion, dict) or not (type(suggestion.get('value')) is bool or suggestion.get('value') == 'unknown') or not isinstance(suggestion.get('reason'), str):
            raise ValueError('Invalid classification suggestion: ' + key)
        classification[key] = {'value': confirmed.get(key, 'unknown'), 'source': 'restaurant' if key in confirmed else 'unconfirmed', 'suggested_value': suggestion['value'], 'reason': suggestion['reason']}
    possible = data.get('possible_allergens')
    if not isinstance(possible, list) or any(not isinstance(x, str) for x in possible):
        raise ValueError('possible_allergens must be strings.')
    classification['allergens'] = {'confirmed': confirmed.get('allergens', []), 'possible': list(dict.fromkeys(possible)), 'status': 'restaurant_confirmed' if 'allergens' in confirmed else 'unknown', 'list_complete': confirmed.get('allergens_complete', False) if 'allergens' in confirmed else False, 'cross_contact': 'unknown'}
    sources = {s['url']: s for s in search['sources']}
    facts = data.get('fun_facts')
    if not isinstance(facts, list):
        raise ValueError('fun_facts must be an array.')
    accepted = []
    quote_words = {}
    for fact in facts[:2]:
        if not isinstance(fact, dict):
            warnings.append('Dropped malformed fun fact.')
            continue
        url, quote = fact.get('source_url'), fact.get('source_quote')
        trans = fact.get('translations')
        valid = isinstance(url, str) and url in sources and isinstance(quote, str) and bool(quote.strip())
        valid = valid and isinstance(fact.get('text'), str) and bool(fact['text'].strip())
        valid = valid and isinstance(trans, dict) and set(trans) == set(languages) and all(isinstance(v, str) and v.strip() for v in trans.values())
        if valid:
            words = len(quote.split())
            valid = ' '.join(quote.split()) in ' '.join(sources[url]['text'].split()) and words <= 20 and quote_words.get(url, 0) + words <= 25
        if not valid:
            warnings.append('Dropped fun fact with missing source, unsupported quote or invalid translations.')
            continue
        quote_words[url] = quote_words.get(url, 0) + words
        accepted.append({'text': fact['text'], 'translations': trans, 'source_url': url, 'source_title': sources[url]['title'], 'source_quote': quote, 'needs_review': True})
    product = {key: original.get(key) for key in ('id', 'category_id', 'category_name', 'name', 'price', 'currency', 'portion', 'source_images')}
    product.update({'original_description': original['description'], 'description': data['description'], 'description_generated': True, 'source_language': data['source_language'], 'translations': translations, 'confirmed_ingredients': confirmed.get('ingredients', []), 'classification': classification, 'fun_facts': accepted, 'nutrition': {'calories_kcal': None, 'status': 'unknown'}, 'needs_review': True, 'publication_status': 'draft'})
    table = context['table_image_url']
    image_prompt = data['image_prompt']
    request = {'model': image_model, 'prompt': image_prompt, 'n': 1}
    endpoint = 'https://api.x.ai/v1/images/generations'
    if table:
        endpoint = 'https://api.x.ai/v1/images/edits'
        request['image'] = {'url': table, 'type': 'image_url'}
    product['image'] = {'status': 'pending', 'url': None, 'generated': True, 'is_actual_dish_photo': False, 'needs_review': True, 'prompt': image_prompt, 'model': image_model, 'reference_used': bool(table), 'url_is_temporary': True}
    payload = {'schema_version': '0.0.1', 'workflow_version': '0.0.2', 'workflow': 'product', 'product': product, 'warnings': list(dict.fromkeys(warnings)), 'processing': {'text': 'ok', 'search': search['status'], 'facts': 'sourced_draft' if accepted else 'empty', 'image': 'pending'}}
    return {'draft_json': json.dumps(payload, ensure_ascii=False, allow_nan=False), 'image_endpoint': endpoint, 'image_body': json.dumps(request, ensure_ascii=False)}
