import os
import math
from PIL import Image, ImageDraw, ImageFilter

os.makedirs('assets/altar', exist_ok=True)

def render_lotus_pedestal(draw, cx, cy, rx, ry, petal_color=(255, 215, 0, 255), outline=(184, 134, 11, 255)):
    # Tier 1 base
    draw.ellipse([cx - rx - 20, cy + 30 - ry//2, cx + rx + 20, cy + 30 + ry//2], fill=(120, 80, 30, 255), outline=outline, width=4)
    # Double-tiered lotus petals
    # Downturned lower petals
    num_petals = 16
    for i in range(num_petals):
        ang = (i * math.pi) / (num_petals - 1)
        px = cx + int((rx + 10) * math.cos(ang))
        py = cy + 15 + int((ry * 0.4) * math.sin(ang))
        draw.polygon([(px - 25, py - 10), (px + 25, py - 10), (px, py + 35)], fill=(218, 165, 32, 255), outline=outline, width=3)
    # Upturned upper petals
    for i in range(num_petals):
        ang = (i * math.pi) / (num_petals - 1)
        px = cx + int((rx - 5) * math.cos(ang))
        py = cy - int((ry * 0.3) * math.sin(ang))
        draw.polygon([(px - 22, py + 15), (px + 22, py + 15), (px, py - 35)], fill=petal_color, outline=outline, width=3)
        draw.line([(px, py + 10), (px, py - 30)], fill=(255, 250, 180, 255), width=3)
    # Top seat oval
    draw.ellipse([cx - rx + 10, cy - ry//2, cx + rx - 10, cy + ry//2], fill=petal_color, outline=outline, width=4)
    draw.ellipse([cx - rx + 30, cy - ry//3, cx + rx - 30, cy + ry//3], fill=(255, 240, 150, 255))

def generate_statue_shakyamuni(out_path):
    # Target: 420x680, supersample at 3x (1260x2040)
    w, h = 1260, 2040
    cx = w // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    gold_dark = (140, 95, 25, 255)
    gold_mid = (218, 165, 32, 255)
    gold_light = (255, 215, 64, 255)
    gold_hi = (255, 248, 180, 255)
    robe_gold = (200, 130, 20, 255)

    base_cy = 1820
    seat_cy = 1710
    chest_cy = 1200
    head_cy = 820

    # 1. Radiant Nimbus / Back Halo Disk
    halo_cy = 860
    halo_r = 380
    for r in range(halo_r, 0, -5):
        a = int(140 * (1.0 - (r / halo_r)**2))
        draw.ellipse([cx - r, halo_cy - r, cx + r, halo_cy + r], fill=(255, 215, 0, a))
    draw.ellipse([cx - halo_r, halo_cy - halo_r, cx + halo_r, halo_cy + halo_r], outline=(255, 235, 120, 200), width=8)

    # 2. Golden Lotus Pedestal Base
    render_lotus_pedestal(draw, cx, base_cy, 480, 180, gold_light, gold_dark)

    # 3. Crossed Legs in Full Lotus Posture (Kiết già)
    leg_left_pts = [(cx - 430, seat_cy + 90), (cx - 240, seat_cy - 80), (cx, seat_cy + 30), (cx - 300, seat_cy + 130)]
    leg_right_pts = [(cx + 430, seat_cy + 90), (cx + 240, seat_cy - 80), (cx, seat_cy + 30), (cx + 300, seat_cy + 130)]
    draw.polygon(leg_left_pts, fill=robe_gold, outline=gold_dark, width=5)
    draw.polygon(leg_right_pts, fill=robe_gold, outline=gold_dark, width=5)
    # Sole of right foot turned upward resting on left thigh
    draw.ellipse([cx - 90, seat_cy - 60, cx + 50, seat_cy], fill=gold_light, outline=gold_dark, width=4)

    # 4. Torso & Monastic Robe
    torso_pts = [
        (cx - 240, chest_cy - 160),  # left shoulder
        (cx + 240, chest_cy - 160),  # right shoulder
        (cx + 290, chest_cy + 120),  # right waist
        (cx + 340, seat_cy - 20),
        (cx - 340, seat_cy - 20),
        (cx - 290, chest_cy + 120)
    ]
    draw.polygon(torso_pts, fill=robe_gold, outline=gold_dark, width=6)
    
    # Bare right shoulder & golden chest
    chest_pts = [(cx - 70, chest_cy - 150), (cx + 230, chest_cy - 150), (cx + 250, chest_cy + 50), (cx + 60, chest_cy + 180), (cx - 70, chest_cy + 30)]
    draw.polygon(chest_pts, fill=gold_light, outline=gold_dark, width=5)
    draw.line([(cx + 80, chest_cy - 130), (cx + 80, chest_cy + 80)], fill=gold_hi, width=12)

    # Monastic robe folds cascading from left shoulder
    robe_folds = [
        [(cx - 220, chest_cy - 140), (cx - 20, chest_cy + 220)],
        [(cx - 170, chest_cy - 110), (cx + 30, chest_cy + 240)],
        [(cx - 240, chest_cy), (cx - 80, chest_cy + 260)]
    ]
    for pts in robe_folds:
        draw.line(pts, fill=gold_dark, width=8)
        draw.line([(pts[0][0]+6, pts[0][1]), (pts[1][0]+6, pts[1][1])], fill=gold_hi, width=6)

    # 5. Arms & Mudra
    # Left Arm: Resting in lap, palm up holding golden alms bowl
    draw.polygon([(cx - 240, chest_cy - 160), (cx - 280, chest_cy + 150), (cx - 90, seat_cy - 40), (cx - 160, chest_cy + 30)], fill=robe_gold, outline=gold_dark, width=5)
    # Left hand in lap
    draw.ellipse([cx - 110, seat_cy - 90, cx + 40, seat_cy - 30], fill=gold_light, outline=gold_dark, width=4)
    # Golden alms bowl (Bát khất thực) in left hand
    draw.ellipse([cx - 80, seat_cy - 130, cx + 60, seat_cy - 50], fill=(255, 235, 120, 255), outline=gold_dark, width=5)
    draw.ellipse([cx - 65, seat_cy - 120, cx + 45, seat_cy - 85], fill=(180, 120, 20, 255))

    # Right Arm: Bhumisparsha Mudra (reaching down over knee to touch the earth)
    draw.polygon([(cx + 240, chest_cy - 160), (cx + 330, chest_cy + 150), (cx + 340, seat_cy + 80), (cx + 230, chest_cy + 120)], fill=gold_light, outline=gold_dark, width=5)
    draw.line([(cx + 270, chest_cy - 90), (cx + 300, chest_cy + 140)], fill=gold_hi, width=10)
    # Right hand pointing downward touching lotus seat
    hand_pts = [(cx + 290, seat_cy + 50), (cx + 350, seat_cy + 50), (cx + 340, seat_cy + 170), (cx + 290, seat_cy + 150)]
    draw.polygon(hand_pts, fill=gold_light, outline=gold_dark, width=4)
    # Fingers touching earth
    for fx in range(cx + 300, cx + 345, 10):
        draw.line([(fx, seat_cy + 140), (fx - 4, seat_cy + 185)], fill=gold_mid, width=4)

    # 6. Neck & Head
    # Three auspicious neck lines (tam đạo chỉ)
    draw.polygon([(cx - 75, head_cy + 170), (cx + 75, head_cy + 170), (cx + 90, chest_cy - 150), (cx - 90, chest_cy - 150)], fill=gold_light, outline=gold_dark, width=4)
    for ny in [head_cy + 195, head_cy + 225, head_cy + 255]:
        draw.line([(cx - 50, ny), (cx + 50, ny)], fill=gold_dark, width=4)

    # Head oval (serene compassionate face)
    draw.ellipse([cx - 155, head_cy - 160, cx + 155, head_cy + 175], fill=gold_light, outline=gold_dark, width=6)
    draw.ellipse([cx - 100, head_cy - 100, cx + 100, head_cy + 100], fill=gold_hi)

    # Elongated earlobes
    draw.ellipse([cx - 180, head_cy - 30, cx - 140, head_cy + 150], fill=gold_light, outline=gold_dark, width=4)
    draw.ellipse([cx + 140, head_cy - 30, cx + 180, head_cy + 150], fill=gold_light, outline=gold_dark, width=4)

    # Snail Curls Hair (Xoắn ốc) & Ushnisha
    # Ushnisha base
    draw.ellipse([cx - 165, head_cy - 240, cx + 165, head_cy - 30], fill=(60, 45, 30, 255), outline=gold_dark, width=4)
    # Ushnisha top mound
    draw.ellipse([cx - 75, head_cy - 330, cx + 75, head_cy - 180], fill=(60, 45, 30, 255), outline=gold_dark, width=4)
    # Golden jewel atop ushnisha (nhục kế châu)
    draw.ellipse([cx - 25, head_cy - 370, cx + 25, head_cy - 310], fill=(255, 235, 120, 255), outline=gold_dark, width=4)
    draw.ellipse([cx - 10, head_cy - 355, cx + 10, head_cy - 325], fill=(255, 255, 255, 255))

    # Facial features (serene meditative expression)
    # Urna (white gem between eyebrows)
    draw.ellipse([cx - 12, head_cy - 40, cx + 12, head_cy - 16], fill=(255, 255, 255, 255), outline=gold_dark, width=2)
    # Eyebrows (arching gracefully like crescent moons)
    draw.arc([cx - 110, head_cy - 60, cx - 15, head_cy], start=200, end=340, fill=gold_dark, width=5)
    draw.arc([cx + 15, head_cy - 60, cx + 110, head_cy], start=200, end=340, fill=gold_dark, width=5)
    # Eyes (gently downcast, mindful meditation)
    draw.arc([cx - 95, head_cy - 20, cx - 25, head_cy + 30], start=20, end=160, fill=(70, 40, 20, 255), width=6)
    draw.arc([cx + 25, head_cy - 20, cx + 95, head_cy + 30], start=20, end=160, fill=(70, 40, 20, 255), width=6)
    # Nose (straight, noble)
    draw.line([(cx, head_cy - 20), (cx, head_cy + 60)], fill=gold_dark, width=4)
    draw.arc([cx - 28, head_cy + 40, cx + 28, head_cy + 75], start=0, end=180, fill=gold_dark, width=4)
    # Lips (gentle, benevolent smile)
    draw.arc([cx - 45, head_cy + 90, cx + 45, head_cy + 130], start=20, end=160, fill=(180, 50, 40, 255), width=6)
    draw.line([(cx - 40, head_cy + 100), (cx + 40, head_cy + 100)], fill=(160, 40, 30, 255), width=4)

    res = img.resize((420, 680), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG')
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")

def generate_statue_amitabha(out_path):
    # Target: 420x680, supersample at 3x (1260x2040)
    w, h = 1260, 2040
    cx = w // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    gold_dark = (140, 95, 25, 255)
    gold_mid = (218, 165, 32, 255)
    gold_light = (255, 215, 64, 255)
    gold_hi = (255, 248, 180, 255)
    robe_crimson = (168, 28, 42, 255)
    robe_gold = (235, 160, 35, 255)

    base_cy = 1820
    seat_cy = 1710
    chest_cy = 1200
    head_cy = 820

    # 1. Great Radiant Welcoming Aura (Hào quang tiếp dẫn)
    halo_cy = 860
    halo_r = 440
    # Outer radiating light spikes
    for i in range(32):
        ang = (i * 2 * math.pi) / 32
        px = cx + int(halo_r * math.cos(ang))
        py = halo_cy + int(halo_r * math.sin(ang))
        draw.line([(cx, halo_cy), (px, py)], fill=(255, 220, 90, 80), width=6)
    # Multi-layered concentric golden rings
    for r in range(halo_r - 20, 0, -6):
        a = int(160 * (1.0 - (r / halo_r)**1.8))
        draw.ellipse([cx - r, halo_cy - r, cx + r, halo_cy + r], fill=(255, 200, 30, a))
    draw.ellipse([cx - halo_r + 30, halo_cy - halo_r + 30, cx + halo_r - 30, halo_cy + halo_r - 30], outline=(255, 245, 150, 220), width=10)

    # 2. Golden Lotus Pedestal Base
    render_lotus_pedestal(draw, cx, base_cy, 480, 180, (255, 215, 0, 255), gold_dark)

    # 3. Crossed Legs in Padmasana
    leg_left_pts = [(cx - 430, seat_cy + 90), (cx - 240, seat_cy - 80), (cx, seat_cy + 30), (cx - 300, seat_cy + 130)]
    leg_right_pts = [(cx + 430, seat_cy + 90), (cx + 240, seat_cy - 80), (cx, seat_cy + 30), (cx + 300, seat_cy + 130)]
    draw.polygon(leg_left_pts, fill=robe_crimson, outline=gold_dark, width=5)
    draw.polygon(leg_right_pts, fill=robe_crimson, outline=gold_dark, width=5)
    # Gold embroidered hem on legs
    draw.arc([cx - 280, seat_cy - 40, cx + 280, seat_cy + 100], start=20, end=160, fill=gold_light, width=12)

    # 4. Torso with Double-Shouldered Kasaya Robe (Pure Land style)
    torso_pts = [
        (cx - 240, chest_cy - 160),
        (cx + 240, chest_cy - 160),
        (cx + 290, chest_cy + 120),
        (cx + 340, seat_cy - 20),
        (cx - 340, seat_cy - 20),
        (cx - 290, chest_cy + 120)
    ]
    draw.polygon(torso_pts, fill=robe_crimson, outline=gold_dark, width=6)
    # Inner golden garment & Swastika (chữ Vạn kim quang) on chest
    draw.polygon([(cx - 90, chest_cy - 150), (cx + 90, chest_cy - 150), (cx + 60, chest_cy + 50), (cx - 60, chest_cy + 50)], fill=gold_light, outline=gold_dark, width=4)
    # Auspicious Swastika symbol
    draw.line([(cx - 30, chest_cy - 60), (cx + 30, chest_cy - 60)], fill=gold_dark, width=6)
    draw.line([(cx, chest_cy - 90), (cx, chest_cy - 30)], fill=gold_dark, width=6)
    draw.line([(cx - 30, chest_cy - 90), (cx - 30, chest_cy - 60)], fill=gold_dark, width=6)
    draw.line([(cx + 30, chest_cy - 30), (cx + 30, chest_cy - 60)], fill=gold_dark, width=6)
    draw.line([(cx, chest_cy - 90), (cx + 30, chest_cy - 90)], fill=gold_dark, width=6)
    draw.line([(cx - 30, chest_cy - 30), (cx, chest_cy - 30)], fill=gold_dark, width=6)

    # Cascading golden robe borders
    draw.line([(cx - 240, chest_cy - 160), (cx - 70, seat_cy - 30)], fill=gold_light, width=14)
    draw.line([(cx + 240, chest_cy - 160), (cx + 70, seat_cy - 30)], fill=gold_light, width=14)

    # 5. Hands: Dhyana / Welcoming Mudra
    # Left hand in lap
    draw.ellipse([cx - 80, seat_cy - 70, cx + 80, seat_cy - 10], fill=gold_light, outline=gold_dark, width=4)
    # Right hand raised in welcoming / vitarka teaching mudra
    draw.polygon([(cx + 170, chest_cy - 120), (cx + 230, chest_cy - 30), (cx + 160, chest_cy + 70), (cx + 110, chest_cy - 10)], fill=robe_crimson, outline=gold_dark, width=4)
    # Hand palm facing forward with thumb and index touching
    draw.ellipse([cx + 140, chest_cy - 110, cx + 220, chest_cy - 20], fill=gold_light, outline=gold_dark, width=4)
    draw.ellipse([cx + 160, chest_cy - 85, cx + 195, chest_cy - 50], outline=gold_dark, width=3) # mudra ring

    # 6. Neck & Head
    draw.polygon([(cx - 75, head_cy + 170), (cx + 75, head_cy + 170), (cx + 90, chest_cy - 150), (cx - 90, chest_cy - 150)], fill=gold_light, outline=gold_dark, width=4)
    draw.ellipse([cx - 155, head_cy - 160, cx + 155, head_cy + 175], fill=gold_light, outline=gold_dark, width=6)
    draw.ellipse([cx - 100, head_cy - 100, cx + 100, head_cy + 100], fill=gold_hi)

    # Ears
    draw.ellipse([cx - 180, head_cy - 30, cx - 140, head_cy + 150], fill=gold_light, outline=gold_dark, width=4)
    draw.ellipse([cx + 140, head_cy - 30, cx + 180, head_cy + 150], fill=gold_light, outline=gold_dark, width=4)

    # Hair & Ushnisha
    draw.ellipse([cx - 165, head_cy - 240, cx + 165, head_cy - 30], fill=(55, 40, 25, 255), outline=gold_dark, width=4)
    draw.ellipse([cx - 75, head_cy - 330, cx + 75, head_cy - 180], fill=(55, 40, 25, 255), outline=gold_dark, width=4)
    draw.ellipse([cx - 25, head_cy - 370, cx + 25, head_cy - 310], fill=(255, 50, 50, 255), outline=gold_dark, width=4) # ruby gem

    # Facial features
    draw.ellipse([cx - 12, head_cy - 40, cx + 12, head_cy - 16], fill=(255, 255, 255, 255), outline=gold_dark, width=2)
    draw.arc([cx - 110, head_cy - 60, cx - 15, head_cy], start=200, end=340, fill=gold_dark, width=5)
    draw.arc([cx + 15, head_cy - 60, cx + 110, head_cy], start=200, end=340, fill=gold_dark, width=5)
    draw.arc([cx - 95, head_cy - 20, cx - 25, head_cy + 30], start=20, end=160, fill=(70, 40, 20, 255), width=6)
    draw.arc([cx + 25, head_cy - 20, cx + 95, head_cy + 30], start=20, end=160, fill=(70, 40, 20, 255), width=6)
    draw.line([(cx, head_cy - 20), (cx, head_cy + 60)], fill=gold_dark, width=4)
    draw.arc([cx - 28, head_cy + 40, cx + 28, head_cy + 75], start=0, end=180, fill=gold_dark, width=4)
    draw.arc([cx - 45, head_cy + 90, cx + 45, head_cy + 130], start=20, end=160, fill=(190, 45, 45, 255), width=6)
    draw.line([(cx - 40, head_cy + 100), (cx + 40, head_cy + 100)], fill=(160, 35, 35, 255), width=4)

    res = img.resize((420, 680), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG')
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")

def generate_statue_avalokiteshvara(out_path):
    # Target: 420x680, supersample at 3x (1260x2040)
    w, h = 1260, 2040
    cx = w // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    robe_white = (248, 250, 252, 255)
    robe_shade = (207, 216, 220, 255)
    skin_gold = (255, 228, 180, 255)
    gold = (218, 165, 32, 255)
    gold_dark = (140, 95, 25, 255)
    gold_hi = (255, 235, 140, 255)

    base_cy = 1820
    seat_cy = 1710
    chest_cy = 1200
    head_cy = 820

    # 1. Radiant Nimbus (Soft white & gold lotus halo)
    halo_cy = 860
    halo_r = 400
    for r in range(halo_r, 0, -5):
        a = int(120 * (1.0 - (r / halo_r)**2))
        draw.ellipse([cx - r, halo_cy - r, cx + r, halo_cy + r], fill=(255, 248, 220, a))
    draw.ellipse([cx - halo_r, halo_cy - halo_r, cx + halo_r, halo_cy + halo_r], outline=(255, 215, 0, 180), width=6)

    # 2. Pink & Golden Lotus Pedestal Base
    render_lotus_pedestal(draw, cx, base_cy, 480, 180, (255, 182, 193, 255), (194, 24, 91, 255))

    # 3. Flowing White Robes on Crossed Legs
    leg_left_pts = [(cx - 430, seat_cy + 90), (cx - 240, seat_cy - 80), (cx, seat_cy + 30), (cx - 300, seat_cy + 130)]
    leg_right_pts = [(cx + 430, seat_cy + 90), (cx + 240, seat_cy - 80), (cx, seat_cy + 30), (cx + 300, seat_cy + 130)]
    draw.polygon(leg_left_pts, fill=robe_white, outline=robe_shade, width=5)
    draw.polygon(leg_right_pts, fill=robe_white, outline=robe_shade, width=5)
    # Flowing silk hem folds
    for fx in range(-320, 340, 80):
        draw.line([(cx + fx, seat_cy + 40), (cx + fx + 30, seat_cy + 120)], fill=robe_shade, width=5)

    # 4. Torso with Celestial White Veil & Jewelry
    torso_pts = [
        (cx - 220, chest_cy - 160),
        (cx + 220, chest_cy - 160),
        (cx + 270, chest_cy + 120),
        (cx + 320, seat_cy - 20),
        (cx - 320, seat_cy - 20),
        (cx - 270, chest_cy + 120)
    ]
    draw.polygon(torso_pts, fill=robe_white, outline=robe_shade, width=6)
    
    # Jade & Gold Necklace (Chuỗi ngọc anh lạc)
    draw.arc([cx - 120, chest_cy - 140, cx + 120, chest_cy], start=10, end=170, fill=gold, width=8)
    draw.arc([cx - 160, chest_cy - 120, cx + 160, chest_cy + 70], start=10, end=170, fill=gold, width=6)
    for bx in [-80, -40, 0, 40, 80]:
        draw.ellipse([cx + bx - 10, chest_cy + 25, cx + bx + 10, chest_cy + 45], fill=(0, 188, 212, 255), outline=gold, width=2)

    # 5. Left Hand: Holding the Pure Water Vase (Bình Cam Lộ)
    draw.polygon([(cx - 220, chest_cy - 150), (cx - 280, chest_cy + 120), (cx - 110, seat_cy - 50), (cx - 160, chest_cy + 40)], fill=robe_white, outline=robe_shade, width=5)
    # Left hand
    draw.ellipse([cx - 140, seat_cy - 110, cx - 60, seat_cy - 40], fill=skin_gold, outline=gold, width=3)
    # Sacred Cam Lo Vase (Bình tịnh thủy)
    vx, vy = cx - 100, seat_cy - 130
    draw.polygon([(vx - 35, vy + 70), (vx + 35, vy + 70), (vx + 45, vy), (vx + 18, vy - 60), (vx - 18, vy - 60), (vx - 45, vy)], fill=(255, 255, 255, 255), outline=gold, width=4)
    draw.ellipse([vx - 22, vy - 70, vx + 22, vy - 50], fill=gold, outline=robe_shade, width=2)
    # Golden neck ring
    draw.line([(vx - 25, vy), (vx + 25, vy)], fill=gold, width=4)

    # 6. Right Hand: Raising the Willow Branch (Nhành Dương Liễu)
    draw.polygon([(cx + 220, chest_cy - 150), (cx + 290, chest_cy - 30), (cx + 210, chest_cy + 40), (cx + 150, chest_cy - 40)], fill=robe_white, outline=robe_shade, width=5)
    # Hand gracefully raising branch
    draw.ellipse([cx + 180, chest_cy - 100, cx + 250, chest_cy - 20], fill=skin_gold, outline=gold, width=3)
    # Willow Branch (Nhành dương liễu)
    wx, wy = cx + 240, chest_cy - 80
    draw.line([(wx - 30, wy + 60), (wx + 80, wy - 180)], fill=(76, 175, 80, 255), width=7)
    # Delicate willow leaves
    leaf_offsets = [(0, 0), (25, -40), (50, -80), (70, -120), (85, -160)]
    for lx, ly in leaf_offsets:
        draw.arc([wx + lx - 25, wy + ly - 15, wx + lx + 15, wy + ly + 15], start=30, end=160, fill=(129, 199, 132, 255), width=5)
        draw.arc([wx + lx, wy + ly - 15, wx + lx + 40, wy + ly + 15], start=20, end=150, fill=(102, 187, 106, 255), width=5)

    # 7. White Cowl / Veil draped over Head
    draw.polygon([(cx - 200, head_cy + 170), (cx + 200, head_cy + 170), (cx + 170, head_cy - 200), (cx - 170, head_cy - 200)], fill=robe_white, outline=robe_shade, width=6)

    # Head Oval
    draw.ellipse([cx - 140, head_cy - 150, cx + 140, head_cy + 160], fill=skin_gold, outline=gold, width=5)
    draw.ellipse([cx - 90, head_cy - 90, cx + 90, head_cy + 90], fill=(255, 245, 230, 255))

    # Ornate Golden Crown with Amitabha figure
    draw.polygon([(cx - 130, head_cy - 140), (cx + 130, head_cy - 140), (cx + 110, head_cy - 280), (cx, head_cy - 330), (cx - 110, head_cy - 280)], fill=gold, outline=gold_dark, width=5)
    draw.ellipse([cx - 25, head_cy - 260, cx + 25, head_cy - 210], fill=(255, 80, 80, 255), outline=gold_hi, width=3) # Amitabha gem

    # Facial features (Gentle, maternal, infinitely compassionate)
    draw.ellipse([cx - 10, head_cy - 35, cx + 10, head_cy - 15], fill=(255, 60, 60, 255)) # red bindi/urna
    draw.arc([cx - 100, head_cy - 50, cx - 15, head_cy + 5], start=200, end=340, fill=(80, 50, 30, 255), width=4)
    draw.arc([cx + 15, head_cy - 50, cx + 100, head_cy + 5], start=200, end=340, fill=(80, 50, 30, 255), width=4)
    draw.arc([cx - 85, head_cy - 15, cx - 25, head_cy + 25], start=20, end=160, fill=(60, 40, 25, 255), width=5)
    draw.arc([cx + 25, head_cy - 15, cx + 85, head_cy + 25], start=20, end=160, fill=(60, 40, 25, 255), width=5)
    draw.line([(cx, head_cy - 15), (cx, head_cy + 55)], fill=gold, width=3)
    draw.arc([cx - 24, head_cy + 40, cx + 24, head_cy + 70], start=0, end=180, fill=gold, width=3)
    draw.arc([cx - 40, head_cy + 85, cx + 40, head_cy + 120], start=20, end=160, fill=(229, 57, 53, 255), width=6)
    draw.line([(cx - 35, head_cy + 95), (cx + 35, head_cy + 95)], fill=(211, 47, 47, 255), width=4)

    res = img.resize((420, 680), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG')
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")

generate_statue_shakyamuni('assets/altar/statue_shakyamuni.png')
generate_statue_amitabha('assets/altar/statue_amitabha.png')
generate_statue_avalokiteshvara('assets/altar/statue_avalokiteshvara.png')
