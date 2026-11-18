import urllib.request
import urllib.parse
import json

headers = {'User-Agent': 'ChanhDienTemple/1.0 (contact: admin@chanhdien.org)'}
queries = [
    'guzheng filemime:audio/mpeg',
    'koto solo filemime:audio/mpeg',
    'zither meditation filemime:audio/mpeg',
    'asian flute filemime:audio/mpeg',
    'oriental meditation filemime:audio/mpeg'
]

for q in queries:
    url = f"https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(q)}&srnamespace=6&format=json"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            total = data['query']['searchinfo']['totalhits']
            print(f"=== Query: {q} ({total} hits) ===")
            for item in data['query']['search'][:5]:
                print(f"- {item['title']}")
    except Exception as e:
        print(f"Error {q}: {e}")
