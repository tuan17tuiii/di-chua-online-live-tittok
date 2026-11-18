import urllib.request
import urllib.parse
import json

headers = {'User-Agent': 'ChanhDienTemple/1.0 (contact: admin@chanhdien.org)'}
queries = [
    'shakuhachi filemime:audio/mpeg',
    'koto filemime:audio/mpeg',
    'zither filemime:audio/mpeg',
    'meditation filemime:audio/mpeg',
    'flute meditation filemime:audio/mpeg'
]

for q in queries:
    url = f"https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(q)}&srnamespace=6&format=json"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        total = data['query']['searchinfo']['totalhits']
        print(f"=== Query: {q} ({total} hits) ===")
        for item in data['query']['search'][:5]:
            print(f"- {item['title']} (size: {item['size']})")
