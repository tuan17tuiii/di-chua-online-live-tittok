import urllib.request
import urllib.parse
import json

headers = {'User-Agent': 'ChanhDienTemple/1.0 (contact: admin@chanhdien.org)'}
titles = [
    'File:Do you Shakuhachi (Antti Luode).mp3',
    'File:Indore (ISRC USUAN1600041).mp3',
    'File:Meditation Impromptu 01 (ISRC USUAN1100163).mp3',
    'File:Meditation Impromptu 02 (ISRC USUAN1100162).mp3',
    'File:Organic Meditations Three (ISRC USUAN1100759).mp3'
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
