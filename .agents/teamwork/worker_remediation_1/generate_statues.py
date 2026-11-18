"""
generate_statues.py — Ground-Truth Compliant Buddha & Bodhisattva Statue Generator
Author: Teamwork Remediation Worker (worker_remediation_1)
Dimensions:
  - statue_shakyamuni.png: 600 x 800 px (3x internal: 1800 x 2400)
  - statue_amitabha.png:   600 x 800 px (3x internal: 1800 x 2400)
  - statue_avalokiteshvara.png: 550 x 820 px (3x internal: 1650 x 2460)
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter

os.makedirs('assets/altar', exist_ok=True)

def render_lotus_pedestal_1800(draw, cx, cy, rx, ry, petal_color=(255, 215, 0, 255), outline=(184, 134, 11, 255)):
    """Renders high-resolution double-tiered golden lotus throne on 1800x2400 canvas."""
    # Tier 1 base plinth
    draw.ellipse([cx - rx - 30, cy + 40 - ry//2, cx + rx + 30, cy + 40 + ry//2], 
                 fill=(120, 80, 30, 255), outline=outline, width=6)
    
    # Tier 2: Downturned lower lotus petals
    num_petals = 18
    for i in range(num_petals):
        ang = (i * math.pi) / (num_petals - 1)
        px = cx + int((rx + 15) * math.cos(ang))
        py = cy + 20 + int((ry * 0.45) * math.sin(ang))
        draw.polygon([(px - 35, py - 15), (px + 35, py - 15), (px, py + 50)], 
                     fill=(218, 165, 32, 255), outline=outline, width=4)
        
    # Tier 3: Upturned upper lotus petals
    for i in range(num_petals):
        ang = (i * math.pi) / (num_petals - 1)
        px = cx + int((rx - 10) * math.cos(ang))
        py = cy - int((ry * 0.35) * math.sin(ang))
        draw.polygon([(px - 30, py + 20), (px + 30, py + 20), (px, py - 50)], 
                     fill=petal_color, outline=outline, width=4)
        draw.line([(px, py + 15), (px, py - 40)], fill=(255, 250, 180, 255), width=4)
        
    # Top seat oval plate
    draw.ellipse([cx - rx + 15, cy - ry//2, cx + rx - 15, cy + ry//2], 
                 fill=petal_color, outline=outline, width=6)
    draw.ellipse([cx - rx + 45, cy - ry//3, cx + rx - 45, cy + ry//3], 
                 fill=(255, 240, 150, 255))


def generate_statue_shakyamuni(out_path):
    # Ground-truth: 600 x 800, supersample 3x -> 1800 x 2400
    w, h = 1800, 2400
    cx = w // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    gold_dark = (140, 95, 25, 255)
    gold_mid = (218, 165, 32, 255)
    gold_light = (255, 215, 64, 255)
    gold_hi = (255, 248, 180, 255)
    robe_gold = (200, 130, 20, 255)

    base_cy = 2140
    seat_cy = 2010
    chest_cy = 1410
    head_cy = 960

    # 1. Radiant Nimbus / Back Halo Disk
    halo_cy = 1010
    halo_r = 450
    for r in range(halo_r, 0, -6):
        a = int(140 * (1.0 - (r / halo_r)**2))
        draw.ellipse([cx - r, halo_cy - r, cx + r, halo_cy + r], fill=(255, 215, 0, a))
    draw.ellipse([cx - halo_r, halo_cy - halo_r, cx + halo_r, halo_cy + halo_r], 
                 outline=(255, 235, 120, 200), width=10)

    # 2. Golden Lotus Pedestal Base (rx=570 fits comfortably within 1800 with 330px margin)
    render_lotus_pedestal_1800(draw, cx, base_cy, 570, 210, gold_light, gold_dark)

    # 3. Crossed Legs in Full Lotus Posture (Kiết già)
    leg_left_pts = [(cx - 510, seat_cy + 110), (cx - 280, seat_cy - 90), (cx, seat_cy + 35), (cx - 350, seat_cy + 150)]
    leg_right_pts = [(cx + 510, seat_cy + 110), (cx + 280, seat_cy - 90), (cx, seat_cy + 35), (cx + 350, seat_cy + 150)]
    draw.polygon(leg_left_pts, fill=robe_gold, outline=gold_dark, width=6)
    draw.polygon(leg_right_pts, fill=robe_gold, outline=gold_dark, width=6)
    # Sole of right foot turned upward
    draw.ellipse([cx - 110, seat_cy - 70, cx + 60, seat_cy], fill=gold_light, outline=gold_dark, width=5)

    # 4. Torso & Monastic Robe
    torso_pts = [
        (cx - 285, chest_cy - 190),  # left shoulder
        (cx + 285, chest_cy - 190),  # right shoulder
        (cx + 345, chest_cy + 140),  # right waist
        (cx + 400, seat_cy - 25),
        (cx - 400, seat_cy - 25),
        (cx - 345, chest_cy + 140)
    ]
    draw.polygon(torso_pts, fill=robe_gold, outline=gold_dark, width=7)
    
    # Bare right shoulder & golden chest
    chest_pts = [(cx - 85, chest_cy - 180), (cx + 270, chest_cy - 180), (cx + 295, chest_cy + 60), (cx + 70, chest_cy + 215), (cx - 85, chest_cy + 35)]
    draw.polygon(chest_pts, fill=gold_light, outline=gold_dark, width=6)
    draw.line([(cx + 95, chest_cy - 155), (cx + 95, chest_cy + 95)], fill=gold_hi, width=14)

    # Monastic robe folds cascading from left shoulder
    robe_folds = [
        [(cx - 260, chest_cy - 165), (cx - 25, chest_cy + 260)],
        [(cx - 200, chest_cy - 130), (cx + 35, chest_cy + 285)],
        [(cx - 285, chest_cy), (cx - 95, chest_cy + 310)]
    ]
    for pts in robe_folds:
        draw.line(pts, fill=gold_dark, width=10)
        draw.line([(pts[0][0]+7, pts[0][1]), (pts[1][0]+7, pts[1][1])], fill=gold_hi, width=7)

    # 5. Arms & Mudra
    # Left Arm: Resting in lap holding golden alms bowl
    draw.polygon([(cx - 285, chest_cy - 190), (cx - 330, chest_cy + 180), (cx - 110, seat_cy - 50), (cx - 190, chest_cy + 35)], 
                 fill=robe_gold, outline=gold_dark, width=6)
    draw.ellipse([cx - 130, seat_cy - 110, cx + 50, seat_cy - 35], fill=gold_light, outline=gold_dark, width=5)
    # Golden alms bowl
    draw.ellipse([cx - 95, seat_cy - 155, cx + 70, seat_cy - 60], fill=(255, 235, 120, 255), outline=gold_dark, width=6)
    draw.ellipse([cx - 75, seat_cy - 145, cx + 50, seat_cy - 100], fill=(180, 120, 20, 255))

    # Right Arm: Bhumisparsha Mudra (touching earth)
    draw.polygon([(cx + 285, chest_cy - 190), (cx + 390, chest_cy + 180), (cx + 400, seat_cy + 95), (cx + 270, chest_cy + 140)], 
                 fill=gold_light, outline=gold_dark, width=6)
    draw.line([(cx + 320, chest_cy - 110), (cx + 355, chest_cy + 165)], fill=gold_hi, width=12)
    hand_pts = [(cx + 345, seat_cy + 60), (cx + 415, seat_cy + 60), (cx + 400, seat_cy + 200), (cx + 345, seat_cy + 180)]
    draw.polygon(hand_pts, fill=gold_light, outline=gold_dark, width=5)
    for fx in range(cx + 355, cx + 410, 12):
        draw.line([(fx, seat_cy + 165), (fx - 5, seat_cy + 220)], fill=gold_mid, width=5)

    # 6. Neck & Head
    draw.polygon([(cx - 90, head_cy + 200), (cx + 90, head_cy + 200), (cx + 110, chest_cy - 180), (cx - 110, chest_cy - 180)], 
                 fill=gold_light, outline=gold_dark, width=5)
    for ny in [head_cy + 230, head_cy + 265, head_cy + 300]:
        draw.line([(cx - 60, ny), (cx + 60, ny)], fill=gold_dark, width=5)

    draw.ellipse([cx - 185, head_cy - 190, cx + 185, head_cy + 210], fill=gold_light, outline=gold_dark, width=7)
    draw.ellipse([cx - 120, head_cy - 120, cx + 120, head_cy + 120], fill=gold_hi)

    # Ears
    draw.ellipse([cx - 215, head_cy - 35, cx - 165, head_cy + 180], fill=gold_light, outline=gold_dark, width=5)
    draw.ellipse([cx + 165, head_cy - 35, cx + 215, head_cy + 180], fill=gold_light, outline=gold_dark, width=5)

    # Hair Ushnisha
    draw.ellipse([cx - 195, head_cy - 285, cx + 195, head_cy - 35], fill=(60, 45, 30, 255), outline=gold_dark, width=5)
    draw.ellipse([cx - 90, head_cy - 395, cx + 90, head_cy - 215], fill=(60, 45, 30, 255), outline=gold_dark, width=5)
    draw.ellipse([cx - 30, head_cy - 440, cx + 30, head_cy - 370], fill=(255, 235, 120, 255), outline=gold_dark, width=5)
    draw.ellipse([cx - 12, head_cy - 425, cx + 12, head_cy - 390], fill=(255, 255, 255, 255))

    # Facial features
    draw.ellipse([cx - 14, head_cy - 48, cx + 14, head_cy - 20], fill=(255, 255, 255, 255), outline=gold_dark, width=3)
    draw.arc([cx - 130, head_cy - 70, cx - 18, head_cy], start=200, end=340, fill=gold_dark, width=6)
    draw.arc([cx + 18, head_cy - 70, cx + 130, head_cy], start=200, end=340, fill=gold_dark, width=6)
    draw.arc([cx - 115, head_cy - 25, cx - 30, head_cy + 35], start=20, end=160, fill=(70, 40, 20, 255), width=7)
    draw.arc([cx + 30, head_cy - 25, cx + 115, head_cy + 35], start=20, end=160, fill=(70, 40, 20, 255), width=7)
    draw.line([(cx, head_cy - 25), (cx, head_cy + 70)], fill=gold_dark, width=5)
    draw.arc([cx - 33, head_cy + 48, cx + 33, head_cy + 90], start=0, end=180, fill=gold_dark, width=5)
    draw.arc([cx - 55, head_cy + 105, cx + 55, head_cy + 155], start=20, end=160, fill=(180, 50, 40, 255), width=7)
    draw.line([(cx - 48, head_cy + 120), (cx + 48, head_cy + 120)], fill=(160, 40, 30, 255), width=5)

    # Downsample cleanly to exactly 600 x 800
    res = img.resize((600, 800), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG', optimize=True)
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")


def generate_statue_amitabha(out_path):
    # Ground-truth: 600 x 800, supersample 3x -> 1800 x 2400
    w, h = 1800, 2400
    cx = w // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    gold_dark = (140, 95, 25, 255)
    gold_mid = (218, 165, 32, 255)
    gold_light = (255, 215, 64, 255)
    gold_hi = (255, 248, 180, 255)
    robe_crimson = (168, 28, 42, 255)

    base_cy = 2140
    seat_cy = 2010
    chest_cy = 1410
    head_cy = 960

    # 1. Great Radiant Welcoming Aura (Hào quang tiếp dẫn)
    halo_cy = 1010
    halo_r = 520
    for i in range(36):
        ang = (i * 2 * math.pi) / 36
        px = cx + int(halo_r * math.cos(ang))
        py = halo_cy + int(halo_r * math.sin(ang))
        draw.line([(cx, halo_cy), (px, py)], fill=(255, 220, 90, 80), width=7)
    for r in range(halo_r - 25, 0, -7):
        a = int(160 * (1.0 - (r / halo_r)**1.8))
        draw.ellipse([cx - r, halo_cy - r, cx + r, halo_cy + r], fill=(255, 200, 30, a))
    draw.ellipse([cx - halo_r + 35, halo_cy - halo_r + 35, cx + halo_r - 35, halo_cy + halo_r - 35], 
                 outline=(255, 245, 150, 220), width=12)

    # 2. Lotus Base
    render_lotus_pedestal_1800(draw, cx, base_cy, 570, 210, (255, 215, 0, 255), gold_dark)

    # 3. Crossed Legs in Padmasana
    leg_left_pts = [(cx - 510, seat_cy + 110), (cx - 280, seat_cy - 90), (cx, seat_cy + 35), (cx - 350, seat_cy + 150)]
    leg_right_pts = [(cx + 510, seat_cy + 110), (cx + 280, seat_cy - 90), (cx, seat_cy + 35), (cx + 350, seat_cy + 150)]
    draw.polygon(leg_left_pts, fill=robe_crimson, outline=gold_dark, width=6)
    draw.polygon(leg_right_pts, fill=robe_crimson, outline=gold_dark, width=6)
    draw.arc([cx - 330, seat_cy - 50, cx + 330, seat_cy + 120], start=20, end=160, fill=gold_light, width=14)

    # 4. Torso with Double-Shouldered Kasaya Robe
    torso_pts = [
        (cx - 285, chest_cy - 190),
        (cx + 285, chest_cy - 190),
        (cx + 345, chest_cy + 140),
        (cx + 400, seat_cy - 25),
        (cx - 400, seat_cy - 25),
        (cx - 345, chest_cy + 140)
    ]
    draw.polygon(torso_pts, fill=robe_crimson, outline=gold_dark, width=7)
    # Inner garment & Swastika
    draw.polygon([(cx - 105, chest_cy - 180), (cx + 105, chest_cy - 180), (cx + 70, chest_cy + 60), (cx - 70, chest_cy + 60)], 
                 fill=gold_light, outline=gold_dark, width=5)
    # Auspicious Swastika symbol
    draw.line([(cx - 35, chest_cy - 70), (cx + 35, chest_cy - 70)], fill=gold_dark, width=7)
    draw.line([(cx, chest_cy - 105), (cx, chest_cy - 35)], fill=gold_dark, width=7)
    draw.line([(cx - 35, chest_cy - 105), (cx - 35, chest_cy - 70)], fill=gold_dark, width=7)
    draw.line([(cx + 35, chest_cy - 35), (cx + 35, chest_cy - 70)], fill=gold_dark, width=7)
    draw.line([(cx, chest_cy - 105), (cx + 35, chest_cy - 105)], fill=gold_dark, width=7)
    draw.line([(cx - 35, chest_cy - 35), (cx, chest_cy - 35)], fill=gold_dark, width=7)

    # Golden robe trims
    draw.line([(cx - 285, chest_cy - 190), (cx - 85, seat_cy - 35)], fill=gold_light, width=16)
    draw.line([(cx + 285, chest_cy - 190), (cx + 85, seat_cy - 35)], fill=gold_light, width=16)

    # 5. Hands: Welcoming Mudra
    draw.ellipse([cx - 95, seat_cy - 85, cx + 95, seat_cy - 15], fill=gold_light, outline=gold_dark, width=5)
    draw.polygon([(cx + 200, chest_cy - 140), (cx + 270, chest_cy - 35), (cx + 190, chest_cy + 85), (cx + 130, chest_cy - 15)], 
                 fill=robe_crimson, outline=gold_dark, width=5)
    draw.ellipse([cx + 165, chest_cy - 130, cx + 260, chest_cy - 25], fill=gold_light, outline=gold_dark, width=5)
    draw.ellipse([cx + 190, chest_cy - 100, cx + 230, chest_cy - 60], outline=gold_dark, width=4)

    # 6. Neck & Head
    draw.polygon([(cx - 90, head_cy + 200), (cx + 90, head_cy + 200), (cx + 110, chest_cy - 180), (cx - 110, chest_cy - 180)], 
                 fill=gold_light, outline=gold_dark, width=5)
    draw.ellipse([cx - 185, head_cy - 190, cx + 185, head_cy + 210], fill=gold_light, outline=gold_dark, width=7)
    draw.ellipse([cx - 120, head_cy - 120, cx + 120, head_cy + 120], fill=gold_hi)

    # Ears
    draw.ellipse([cx - 215, head_cy - 35, cx - 165, head_cy + 180], fill=gold_light, outline=gold_dark, width=5)
    draw.ellipse([cx + 165, head_cy - 35, cx + 215, head_cy + 180], fill=gold_light, outline=gold_dark, width=5)

    # Hair Ushnisha
    draw.ellipse([cx - 195, head_cy - 285, cx + 195, head_cy - 35], fill=(55, 40, 25, 255), outline=gold_dark, width=5)
    draw.ellipse([cx - 90, head_cy - 395, cx + 90, head_cy - 215], fill=(55, 40, 25, 255), outline=gold_dark, width=5)
    draw.ellipse([cx - 30, head_cy - 440, cx + 30, head_cy - 370], fill=(255, 50, 50, 255), outline=gold_dark, width=5)

    # Facial features
    draw.ellipse([cx - 14, head_cy - 48, cx + 14, head_cy - 20], fill=(255, 255, 255, 255), outline=gold_dark, width=3)
    draw.arc([cx - 130, head_cy - 70, cx - 18, head_cy], start=200, end=340, fill=gold_dark, width=6)
    draw.arc([cx + 18, head_cy - 70, cx + 130, head_cy], start=200, end=340, fill=gold_dark, width=6)
    draw.arc([cx - 115, head_cy - 25, cx - 30, head_cy + 35], start=20, end=160, fill=(70, 40, 20, 255), width=7)
    draw.arc([cx + 30, head_cy - 25, cx + 115, head_cy + 35], start=20, end=160, fill=(70, 40, 20, 255), width=7)
    draw.line([(cx, head_cy - 25), (cx, head_cy + 70)], fill=gold_dark, width=5)
    draw.arc([cx - 33, head_cy + 48, cx + 33, head_cy + 90], start=0, end=180, fill=gold_dark, width=5)
    draw.arc([cx - 55, head_cy + 105, cx + 55, head_cy + 155], start=20, end=160, fill=(190, 45, 45, 255), width=7)
    draw.line([(cx - 48, head_cy + 120), (cx + 48, head_cy + 120)], fill=(160, 35, 35, 255), width=5)

    # Downsample cleanly to exactly 600 x 800
    res = img.resize((600, 800), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG', optimize=True)
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")


def generate_statue_avalokiteshvara(out_path):
    # Ground-truth: 550 x 820, supersample 3x -> 1650 x 2460
    w, h = 1650, 2460
    cx = w // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    robe_white = (248, 250, 252, 255)
    robe_shade = (207, 216, 220, 255)
    skin_gold = (255, 228, 180, 255)
    gold = (218, 165, 32, 255)
    gold_dark = (140, 95, 25, 255)
    gold_hi = (255, 235, 140, 255)

    base_cy = 2190
    seat_cy = 2060
    chest_cy = 1440
    head_cy = 980

    # 1. Soft white & gold lotus halo
    halo_cy = 1030
    halo_r = 480
    for r in range(halo_r, 0, -6):
        a = int(120 * (1.0 - (r / halo_r)**2))
        draw.ellipse([cx - r, halo_cy - r, cx + r, halo_cy + r], fill=(255, 248, 220, a))
    draw.ellipse([cx - halo_r, halo_cy - halo_r, cx + halo_r, halo_cy + halo_r], 
                 outline=(255, 215, 0, 180), width=7)

    # 2. Pink & Golden Lotus Pedestal Base
    render_lotus_pedestal_1800(draw, cx, base_cy, 570, 210, (255, 182, 193, 255), (194, 24, 91, 255))

    # 3. Flowing White Robes on Crossed Legs
    leg_left_pts = [(cx - 510, seat_cy + 110), (cx - 280, seat_cy - 90), (cx, seat_cy + 35), (cx - 350, seat_cy + 150)]
    leg_right_pts = [(cx + 510, seat_cy + 110), (cx + 280, seat_cy - 90), (cx, seat_cy + 35), (cx + 350, seat_cy + 150)]
    draw.polygon(leg_left_pts, fill=robe_white, outline=robe_shade, width=6)
    draw.polygon(leg_right_pts, fill=robe_white, outline=robe_shade, width=6)
    for fx in range(-380, 400, 95):
        draw.line([(cx + fx, seat_cy + 50), (cx + fx + 35, seat_cy + 145)], fill=robe_shade, width=6)

    # 4. Torso with Celestial White Veil & Jewelry
    torso_pts = [
        (cx - 260, chest_cy - 190),
        (cx + 260, chest_cy - 190),
        (cx + 320, chest_cy + 140),
        (cx + 380, seat_cy - 25),
        (cx - 380, seat_cy - 25),
        (cx - 320, chest_cy + 140)
    ]
    draw.polygon(torso_pts, fill=robe_white, outline=robe_shade, width=7)
    
    # Jade Necklace
    draw.arc([cx - 140, chest_cy - 165, cx + 140, chest_cy], start=10, end=170, fill=gold, width=9)
    draw.arc([cx - 190, chest_cy - 140, cx + 190, chest_cy + 85], start=10, end=170, fill=gold, width=7)
    for bx in [-95, -48, 0, 48, 95]:
        draw.ellipse([cx + bx - 12, chest_cy + 30, cx + bx + 12, chest_cy + 54], fill=(0, 188, 212, 255), outline=gold, width=3)

    # 5. Left Hand: Holding the Pure Water Vase (Bình Cam Lộ)
    draw.polygon([(cx - 260, chest_cy - 180), (cx - 330, chest_cy + 140), (cx - 130, seat_cy - 60), (cx - 190, chest_cy + 50)], 
                 fill=robe_white, outline=robe_shade, width=6)
    draw.ellipse([cx - 165, seat_cy - 130, cx - 70, seat_cy - 48], fill=skin_gold, outline=gold, width=4)
    # Cam Lo Vase
    vx, vy = cx - 120, seat_cy - 155
    draw.polygon([(vx - 42, vy + 85), (vx + 42, vy + 85), (vx + 54, vy), (vx + 22, vy - 70), (vx - 22, vy - 70), (vx - 54, vy)], 
                 fill=(255, 255, 255, 255), outline=gold, width=5)
    draw.ellipse([vx - 26, vy - 82, vx + 26, vy - 58], fill=gold, outline=robe_shade, width=3)
    draw.line([(vx - 30, vy), (vx + 30, vy)], fill=gold, width=5)

    # 6. Right Hand: Raising the Willow Branch (Nhành Dương Liễu)
    draw.polygon([(cx + 260, chest_cy - 180), (cx + 345, chest_cy - 35), (cx + 250, chest_cy + 50), (cx + 180, chest_cy - 50)], 
                 fill=robe_white, outline=robe_shade, width=6)
    draw.ellipse([cx + 215, chest_cy - 120, cx + 300, chest_cy - 25], fill=skin_gold, outline=gold, width=4)
    wx, wy = cx + 285, chest_cy - 95
    draw.line([(wx - 35, wy + 70), (wx + 95, wy - 215)], fill=(76, 175, 80, 255), width=8)
    leaf_offsets = [(0, 0), (30, -48), (60, -95), (85, -145), (100, -190)]
    for lx, ly in leaf_offsets:
        draw.arc([wx + lx - 30, wy + ly - 18, wx + lx + 18, wy + ly + 18], start=30, end=160, fill=(129, 199, 132, 255), width=6)
        draw.arc([wx + lx, wy + ly - 18, wx + lx + 48, wy + ly + 18], start=20, end=150, fill=(102, 187, 106, 255), width=6)

    # 7. White Cowl / Veil & Head
    draw.polygon([(cx - 240, head_cy + 200), (cx + 240, head_cy + 200), (cx + 200, head_cy - 240), (cx - 200, head_cy - 240)], 
                 fill=robe_white, outline=robe_shade, width=7)
    draw.ellipse([cx - 165, head_cy - 180, cx + 165, head_cy + 190], fill=skin_gold, outline=gold, width=6)
    draw.ellipse([cx - 110, head_cy - 110, cx + 110, head_cy + 110], fill=(255, 245, 230, 255))

    # Ornate Golden Crown with Amitabha effigy
    draw.polygon([(cx - 155, head_cy - 165), (cx + 155, head_cy - 165), (cx + 130, head_cy - 335), (cx, head_cy - 395), (cx - 130, head_cy - 335)], 
                 fill=gold, outline=gold_dark, width=6)
    draw.ellipse([cx - 30, head_cy - 310, cx + 30, head_cy - 250], fill=(255, 80, 80, 255), outline=gold_hi, width=4)

    # Facial features
    draw.ellipse([cx - 12, head_cy - 42, cx + 12, head_cy - 18], fill=(255, 60, 60, 255))
    draw.arc([cx - 120, head_cy - 60, cx - 18, head_cy + 6], start=200, end=340, fill=(80, 50, 30, 255), width=5)
    draw.arc([cx + 18, head_cy - 60, cx + 120, head_cy + 6], start=200, end=340, fill=(80, 50, 30, 255), width=5)
    draw.arc([cx - 100, head_cy - 18, cx - 30, head_cy + 30], start=20, end=160, fill=(60, 40, 25, 255), width=6)
    draw.arc([cx + 30, head_cy - 18, cx + 100, head_cy + 30], start=20, end=160, fill=(60, 40, 25, 255), width=6)
    draw.line([(cx, head_cy - 18), (cx, head_cy + 65)], fill=gold, width=4)
    draw.arc([cx - 28, head_cy + 48, cx + 28, head_cy + 85], start=0, end=180, fill=gold, width=4)
    draw.arc([cx - 48, head_cy + 100, cx + 48, head_cy + 145], start=20, end=160, fill=(229, 57, 53, 255), width=7)
    draw.line([(cx - 42, head_cy + 115), (cx + 42, head_cy + 115)], fill=(211, 47, 47, 255), width=5)

    # Downsample cleanly to exactly 550 x 820
    res = img.resize((550, 820), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG', optimize=True)
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")

if __name__ == '__main__':
    generate_statue_shakyamuni('assets/altar/statue_shakyamuni.png')
    generate_statue_amitabha('assets/altar/statue_amitabha.png')
    generate_statue_avalokiteshvara('assets/altar/statue_avalokiteshvara.png')
