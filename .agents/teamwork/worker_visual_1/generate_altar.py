import os
import math
from PIL import Image, ImageDraw, ImageFilter

os.makedirs('assets/altar', exist_ok=True)

def generate_meditation_cushion(out_path):
    # Target: 240x120, supersample at 3x (720x360)
    w, h = 720, 360
    cx, cy = w // 2, h // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    rx, ry = 310, 140

    # 1. Soft contact shadow beneath cushion
    for i in range(25, 0, -2):
        a = int(60 * (1.0 - i / 25))
        draw.ellipse([cx - rx - i, cy - ry + 40 - i//2, cx + rx + i, cy + ry + 40 + i//2], fill=(0, 0, 0, a))

    # 2. Lower cushion body / side wall (3D depth)
    side_depth = 35
    for dy in range(side_depth, 0, -2):
        shade = int(120 - dy * 1.5)
        draw.ellipse([cx - rx, cy - ry + dy, cx + rx, cy + ry + dy], fill=(shade, 15, 20, 255))

    # 3. Top surface of cushion (rich crimson silk)
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(168, 28, 42, 255), outline=(218, 165, 32, 255), width=8)

    # Top surface radial highlight
    for r_step in range(120, 0, -4):
        norm = r_step / 120.0
        cur_rx = int(rx * 0.85 * norm)
        cur_ry = int(ry * 0.85 * norm)
        alpha = int(45 * (1.0 - norm))
        draw.ellipse([cx - cur_rx, cy - cur_ry - 10, cx + cur_rx, cy + cur_ry - 10], fill=(240, 80, 95, alpha))

    # 4. Gold braided piping / rim cord
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=(255, 215, 0, 240), width=6)
    draw.ellipse([cx - rx + 4, cy - ry + 3, cx + rx - 4, cy + ry - 3], outline=(184, 134, 11, 200), width=3)

    # 5. Embroidered golden lotus in center
    num_petals = 12
    for i in range(num_petals):
        ang = (i * 2 * math.pi) / num_petals
        px = cx + int(85 * math.cos(ang))
        py = cy + int(40 * math.sin(ang))
        # Draw small golden petal
        draw.ellipse([px - 16, py - 10, px + 16, py + 10], fill=(255, 215, 0, 240), outline=(200, 140, 20, 255), width=2)
    # Center core stamen
    draw.ellipse([cx - 32, cy - 16, cx + 32, cy + 16], fill=(255, 235, 120, 255), outline=(218, 165, 32, 255), width=3)
    draw.ellipse([cx - 15, cy - 8, cx + 15, cy + 8], fill=(255, 255, 200, 255))

    res = img.resize((240, 120), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG')
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")

def generate_candle_stand(out_path):
    # Target: 140x320, supersample at 3x (420x960)
    w, h = 420, 960
    cx = w // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    bronze_dark = (60, 42, 28, 255)
    bronze_mid = (112, 83, 53, 255)
    bronze_gold = (195, 155, 80, 255)
    bronze_hi = (245, 215, 140, 255)

    base_y = 880
    cand_y = 420
    flame_y = 230

    # 1. Flame radial glow
    for r in range(160, 0, -4):
        a = int(60 * (1.0 - r / 160)**1.2)
        draw.ellipse([cx - r, flame_y - r + 30, cx + r, flame_y + r + 30], fill=(255, 200, 50, a))

    # 2. Bronze base pedestal
    # Tier 1 base
    draw.polygon([(cx - 150, base_y), (cx + 150, base_y), (cx + 130, base_y - 40), (cx - 130, base_y - 40)], fill=bronze_mid, outline=bronze_dark, width=3)
    draw.line([(cx - 130, base_y - 20), (cx + 130, base_y - 20)], fill=bronze_hi, width=4)
    # Tier 2 base (lotus base ring)
    draw.polygon([(cx - 110, base_y - 40), (cx + 110, base_y - 40), (cx + 80, base_y - 90), (cx - 80, base_y - 90)], fill=bronze_dark, outline=bronze_gold, width=3)
    
    # 3. Turned bronze central baluster / column
    stem_top_y = cand_y + 110
    stem_bot_y = base_y - 90
    draw.polygon([(cx - 25, stem_bot_y), (cx + 25, stem_bot_y), (cx + 18, stem_top_y), (cx - 18, stem_top_y)], fill=bronze_mid, outline=bronze_dark, width=2)
    # Vertical golden highlight on stem
    draw.line([(cx - 6, stem_bot_y), (cx - 4, stem_top_y)], fill=bronze_hi, width=6)

    # Baluster knops (decorative bronze rings)
    for knop_y in [stem_bot_y - 120, stem_bot_y - 240]:
        draw.ellipse([cx - 45, knop_y - 18, cx + 45, knop_y + 18], fill=bronze_gold, outline=bronze_dark, width=3)
        draw.ellipse([cx - 30, knop_y - 8, cx + 30, knop_y + 8], fill=bronze_hi)

    # 4. Upper bronze blooming lotus cup
    cup_bot = stem_top_y
    cup_top = cand_y + 40
    draw.polygon([(cx - 30, cup_bot), (cx + 30, cup_bot), (cx + 85, cup_top), (cx - 85, cup_top)], fill=bronze_mid, outline=bronze_dark, width=3)
    # Carved lotus petals on cup
    for p_x in [-60, -20, 20, 60]:
        draw.line([(cx + p_x, cup_top), (cx + p_x // 2, cup_bot)], fill=bronze_hi, width=3)
    # Upper drip tray
    draw.ellipse([cx - 95, cup_top - 15, cx + 95, cup_top + 15], fill=bronze_gold, outline=bronze_dark, width=3)
    draw.ellipse([cx - 75, cup_top - 8, cx + 75, cup_top + 8], fill=bronze_hi)

    # 5. Red Temple Candle (wax)
    cand_h = 160
    cand_w = 46
    cand_top = cand_y - cand_h + 35
    draw.rectangle([cx - cand_w//2, cand_top, cx + cand_w//2, cup_top], fill=(185, 25, 30, 255), outline=(120, 10, 15, 255), width=3)
    # Wax cylindrical highlight
    draw.line([(cx - 10, cand_top), (cx - 10, cup_top)], fill=(235, 75, 80, 255), width=6)
    # Candle top oval with melted wax
    draw.ellipse([cx - cand_w//2, cand_top - 10, cx + cand_w//2, cand_top + 10], fill=(210, 45, 50, 255))
    # Black wick
    draw.line([(cx, cand_top), (cx, cand_top - 25)], fill=(30, 20, 15, 255), width=5)

    # 6. Glowing Teardrop Flame
    flame_bot = cand_top - 20
    flame_tip = flame_bot - 95
    # Outer orange-yellow flame
    flame_pts = [
        (cx, flame_tip),
        (cx + 32, flame_tip + 55),
        (cx + 26, flame_bot),
        (cx, flame_bot + 6),
        (cx - 26, flame_bot),
        (cx - 32, flame_tip + 55)
    ]
    draw.polygon(flame_pts, fill=(255, 160, 0, 240))
    # Inner bright yellow flame
    inner_pts = [
        (cx, flame_tip + 18),
        (cx + 18, flame_tip + 60),
        (cx + 14, flame_bot - 4),
        (cx, flame_bot),
        (cx - 14, flame_bot - 4),
        (cx - 18, flame_tip + 60)
    ]
    draw.polygon(inner_pts, fill=(255, 240, 90, 255))
    # Luminous white core
    draw.ellipse([cx - 8, flame_bot - 38, cx + 8, flame_bot - 8], fill=(255, 255, 240, 255))

    res = img.resize((140, 320), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG')
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")

def generate_censer_bronze(out_path):
    # Target: 280x260, supersample at 3x (840x780)
    w, h = 840, 780
    cx = w // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    bronze_base = (75, 50, 35, 255)
    bronze_mid = (120, 85, 55, 255)
    bronze_gold = (195, 150, 70, 255)
    bronze_hi = (245, 215, 140, 255)

    bowl_cy = 470
    bowl_rx = 240
    bowl_ry = 160

    # 1. Subtle incense smoke wafting from top
    smoke_pts = [
        [(cx - 30, 290), (cx - 60, 220), (cx - 30, 150), (cx - 80, 80)],
        [(cx, 280), (cx + 25, 210), (cx - 15, 130), (cx + 10, 60)],
        [(cx + 30, 290), (cx + 65, 220), (cx + 35, 140), (cx + 70, 75)]
    ]
    for pts in smoke_pts:
        for idx in range(len(pts) - 1):
            p_a, p_b = pts[idx], pts[idx+1]
            a = int(120 * (1.0 - idx / len(pts)))
            draw.line([p_a, p_b], fill=(240, 235, 225, a), width=7 - idx)

    # 2. Three incense sticks (nhang trầm)
    stick_base_y = 350
    draw.line([(cx - 35, stick_base_y), (cx - 45, 270)], fill=(160, 30, 25, 255), width=6)
    draw.line([(cx, stick_base_y), (cx, 260)], fill=(160, 30, 25, 255), width=6)
    draw.line([(cx + 35, stick_base_y), (cx + 45, 270)], fill=(160, 30, 25, 255), width=6)
    # Glowing ember tips
    draw.point((cx - 45, 270), fill=(255, 80, 0, 255))
    draw.point((cx, 260), fill=(255, 80, 0, 255))
    draw.point((cx + 45, 270), fill=(255, 80, 0, 255))
    for ex, ey in [(cx - 45, 270), (cx, 260), (cx + 45, 270)]:
        draw.ellipse([ex - 4, ey - 4, ex + 4, ey + 4], fill=(255, 140, 30, 200))

    # 3. Tripod legs (chân nghê)
    # Left leg
    draw.polygon([(cx - 170, 520), (cx - 210, 670), (cx - 140, 680), (cx - 120, 540)], fill=bronze_base, outline=bronze_mid, width=4)
    draw.line([(cx - 175, 540), (cx - 180, 670)], fill=bronze_hi, width=5)
    # Right leg
    draw.polygon([(cx + 170, 520), (cx + 210, 670), (cx + 140, 680), (cx + 120, 540)], fill=bronze_base, outline=bronze_mid, width=4)
    draw.line([(cx + 175, 540), (cx + 180, 670)], fill=bronze_hi, width=5)
    # Center front leg
    draw.polygon([(cx - 45, 550), (cx - 50, 700), (cx + 50, 700), (cx + 45, 550)], fill=bronze_mid, outline=bronze_base, width=4)
    draw.line([(cx, 550), (cx, 700)], fill=bronze_hi, width=8)

    # 4. Dragon / Cloud handles (quai rồng / tai mây)
    # Left handle
    draw.arc([cx - bowl_rx - 90, bowl_cy - 120, cx - bowl_rx + 50, bowl_cy + 70], start=80, end=280, fill=bronze_gold, width=24)
    draw.arc([cx - bowl_rx - 90, bowl_cy - 120, cx - bowl_rx + 50, bowl_cy + 70], start=80, end=280, fill=bronze_hi, width=6)
    # Right handle
    draw.arc([cx + bowl_rx - 50, bowl_cy - 120, cx + bowl_rx + 90, bowl_cy + 70], start=260, end=100, fill=bronze_gold, width=24)
    draw.arc([cx + bowl_rx - 50, bowl_cy - 120, cx + bowl_rx + 90, bowl_cy + 70], start=260, end=100, fill=bronze_hi, width=6)

    # 5. Main Censer Body (bulbous bronze bowl)
    draw.ellipse([cx - bowl_rx, bowl_cy - bowl_ry, cx + bowl_rx, bowl_cy + bowl_ry], fill=bronze_mid, outline=bronze_base, width=6)
    # Shading gradient layers
    for r_sh in range(bowl_ry - 15, 20, -10):
        norm = r_sh / bowl_ry
        draw.ellipse([cx - int(bowl_rx * norm), bowl_cy - int(bowl_ry * norm) + 15, cx + int(bowl_rx * norm), bowl_cy + int(bowl_ry * norm) + 15], fill=(bronze_mid[0] + int(40 * norm), bronze_mid[1] + int(30 * norm), bronze_mid[2] + int(10 * norm), 120))

    # Center spherical bronze luster highlight
    draw.ellipse([cx - 90, bowl_cy - 70, cx + 90, bowl_cy + 30], fill=bronze_gold, outline=bronze_hi, width=4)
    draw.ellipse([cx - 50, bowl_cy - 50, cx + 50, bowl_cy + 10], fill=bronze_hi)

    # 6. Carved lotus relief medallion on front
    draw.ellipse([cx - 40, bowl_cy - 10, cx + 40, bowl_cy + 50], fill=(255, 215, 0, 230), outline=bronze_base, width=3)
    draw.ellipse([cx - 20, bowl_cy + 5, cx + 20, bowl_cy + 35], fill=bronze_base)

    # 7. Rim and Sacred White Ash
    rim_top = bowl_cy - bowl_ry
    draw.ellipse([cx - bowl_rx - 10, rim_top - 30, cx + bowl_rx + 10, rim_top + 30], fill=bronze_gold, outline=bronze_base, width=6)
    # Inner ash opening
    draw.ellipse([cx - bowl_rx + 25, rim_top - 18, cx + bowl_rx - 25, rim_top + 18], fill=(210, 205, 200, 255), outline=bronze_base, width=3)
    # Grey ash texture dots
    for ax in range(cx - 160, cx + 160, 25):
        draw.point((ax, rim_top), fill=(160, 155, 150, 255))

    res = img.resize((280, 260), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG')
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")

def generate_altar_table(out_path):
    # Target: 1080x850, supersample at 2x (2160x1700)
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

    # -------------------------------------------------------------
    # A. Offerings on table (y = 0..780)
    # -------------------------------------------------------------
    # 1. Left & Right Golden Lotus Flower Vases
    for vx, vy in [(cx - 750, table_top_y - 20), (cx + 750, table_top_y - 20)]:
        # Bronze Vase Body
        draw.polygon([(vx - 90, vy), (vx + 90, vy), (vx + 130, vy - 220), (vx + 60, vy - 360), (vx - 60, vy - 360), (vx - 130, vy - 220)], fill=(120, 85, 50, 255), outline=gold, width=4)
        draw.ellipse([vx - 70, vy - 380, vx + 70, vy - 340], fill=gold, outline=wood_dark, width=3)
        draw.ellipse([vx - 40, vy - 250, vx + 40, vy - 150], fill=gold_hi)
        # Pink Lotus Blossoms in Vase
        lotus_blossoms = [(vx - 60, vy - 460), (vx, vy - 530), (vx + 60, vy - 470), (vx - 30, vy - 400), (vx + 30, vy - 400)]
        for lx, ly in lotus_blossoms:
            # Green stems
            draw.line([(vx, vy - 360), (lx, ly)], fill=(46, 125, 50, 255), width=8)
            # Petals
            for ang in [-45, -20, 0, 20, 45]:
                rad = math.radians(ang)
                px = lx + int(50 * math.sin(rad))
                py = ly - int(50 * math.cos(rad))
                draw.ellipse([px - 22, py - 35, px + 22, py + 35], fill=(240, 98, 146, 240), outline=(194, 24, 91, 200), width=2)
            # Gold center
            draw.ellipse([lx - 16, ly - 16, lx + 16, ly + 16], fill=(255, 213, 79, 255))

    # 2. Fruit Offering Plate (Mâm Ngũ Quả) at center-left
    fx, fy = cx - 280, table_top_y - 20
    # Gold offering pedestal
    draw.polygon([(fx - 180, fy), (fx + 180, fy), (fx + 120, fy - 60), (fx - 120, fy - 60)], fill=gold, outline=wood_dark, width=4)
    draw.ellipse([fx - 220, fy - 80, fx + 220, fy - 40], fill=gold, outline=gold_hi, width=4)
    # Green Bananas base
    for bx in range(-140, 150, 45):
        draw.arc([fx + bx - 40, fy - 180, fx + bx + 40, fy - 60], start=40, end=140, fill=(104, 159, 56, 255), width=28)
    # Red Watermelon / Dragon fruit
    draw.ellipse([fx - 110, fy - 220, fx - 10, fy - 100], fill=(229, 57, 53, 255), outline=(183, 28, 28, 255), width=3)
    # Yellow Pomelo / Grapefruit
    draw.ellipse([fx - 40, fy - 250, fx + 80, fy - 120], fill=(253, 216, 53, 255), outline=(245, 127, 23, 255), width=3)
    # Orange Persimmons & Mangoes
    draw.ellipse([fx + 40, fy - 210, fx + 130, fy - 110], fill=(251, 140, 0, 255), outline=(230, 81, 0, 255), width=3)

    # 3. Water Offerings & Lotus Candle Cups at center-right
    ox, oy = cx + 280, table_top_y - 20
    # Tiered bronze stand
    draw.polygon([(ox - 180, oy), (ox + 180, oy), (ox + 130, oy - 60), (ox - 130, oy - 60)], fill=gold, outline=wood_dark, width=4)
    draw.ellipse([ox - 220, oy - 80, ox + 220, oy - 40], fill=gold, outline=gold_hi, width=4)
    # Three Pure Jade / Porcelain Water Cups
    for c_idx in [-110, 0, 110]:
        cup_x = ox + c_idx
        cup_y = oy - 70
        draw.polygon([(cup_x - 35, cup_y), (cup_x + 35, cup_y), (cup_x + 45, cup_y - 70), (cup_x - 45, cup_y - 70)], fill=(245, 250, 250, 255), outline=gold, width=3)
        draw.ellipse([cup_x - 45, cup_y - 80, cup_x + 45, cup_y - 60], fill=(230, 245, 245, 255), outline=gold, width=2)
        draw.ellipse([cup_x - 25, cup_y - 73, cup_x + 25, cup_y - 67], fill=(129, 212, 250, 200)) # pure water

    # -------------------------------------------------------------
    # B. Altar Table Architecture (y = 780..1680)
    # -------------------------------------------------------------
    # 1. Tier 1 (Main Upper Tabletop)
    draw.polygon([(40, table_top_y), (w - 40, table_top_y), (w - 10, table_top_y + 80), (10, table_top_y + 80)], fill=wood_mid, outline=wood_dark, width=5)
    # Gold leaf edge strip
    draw.line([(15, table_top_y + 40), (w - 15, table_top_y + 40)], fill=gold_hi, width=12)
    draw.line([(25, table_top_y + 70), (w - 25, table_top_y + 70)], fill=gold, width=8)

    # 2. Tier 2 (Frieze with Carved Lotus Panels)
    frieze_top = table_top_y + 80
    frieze_bot = frieze_top + 180
    draw.rectangle([40, frieze_top, w - 40, frieze_bot], fill=wood_dark, outline=wood_mid, width=4)
    # Carved golden lotus medallions across frieze
    for px in range(180, w - 100, 240):
        draw.rectangle([px - 90, frieze_top + 20, px + 90, frieze_bot - 20], fill=wood_mid, outline=gold, width=3)
        draw.ellipse([px - 45, frieze_top + 45, px + 45, frieze_bot - 45], fill=(160, 25, 25, 255), outline=gold_hi, width=3)
        # Gold lotus flower inside medallion
        draw.polygon([(px, frieze_top + 50), (px + 28, frieze_top + 90), (px, frieze_bot - 50), (px - 28, frieze_top + 90)], fill=gold)

    # 3. Tier 3 (Middle Section & Table Skirt Apron)
    mid_top = frieze_bot
    mid_bot = mid_top + 340
    draw.rectangle([80, mid_top, w - 80, mid_bot], fill=wood_mid, outline=wood_dark, width=5)
    
    # Auspicious cloud carvings & Swastika geometric lattice in middle
    for rx in range(220, w - 180, 420):
        draw.rectangle([rx - 160, mid_top + 30, rx + 160, mid_bot - 30], fill=wood_dark, outline=gold, width=4)
        draw.ellipse([rx - 110, mid_top + 70, rx + 110, mid_bot - 70], outline=gold_hi, width=4)
        draw.line([(rx - 60, (mid_top + mid_bot)//2), (rx + 60, (mid_top + mid_bot)//2)], fill=gold, width=6)
        draw.line([(rx, (mid_top + mid_bot)//2 - 60), (rx, (mid_top + mid_bot)//2 + 60)], fill=gold, width=6)

    # 4. Table Legs (Curved Lion Legs - Chân Quỳ Dạ Cá)
    leg_top = mid_bot
    # Far Left Leg
    draw.polygon([(80, leg_top), (280, leg_top), (220, table_bot_y), (40, table_bot_y)], fill=wood_dark, outline=gold, width=5)
    draw.line([(100, leg_top + 30), (80, table_bot_y - 40)], fill=wood_hi, width=12)
    # Far Right Leg
    draw.polygon([(w - 280, leg_top), (w - 80, leg_top), (w - 40, table_bot_y), (w - 220, table_bot_y)], fill=wood_dark, outline=gold, width=5)
    draw.line([(w - 100, leg_top + 30), (w - 80, table_bot_y - 40)], fill=wood_hi, width=12)
    # Center Left Leg
    draw.polygon([(cx - 380, leg_top), (cx - 200, leg_top), (cx - 220, table_bot_y), (cx - 360, table_bot_y)], fill=wood_dark, outline=wood_mid, width=4)
    # Center Right Leg
    draw.polygon([(cx + 200, leg_top), (cx + 380, leg_top), (cx + 360, table_bot_y), (cx + 220, table_bot_y)], fill=wood_dark, outline=wood_mid, width=4)

    # 5. Bottom Rail & Apron Trim
    draw.rectangle([100, table_bot_y - 90, w - 100, table_bot_y], fill=wood_dark, outline=gold, width=5)
    draw.line([(110, table_bot_y - 45), (w - 110, table_bot_y - 45)], fill=gold_hi, width=10)

    res = img.resize((1080, 850), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG')
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")

generate_meditation_cushion('assets/altar/meditation_cushion.png')
generate_candle_stand('assets/altar/candle_stand.png')
generate_censer_bronze('assets/altar/censer_bronze.png')
generate_altar_table('assets/altar/altar_table.png')
