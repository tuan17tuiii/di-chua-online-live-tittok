from PIL import Image, ImageDraw
import math

def test_supersampling():
    fw, fh = 212, 300
    scale = 3
    sw, sh = fw * scale, fh * scale
    
    img = Image.new('RGBA', (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw body at 3x
    cx = sw // 2
    cy = sh - 60
    # Head
    draw.ellipse([cx - 40, cy - 380, cx + 40, cy - 300], fill=(235, 195, 160, 255), outline=(180, 130, 90, 255), width=3)
    # Robe
    points = [(cx - 100, cy), (cx + 100, cy), (cx + 60, cy - 280), (cx - 60, cy - 280)]
    draw.polygon(points, fill=(92, 111, 132, 255), outline=(60, 75, 90, 255))
    
    # Downsample
    res = img.resize((fw, fh), Image.Resampling.LANCZOS)
    print("Resized successfully:", res.size, res.mode)

test_supersampling()
