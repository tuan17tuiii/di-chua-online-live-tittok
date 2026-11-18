import urllib.request
import os

headers = {'User-Agent': 'ChanhDienTemple/1.0 (contact: admin@chanhdien.org)'}

urls = {
    'music1.mp3': 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Do_you_Shakuhachi_%28Antti_Luode%29.mp3',
    'music2.mp3': 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Guzheng_Morning_%28Antti_Luode%29.mp3'
}

os.makedirs('assets/audio/bgm', exist_ok=True)

for filename, url in urls.items():
    dest = os.path.join('assets/audio/bgm', filename)
    print(f"Downloading {filename} from {url}...")
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read()
        with open(dest, 'wb') as f:
            f.write(content)
    print(f"Saved {dest}: {len(content)} bytes.")
