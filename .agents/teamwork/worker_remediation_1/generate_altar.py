"""
generate_altar.py — Ground-Truth Compliant Altar Props & Table Generator
Author: Teamwork Remediation Worker (worker_remediation_1)
Dimensions:
  - meditation_cushion.png: 160 x 90 px   (3x internal: 480 x 270)
  - candle_stand.png:        150 x 350 px  (3x internal: 450 x 1050)
  - censer_bronze.png:       280 x 240 px  (3x internal: 840 x 720)
  - altar_table.png:         1080 x 850 px (2x internal: 2160 x 1700)
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter

os.makedirs('assets/altar', exist_ok=True)

def generate_meditation_cushion(out_path):
    # Target: 160x90, supersample 3x -> 480x270
    w, h = 480, 270
    cx, cy = w // 2, h // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    rx, ry = 205, 92

    # 1. Soft contact shadow beneath cushion
    for i in range(20, 0, -2):
        a = int(60 * (1.0 - i / 20))
        draw.ellipse([cx - rx - i, cy - ry + 28 - i//2, cx + rx + i, cy + ry + 28 + i//2], fill=(0, 0, 0, a))

    # 2. Lower cushion side wall (3D depth)
    side_depth = 26
    for dy in range(side_depth, 0, -2):
        shade = int(120 - dy * 2.0)
        draw.ellipse([cx - rx, cy - ry + dy, cx + rx, cy + ry + dy], fill=(shade, 15, 20, 255))

    # 3. Top surface of cushion (rich crimson silk)
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(168, 28, 42, 255), outline=(218, 165, 32, 255), width=6)

    # Top surface radial highlight
    for r_step in range(80, 0, -3):
        norm = r_step / 80.0
        cur_rx = int(rx * 0.85 * norm)
        cur_ry = int(ry * 0.85 * norm)
        alpha = int(45 * (1.0 - norm))
        draw.ellipse([cx - cur_rx, cy - cur_ry - 8, cx + cur_rx, cy + cur_ry - 8], fill=(240, 80, 95, alpha))

    # 4. Gold braided piping rim cord
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=(255, 215, 0, 240), width=5)
    draw.ellipse([cx - rx + 3, cy - ry + 2, cx + rx - 3, cy + ry - 2], outline=(184, 134, 11, 200), width=2)

    # 5. Embroidered golden lotus in center
    num_petals = 12
    for i in range(num_petals):
        ang = (i * 2 * math.pi) / num_petals
        px = cx + int(56 * math.cos(ang))
        py = cy + int(26 * math.sin(ang))
        draw.ellipse([px - 11, py - 7, px + 11, py + 7], fill=(255, 215, 0, 240), outline=(200, 140, 20, 255), width=2)
    draw.ellipse([cx - 22, cy - 11, cx + 22, cy + 11], fill=(255, 235, 120, 255), outline=(218, 165, 32, 255), width=2)
    draw.ellipse([cx - 10, cy - 5, cx + 10, cy + 5], fill=(255, 255, 200, 255))

    res = img.resize((160, 90), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG', optimize=True)
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")


def generate_candle_stand(out_path):
    # Target: 150x350, supersample 3x -> 450x1050
    w, h = 450, 1050
    cx = w // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    bronze_dark = (60, 42, 28, 255)
    bronze_mid = (112, 83, 53, 255)
    bronze_gold = (195, 155, 80, 255)
    bronze_hi = (245, 215, 140, 255)

    base_y = 960
    cand_y = 460
    flame_y = 250

    # 1. Flame radial glow
    for r in range(180, 0, -4):
        a = int(60 * (1.0 - r / 180)**1.2)
        draw.ellipse([cx - r, flame_y - r + 35, cx + r, flame_y + r + 35], fill=(255, 200, 50, a))

    # 2. Bronze base pedestal
    draw.polygon([(cx - 160, base_y), (cx + 160, base_y), (cx + 140, base_y - 45), (cx - 140, base_y - 45)], 
                 fill=bronze_mid, outline=bronze_dark, width=3)
    draw.line([(cx - 140, base_y - 22), (cx + 140, base_y - 22)], fill=bronze_hi, width=5)
    draw.polygon([(cx - 120, base_y - 45), (cx + 120, base_y - 45), (cx + 90, base_y - 100), (cx - 90, base_y - 100)], 
                 fill=bronze_dark, outline=bronze_gold, width=3)
    
    # 3. Turned bronze central baluster column
    stem_top_y = cand_y + 120
    stem_bot_y = base_y - 100
    draw.polygon([(cx - 28, stem_bot_y), (cx + 28, stem_bot_y), (cx + 20, stem_top_y), (cx - 20, stem_top_y)], 
                 fill=bronze_mid, outline=bronze_dark, width=2)
    draw.line([(cx - 6, stem_bot_y), (cx - 4, stem_top_y)], fill=bronze_hi, width=7)

    for knop_y in [stem_bot_y - 130, stem_bot_y - 260]:
        draw.ellipse([cx - 50, knop_y - 20, cx + 50, knop_y + 20], fill=bronze_gold, outline=bronze_dark, width=3)
        draw.ellipse([cx - 33, knop_y - 9, cx + 33, knop_y + 9], fill=bronze_hi)

    # 4. Upper bronze blooming lotus cup
    cup_bot = stem_top_y
    cup_top = cand_y + 45
    draw.polygon([(cx - 33, cup_bot), (cx + 33, cup_bot), (cx + 95, cup_top), (cx - 95, cup_top)], 
                 fill=bronze_mid, outline=bronze_dark, width=3)
    for p_x in [-65, -22, 22, 65]:
        draw.line([(cx + p_x, cup_top), (cx + p_x // 2, cup_bot)], fill=bronze_hi, width=3)
    draw.ellipse([cx - 105, cup_top - 16, cx + 105, cup_top + 16], fill=bronze_gold, outline=bronze_dark, width=3)
    draw.ellipse([cx - 82, cup_top - 9, cx + 82, cup_top + 9], fill=bronze_hi)

    # 5. Red Temple Candle
    cand_h = 175
    cand_w = 52
    cand_top = cand_y - cand_h + 38
    draw.rectangle([cx - cand_w//2, cand_top, cx + cand_w//2, cup_top], fill=(185, 25, 30, 255), outline=(120, 10, 15, 255), width=3)
    draw.line([(cx - 11, cand_top), (cx - 11, cup_top)], fill=(235, 75, 80, 255), width=7)
    draw.ellipse([cx - cand_w//2, cand_top - 11, cx + cand_w//2, cand_top + 11], fill=(210, 45, 50, 255))
    draw.line([(cx, cand_top), (cx, cand_top - 28)], fill=(30, 20, 15, 255), width=5)

    # 6. Glowing Teardrop Flame
    flame_bot = cand_top - 22
    flame_tip = flame_bot - 105
    flame_pts = [
        (cx, flame_tip),
        (cx + 36, flame_tip + 60),
        (cx + 28, flame_bot),
        (cx, flame_bot + 7),
        (cx - 28, flame_bot),
        (cx - 36, flame_tip + 60)
    ]
    draw.polygon(flame_pts, fill=(255, 160, 0, 240))
    inner_pts = [
        (cx, flame_tip + 20),
        (cx + 20, flame_tip + 66),
        (cx + 15, flame_bot - 5),
        (cx, flame_bot),
        (cx - 15, flame_bot - 5),
        (cx - 20, flame_tip + 66)
    ]
    draw.polygon(inner_pts, fill=(255, 240, 90, 255))
    draw.ellipse([cx - 9, flame_bot - 42, cx + 9, flame_bot - 9], fill=(255, 255, 240, 255))

    res = img.resize((150, 350), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG', optimize=True)
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")


def generate_censer_bronze(out_path):
    # Target: 280x240, supersample 3x -> 840x720
    w, h = 840, 720
    cx = w // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    bronze_base = (75, 50, 35, 255)
    bronze_mid = (120, 85, 55, 255)
    bronze_gold = (195, 150, 70, 255)
    bronze_hi = (245, 215, 140, 255)

    bowl_cy = 440
    bowl_rx = 240
    bowl_ry = 150

    # 1. Subtle incense smoke wafting from top
    smoke_pts = [
        [(cx - 30, 270), (cx - 60, 200), (cx - 30, 135), (cx - 80, 70)],
        [(cx, 260), (cx + 25, 190), (cx - 15, 120), (cx + 10, 50)],
        [(cx + 30, 270), (cx + 65, 200), (cx + 35, 130), (cx + 70, 65)]
    ]
    for pts in smoke_pts:
        for idx in range(len(pts) - 1):
            p_a, p_b = pts[idx], pts[idx+1]
            a = int(120 * (1.0 - idx / len(pts)))
            draw.line([p_a, p_b], fill=(240, 235, 225, a), width=7 - idx)

    # 2. Three incense sticks (nhang trầm)
    stick_base_y = 330
    draw.line([(cx - 35, stick_base_y), (cx - 45, 250)], fill=(160, 30, 25, 255), width=6)
    draw.line([(cx, stick_base_y), (cx, 240)], fill=(160, 30, 25, 255), width=6)
    draw.line([(cx + 35, stick_base_y), (cx + 45, 250)], fill=(160, 30, 25, 255), width=6)
    for ex, ey in [(cx - 45, 250), (cx, 240), (cx + 45, 250)]:
        draw.ellipse([ex - 4, ey - 4, ex + 4, ey + 4], fill=(255, 140, 30, 200))

    # 3. Tripod legs (chân nghê)
    draw.polygon([(cx - 170, 490), (cx - 210, 630), (cx - 140, 640), (cx - 120, 510)], fill=bronze_base, outline=bronze_mid, width=4)
    draw.line([(cx - 175, 510), (cx - 180, 630)], fill=bronze_hi, width=5)
    draw.polygon([(cx + 170, 490), (cx + 210, 630), (cx + 140, 640), (cx + 120, 510)], fill=bronze_base, outline=bronze_mid, width=4)
    draw.line([(cx + 175, 510), (cx + 180, 630)], fill=bronze_hi, width=5)
    draw.polygon([(cx - 45, 520), (cx - 50, 660), (cx + 50, 660), (cx + 45, 520)], fill=bronze_mid, outline=bronze_base, width=4)
    draw.line([(cx, 520), (cx, 660)], fill=bronze_hi, width=8)

    # 4. Dragon / Cloud handles
    draw.arc([cx - bowl_rx - 90, bowl_cy - 115, cx - bowl_rx + 50, bowl_cy + 65], start=80, end=280, fill=bronze_gold, width=24)
    draw.arc([cx - bowl_rx - 90, bowl_cy - 115, cx - bowl_rx + 50, bowl_cy + 65], start=80, end=280, fill=bronze_hi, width=6)
    draw.arc([cx + bowl_rx - 50, bowl_cy - 115, cx + bowl_rx + 90, bowl_cy + 65], start=260, end=100, fill=bronze_gold, width=24)
    draw.arc([cx + bowl_rx - 50, bowl_cy - 115, cx + bowl_rx + 90, bowl_cy + 65], start=260, end=100, fill=bronze_hi, width=6)

    # 5. Main Censer Body
    draw.ellipse([cx - bowl_rx, bowl_cy - bowl_ry, cx + bowl_rx, bowl_cy + bowl_ry], fill=bronze_mid, outline=bronze_base, width=6)
    for r_sh in range(bowl_ry - 15, 20, -10):
        norm = r_sh / bowl_ry
        draw.ellipse([cx - int(bowl_rx * norm), bowl_cy - int(bowl_ry * norm) + 14, 
                      cx + int(bowl_rx * norm), bowl_cy + int(bowl_ry * norm) + 14], 
                     fill=(bronze_mid[0] + int(40 * norm), bronze_mid[1] + int(30 * norm), bronze_mid[2] + int(10 * norm), 120))
    draw.ellipse([cx - 90, bowl_cy - 65, cx + 90, bowl_cy + 25], fill=bronze_gold, outline=bronze_hi, width=4)
    draw.ellipse([cx - 50, bowl_cy - 45, cx + 50, bowl_cy + 10], fill=bronze_hi)

    # 6. Carved lotus relief medallion
    draw.ellipse([cx - 40, bowl_cy - 10, cx + 40, bowl_cy + 46], fill=(255, 215, 0, 230), outline=bronze_base, width=3)
    draw.ellipse([cx - 20, bowl_cy + 4, cx + 20, bowl_cy + 32], fill=bronze_base)

    # 7. Rim and Ash
    rim_top = bowl_cy - bowl_ry
    draw.ellipse([cx - bowl_rx - 10, rim_top - 28, cx + bowl_rx + 10, rim_top + 28], fill=bronze_gold, outline=bronze_base, width=6)
    draw.ellipse([cx - bowl_rx + 25, rim_top - 16, cx + bowl_rx - 25, rim_top + 16], fill=(210, 205, 200, 255), outline=bronze_base, width=3)
    for ax in range(cx - 160, cx + 160, 25):
        draw.point((ax, rim_top), fill=(160, 155, 150, 255))

    res = img.resize((280, 240), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG', optimize=True)
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")


def generate_altar_table(out_path):
    # Preserved 1080x850 at 2x (2160x1700)
    w, h = 2160, 1700
    cx = w // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    wood_dark = (45, 18, 10, 255)
    wood_mid = (85, 34, 18, 255)
    wood_hi = (130, 55, 28, 255)
    gold = (212, 175, 55, 255)
    gold_hi = (255, 235, 140, 255)

    table_top_y = 780
    table_bot_y = 1680

    # Flower Vases
    for vx, vy in [(cx - 750, table_top_y - 20), (cx + 750, table_top_y - 20)]:
        draw.polygon([(vx - 90, vy), (vx + 90, vy), (vx + 130, vy - 220), (vx + 60, vy - 360), (vx - 60, vy - 360), (vx - 130, vy - 220)], 
                     fill=(120, 85, 50, 255), outline=gold, width=4)
        draw.ellipse([vx - 70, vy - 380, vx + 70, vy - 340], fill=gold, outline=wood_dark, width=3)
        draw.ellipse([vx - 40, vy - 250, vx + 40, vy - 150], fill=gold_hi)
        lotus_blossoms = [(vx - 60, vy - 460), (vx, vy - 530), (vx + 60, vy - 470), (vx - 30, vy - 400), (vx + 30, vy - 400)]
        for lx, ly in lotus_blossoms:
            draw.line([(vx, vy - 360), (lx, ly)], fill=(46, 125, 50, 255), width=8)
            for ang in [-45, -20, 0, 20, 45]:
                rad = math.radians(ang)
                px = lx + int(50 * math.sin(rad))
                py = ly - int(50 * math.cos(rad))
                draw.ellipse([px - 22, py - 35, px + 22, py + 35], fill=(240, 98, 146, 240), outline=(194, 24, 91, 200), width=2)
            draw.ellipse([lx - 16, ly - 16, lx + 16, ly + 16], fill=(255, 213, 79, 255))

    # Fruit Plate
    fx, fy = cx - 280, table_top_y - 20
    draw.polygon([(fx - 180, fy), (fx + 180, fy), (fx + 120, fy - 60), (fx - 120, fy - 60)], fill=gold, outline=wood_dark, width=4)
    draw.ellipse([fx - 220, fy - 80, fx + 220, fy - 40], fill=gold, outline=gold_hi, width=4)
    for bx in range(-140, 150, 45):
        draw.arc([fx + bx - 40, fy - 180, fx + bx + 40, fy - 60], start=40, end=140, fill=(104, 159, 56, 255), width=28)
    draw.ellipse([fx - 110, fy - 220, fx - 10, fy - 100], fill=(229, 57, 53, 255), outline=(183, 28, 28, 255), width=3)
    draw.ellipse([fx - 40, fy - 250, fx + 80, fy - 120], fill=(253, 216, 53, 255), outline=(245, 127, 23, 255), width=3)
    draw.ellipse([fx + 40, fy - 210, fx + 130, fy - 110], fill=(251, 140, 0, 255), outline=(230, 81, 0, 255), width=3)

    # Water cups
    ox, oy = cx + 280, table_top_y - 20
    draw.polygon([(ox - 180, oy), (ox + 180, oy), (ox + 130, oy - 60), (ox - 130, oy - 60)], fill=gold, outline=wood_dark, width=4)
    draw.ellipse([ox - 220, oy - 80, ox + 220, oy - 40], fill=gold, outline=gold_hi, width=4)
    for c_idx in [-110, 0, 110]:
        cup_x = ox + c_idx
        cup_y = oy - 70
        draw.polygon([(cup_x - 35, cup_y), (cup_x + 35, cup_y), (cup_x + 45, cup_y - 70), (cup_x - 45, cup_y - 70)], fill=(245, 250, 250, 255), outline=gold, width=3)
        draw.ellipse([cup_x - 45, cup_y - 80, cup_x + 45, cup_y - 60], fill=(230, 245, 245, 255), outline=gold, width=2)
        draw.ellipse([cup_x - 25, cup_y - 73, cup_x + 25, cup_y - 67], fill=(129, 212, 250, 200))

    # Table Top
    draw.polygon([(40, table_top_y), (w - 40, table_top_y), (w - 10, table_top_y + 80), (10, table_top_y + 80)], fill=wood_mid, outline=wood_dark, width=5)
    draw.line([(15, table_top_y + 40), (w - 15, table_top_y + 40)], fill=gold_hi, width=12)
    draw.line([(25, table_top_y + 70), (w - 25, table_top_y + 70)], fill=gold, width=8)

    # Frieze
    frieze_top = table_top_y + 80
    frieze_bot = frieze_top + 180
    draw.rectangle([40, frieze_top, w - 40, frieze_bot], fill=wood_dark, outline=wood_mid, width=4)
    for px in range(180, w - 100, 240):
        draw.rectangle([px - 90, frieze_top + 20, px + 90, frieze_bot - 20], fill=wood_mid, outline=gold, width=3)
        draw.ellipse([px - 45, frieze_top + 45, px + 45, frieze_bot - 45], fill=(160, 25, 25, 255), outline=gold_hi, width=3)
        draw.polygon([(px, frieze_top + 50), (px + 28, frieze_top + 90), (px, frieze_bot - 50), (px - 28, frieze_top + 90)], fill=gold)

    # Mid Section
    mid_top = frieze_bot
    mid_bot = mid_top + 340
    draw.rectangle([80, mid_top, w - 80, mid_bot], fill=wood_mid, outline=wood_dark, width=5)
    for rx in range(220, w - 180, 420):
        draw.rectangle([rx - 160, mid_top + 30, rx + 160, mid_bot - 30], fill=wood_dark, outline=gold, width=4)
        draw.ellipse([rx - 110, mid_top + 70, rx + 110, mid_bot - 70], outline=gold_hi, width=4)
        draw.line([(rx - 60, (mid_top + mid_bot)//2), (rx + 60, (mid_top + mid_bot)//2)], fill=gold, width=6)
        draw.line([(rx, (mid_top + mid_bot)//2 - 60), (rx, (mid_top + mid_bot)//2 + 60)], fill=gold, width=6)

    # Legs
    leg_top = mid_bot
    draw.polygon([(80, leg_top), (280, leg_top), (220, table_bot_y), (40, table_bot_y)], fill=wood_dark, outline=gold, width=5)
    draw.line([(100, leg_top + 30), (80, table_bot_y - 40)], fill=wood_hi, width=12)
    draw.polygon([(w - 280, leg_top), (w - 80, leg_top), (w - 40, table_bot_y), (w - 220, table_bot_y)], fill=wood_dark, outline=gold, width=5)
    draw.line([(w - 100, leg_top + 30), (w - 80, table_bot_y - 40)], fill=wood_hi, width=12)
    draw.polygon([(cx - 380, leg_top), (cx - 200, leg_top), (cx - 220, table_bot_y), (cx - 360, table_bot_y)], fill=wood_dark, outline=wood_mid, width=4)
    draw.polygon([(cx + 200, leg_top), (cx + 380, leg_top), (cx + 360, table_bot_y), (cx + 220, table_bot_y)], fill=wood_dark, outline=wood_mid, width=4)

    draw.rectangle([100, table_bot_y - 90, w - 100, table_bot_y], fill=wood_dark, outline=gold, width=5)
    draw.line([(110, table_bot_y - 45), (w - 110, table_bot_y - 45)], fill=gold_hi, width=10)

    res = img.resize((1080, 850), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG', optimize=True)
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")

if __name__ == '__main__':
    generate_meditation_cushion('assets/altar/meditation_cushion.png')
    generate_candle_stand('assets/altar/candle_stand.png')
    generate_censer_bronze('assets/altar/censer_bronze.png')
    generate_altar_table('assets/altar/altar_table.png')
