# Appended to the immutable 0.0.6 product builder by build_fal.py.
# Keep the established prompt, reference order and validation contract.
_build_direct_xai = main


def main(raw: str, context_json: str, search_json: str, search_warnings: list, image_model: str) -> dict:
    context = json.loads(context_json)
    # Keep legacy input compatibility, but never send an advertisement to the image model.
    context['card_reference_url'] = ''
    context_json = json.dumps(context, ensure_ascii=False)
    result = _build_direct_xai(raw, context_json, search_json, search_warnings, image_model)
    original = json.loads(result['image_body'])
    references = original.get('images', [original['image']] if 'image' in original else [])
    model = 'xai/grok-imagine-image/v2.0/' + ('edit' if references else 'text-to-image')
    original['prompt'] += '\nTypography: render only the explicitly allowed English title and confirmed panel copy. Keep the bottom edge as uninterrupted tabletop, with no footer banner. Ignore all lettering found in reference photos. If no panels are approved, render only the title.'
    request = {'prompt': original['prompt'], 'num_images': 1, 'aspect_ratio': '1:1', 'output_format': 'jpeg', 'resolution': '1k'}
    if references:
        request['image_urls'] = [ref['url'] for ref in references]
    draft = json.loads(result['draft_json'])
    draft['workflow_version'] = '0.0.8'
    draft['product']['image'].update(provider='fal.ai', model=model, prompt=original['prompt'], card_style_source='text_preset')
    return {'draft_json': json.dumps(draft, ensure_ascii=False, allow_nan=False), 'image_endpoint': 'https://fal.run/' + model, 'image_body': json.dumps(request, ensure_ascii=False)}
