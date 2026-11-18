import os
import requests
from PIL import Image, ImageEnhance, ImageFilter

os.makedirs('temp_assets', exist_ok=True)
os.makedirs('assets/backgrounds', exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://commons.wikimedia.org/'
}

def download_and_crop(url, out_jpg, target_w=1080, target_h=1920, night_mode=False):
    print(f"Downloading from {url}...")
    r = requests.get(url, headers=headers, timeout=30)
    if r.status_code != 200:
        raise Exception(f"HTTP {r.status_code} while fetching {url}")
    
    import io
    im = Image.open(io.BytesIO(r.content)).convert('RGB')
    orig_w, orig_h = im.size
    print(f"Original size: {orig_w}x{orig_h}")
    
    # Calculate crop box for target aspect ratio 9:16
    target_aspect = target_w / target_h
    orig_aspect = orig_w / orig_h
    
    if orig_aspect > target_aspect:
        # Crop width (center crop)
        new_w = int(orig_h * target_aspect)
        left = (orig_w - new_w) // 2
        im = im.crop((left, 0, left + new_w, orig_h))
    else:
        # Crop height (center/upper crop)
        new_h = int(orig_w / target_aspect)
        top = (orig_h - new_h) // 3  # slightly higher than center
        im = im.crop((0, top, orig_w, top + new_h))
        
    im = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    if night_mode:
        # Adjust colors for meditative night atmosphere
        # Cool blue tint + contrast + glow
        r_ch, g_ch, b_ch = im.split()
        r_ch = r_ch.point(lambda i: int(i * 0.72))
        g_ch = g_ch.point(lambda i: int(i * 0.85))
        b_ch = b_ch.point(lambda i: int(min(255, i * 1.15)))
        im = Image.merge('RGB', (r_ch, g_ch, b_ch))
        enhancer = ImageEnhance.Contrast(im)
        im = enhancer.enhance(1.15)
    else:
        # Warm sacred temple interior grading
        r_ch, g_ch, b_ch = im.split()
        r_ch = r_ch.point(lambda i: int(min(255, i * 1.12)))
        g_ch = g_ch.point(lambda i: int(i * 0.96))
        b_ch = b_ch.point(lambda i: int(i * 0.84))
        im = Image.merge('RGB', (r_ch, g_ch, b_ch))
        enhancer = ImageEnhance.Contrast(im)
        im = enhancer.enhance(1.12)
        
    im.save(out_jpg, 'JPEG', quality=93, optimize=True)
    print(f"Saved {out_jpg} ({os.path.getsize(out_jpg)} bytes, size={im.size})")

# 1. Hall
url_hall = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Interior_of_the_Main_Hall%2C_Lukang_Longshan_Temple-03.2023-07-13.jpg'
download_and_crop(url_hall, 'assets/backgrounds/hall.jpg', 1080, 1920, night_mode=False)

# 2. Zen Garden
url_zen = 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Pond_with_stone_lantern_and_waterfall%2C_Strolling_Pond_Garden%2C_Portland_Japanese_Garden.jpg'
download_and_crop(url_zen, 'assets/backgrounds/zen_garden.jpg', 1080, 1920, night_mode=True)
