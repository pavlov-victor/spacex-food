import json
from urllib.parse import urlparse


def main(body: str, status_code: float) -> dict:
    sources = []
    warnings = []
    status = 'failed'
    if 200 <= status_code < 300:
        try:
            data = json.loads(body)
            rows = data.get('results', [])
            if not isinstance(rows, list):
                raise ValueError('Invalid search results')
            for row in rows[:3]:
                if not isinstance(row, dict):
                    continue
                url, text = row.get('url', ''), row.get('text', '')
                if not isinstance(url, str) or urlparse(url).scheme not in ('https', 'http') or not isinstance(text, str) or not text.strip():
                    continue
                sources.append({'url': url, 'title': str(row.get('title', ''))[:300], 'text': text[:5000]})
            status = 'ok' if sources else 'empty'
        except (ValueError, TypeError, AttributeError):
            status = 'failed'
    if status != 'ok':
        warnings.append('Fun-fact search unavailable or returned no source text; facts must remain empty.')
    return {'search_json': json.dumps({'status': status, 'sources': sources}, ensure_ascii=False), 'warnings': warnings}
