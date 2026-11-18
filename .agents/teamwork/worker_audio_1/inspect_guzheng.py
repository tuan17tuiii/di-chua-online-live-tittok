import urllib.request
import urllib.parse
import json

headers = {'User-Agent': 'ChanhDienTemple/1.0 (contact: admin@chanhdien.org)'}
titles = [
    'File:Do you Shakuhachi (Antti Luode).mp3',
    'File:Guzheng Morning (Antti Luode).mp3',
    'File:Senor Guzheng and the Happy Monks (Antti Luode).mp3'
]

url = f"https://commons.wikimedia.org/w/api.php?action=query&titles={'|'.join([urllib.parse.quote(t) for t in titles])}&prop=imageinfo&iiprop=url|size|mime|metadata&format=json"
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    for page_id, page_info in data['query']['pages'].items():
        title = page_info['title']
        if 'imageinfo' in page_info:
            info = page_info['imageinfo'][0]
            print(f"Title: {title}")
            print(f"  URL: {info['url']}")
            print(f"  Size: {info['size']} bytes")
            print(f"  Mime: {info['mime']}")
