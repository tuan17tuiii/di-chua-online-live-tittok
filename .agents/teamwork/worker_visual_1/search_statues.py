import requests
import sys

sys.stdout.reconfigure(encoding='utf-8')
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://commons.wikimedia.org/'
}

def search(q, limit=6):
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
    for pid, p in r.get('query', {}).get('pages', {}).items():
        info = p.get('imageinfo', [{}])[0]
        print(p.get('title'), info.get('width'), 'x', info.get('height'), info.get('url'))

print('=== Shakyamuni Buddha ===')
search('Shakyamuni Buddha statue lotus bhumisparsha', 6)

print('\n=== Amitabha Buddha ===')
search('Amitabha Buddha statue golden seated', 6)

print('\n=== Avalokiteshvara Guanyin ===')
search('Guanyin statue willow vase seated', 6)
