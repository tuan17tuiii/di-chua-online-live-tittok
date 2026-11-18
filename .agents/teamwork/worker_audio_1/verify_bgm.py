import os

for fname in ['music1.mp3', 'music2.mp3']:
    path = os.path.join('assets/audio/bgm', fname)
    size = os.path.getsize(path)
    with open(path, 'rb') as f:
        head = f.read(128)
    # Check ID3 or MPEG frame sync (0xFF 0xFB or 0xFF 0xFA or 0xFF 0xF3)
    has_id3 = head.startswith(b'ID3')
    has_sync = False
    for i in range(len(head) - 1):
        if head[i] == 0xFF and (head[i+1] & 0xE0) == 0xE0:
            has_sync = True
            break
    print(f"{fname}: size={size} bytes, has_id3={has_id3}, has_sync={has_sync}")
