import requests
import sys

sys.stdout.reconfigure(encoding='utf-8')
headers = {'User-Agent': 'ChanhDienBot/1.0 (contact: info@example.com)'}

def search_files(q, limit=10):
    url = 'https://commons.wikimedia.org/w/api.php'
    params = {
        'action': 'query',
        'generator': 'search',
        'gsrsearch': q,
        'gsrnamespace': 6,
        'gsrlimit': limit,
        'prop': 'imageinfo',
        'iiprop': 'url|size|mime',
        'format': 'json'
    }
    r = requests.get(url, params=params, headers=headers).json()
    results = []
    for pid, p in r.get('query', {}).get('pages', {}).items():
        info = p.get('imageinfo', [{}])[0]
        results.append({
            'title': p.get('title'),
            'width': info.get('width'),
            'height': info.get('height'),
            'mime': info.get('mime'),
            'url': info.get('url')
        })
    return results

print('=== Zen Garden ===')
for res in search_files('Zen garden pond rock bamboo', 8):
    if res.get('width') and res['width'] >= 1000:
        print(f"{res['title']} | {res['width']}x{res['height']} | {res['url']}")

print('\n=== Statues PNG ===')
for res in search_files('statue filemime:image/png buddha', 8):
    print(f"{res['title']} | {res['width']}x{res['height']} | {res['url']}")

print('\n=== Guanyin PNG ===')
for res in search_files('Guanyin filemime:image/png', 8):
    print(f"{res['title']} | {res['width']}x{res['height']} | {res['url']}")

print('\n=== Incense burner PNG ===')
for res in search_files('incense burner filemime:image/png', 8):
    print(f"{res['title']} | {res['width']}x{res['height']} | {res['url']}")
