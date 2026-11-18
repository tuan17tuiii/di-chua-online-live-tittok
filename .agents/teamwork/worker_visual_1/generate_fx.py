import os
import math
from PIL import Image, ImageDraw, ImageFilter

os.makedirs('assets/fx', exist_ok=True)

def generate_fx_halo(out_path):
    # Target 512x512, supersample at 2x (1024x1024)
    w, h = 1024, 1024
    cx, cy = w // 2, h // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Soft radial background glow
    max_r = 460
    for r in range(max_r, 0, -3):
        norm = r / max_r
        # alpha falls off smoothly with cosine
        alpha = int(90 * (math.cos(norm * math.pi) * 0.5 + 0.5)**1.5)
        # color transitions from warm yellow core to orange gold
        gold = (255, int(215 - 50 * norm), int(80 - 60 * norm), alpha)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=gold)

    # 2. Radiating golden sacred rays (24 rays)
    num_rays = 24
    for i in range(num_rays):
        angle = (i * 2 * math.pi) / num_rays
        ray_len = 450 if i % 2 == 0 else 380
        half_width = 0.045
        
        # Ray triangle points
        p1 = (cx, cy)
        p2 = (cx + int(ray_len * math.cos(angle - half_width)), cy + int(ray_len * math.sin(angle - half_width)))
        p3 = (cx + int((ray_len + 30) * math.cos(angle)), cy + int((ray_len + 30) * math.sin(angle)))
        p4 = (cx + int(ray_len * math.cos(angle + half_width)), cy + int(ray_len * math.sin(angle + half_width)))
        
        draw.polygon([p1, p2, p3, p4], fill=(255, 235, 130, 75))

    # 3. Geometric concentric sacred rings
    ring_radii = [180, 260, 320, 390]
    for r in ring_radii:
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 220, 100, 140), width=4)
        draw.ellipse([cx - r - 6, cy - r - 6, cx + r + 6, cy + r + 6], outline=(255, 240, 160, 90), width=2)

    # 4. Sacred lotus petal pattern along middle ring (r=260)
    num_petals = 16
    for i in range(num_petals):
        theta = (i * 2 * math.pi) / num_petals
        r_mid = 260
        px = cx + int(r_mid * math.cos(theta))
        py = cy + int(r_mid * math.sin(theta))
        draw.ellipse([px - 22, py - 22, px + 22, py + 22], fill=(255, 245, 170, 160), outline=(255, 200, 50, 200), width=3)

    # 5. Luminous central sun disk
    for r in range(120, 0, -2):
        alpha = int(220 * (1.0 - r / 120))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 220, alpha))

    # Apply slight blur to blend rays, then resize
    blurred = img.filter(ImageFilter.GaussianBlur(radius=2))
    res = blurred.resize((512, 512), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG')
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")

def generate_fx_lotus(out_path):
    # Target 128x128, supersample at 3x (384x384)
    w, h = 384, 384
    cx, cy = w // 2, h // 2 + 25
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Soft petal glow
    for r in range(140, 0, -4):
        a = int(35 * (1.0 - r / 140))
        draw.ellipse([cx - r, cy - r - 10, cx + r, cy + r - 10], fill=(255, 180, 210, a))

    # 2. Green lotus pad / base leaves
    leaf_color = (46, 125, 50, 230)
    leaf_outline = (27, 94, 32, 255)
    # Left leaf
    draw.polygon([(cx - 20, cy + 40), (cx - 130, cy + 50), (cx - 150, cy + 30), (cx - 70, cy + 15)], fill=leaf_color, outline=leaf_outline)
    # Right leaf
    draw.polygon([(cx + 20, cy + 40), (cx + 130, cy + 50), (cx + 150, cy + 30), (cx + 70, cy + 15)], fill=leaf_color, outline=leaf_outline)

    # 3. Outer lotus petals (wide blooming)
    # Function to draw a curved petal
    def draw_petal(angle_deg, length, width, fill_col, tip_col):
        rad = math.radians(angle_deg)
        cos_a = math.cos(rad)
        sin_a = math.sin(rad)
        tip_x = cx + int(length * sin_a)
        tip_y = cy - int(length * cos_a)
        left_x = cx + int((length * 0.45) * sin_a - width * cos_a)
        left_y = cy - int((length * 0.45) * cos_a + width * sin_a)
        right_x = cx + int((length * 0.45) * sin_a + width * cos_a)
        right_y = cy - int((length * 0.45) * cos_a - width * sin_a)
        
        draw.polygon([(cx, cy + 15), (left_x, left_y), (tip_x, tip_y), (right_x, right_y)], fill=fill_col, outline=(216, 27, 96, 200))
        # Highlight along center spine
        draw.line([(cx, cy + 10), (tip_x, tip_y)], fill=tip_col, width=3)

    # Outer layer
    outer_angles = [-65, -45, -25, 0, 25, 45, 65]
    for ang in outer_angles:
        draw_petal(ang, 125, 34, (244, 143, 177, 240), (255, 235, 245, 220))

    # Mid layer
    mid_angles = [-50, -30, -10, 10, 30, 50]
    for ang in mid_angles:
        draw_petal(ang, 105, 30, (240, 98, 146, 250), (255, 245, 250, 240))

    # Inner layer
    inner_angles = [-35, -15, 0, 15, 35]
    for ang in inner_angles:
        draw_petal(ang, 80, 26, (233, 30, 99, 255), (255, 255, 255, 255))

    # 4. Golden seed head / stamen core
    draw.ellipse([cx - 24, cy - 15, cx + 24, cy + 20], fill=(255, 213, 79, 255), outline=(245, 127, 23, 255), width=2)
    # Stamen dots
    for dx in range(-14, 16, 7):
        for dy in range(-7, 10, 6):
            draw.point((cx + dx, cy + dy), fill=(230, 81, 0, 255))

    res = img.resize((128, 128), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG')
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")

def generate_fx_petal(out_path):
    # Target 64x64, supersample at 4x (256x256)
    w, h = 256, 256
    cx, cy = w // 2, h // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Glow around petal
    for r in range(80, 0, -3):
        a = int(45 * (1.0 - r / 80))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 235, 100, a))

    # Curved golden lotus petal
    # S-curved organic petal geometry
    pts = [
        (cx - 30, cy + 70),  # base
        (cx - 65, cy + 25),
        (cx - 60, cy - 35),
        (cx - 20, cy - 85),  # tip
        (cx + 25, cy - 60),
        (cx + 55, cy - 10),
        (cx + 45, cy + 45),
        (cx + 10, cy + 75)
    ]
    draw.polygon(pts, fill=(255, 215, 0, 245), outline=(245, 127, 23, 255))

    # Inner bright golden gradient highlight
    inner_pts = [
        (cx - 15, cy + 50),
        (cx - 35, cy + 15),
        (cx - 30, cy - 25),
        (cx - 15, cy - 65),
        (cx + 15, cy - 45),
        (cx + 30, cy - 5),
        (cx + 20, cy + 35)
    ]
    draw.polygon(inner_pts, fill=(255, 249, 196, 250))
    draw.line([(cx - 10, cy + 60), (cx - 15, cy - 70)], fill=(255, 255, 255, 240), width=4)

    # Sparkling specks
    sparkles = [(cx - 70, cy - 20), (cx + 65, cy - 40), (cx + 30, cy + 60)]
    for sx, sy in sparkles:
        draw.line([(sx - 8, sy), (sx + 8, sy)], fill=(255, 255, 255, 220), width=2)
        draw.line([(sx, sy - 8), (sx, sy + 8)], fill=(255, 255, 255, 220), width=2)

    res = img.resize((64, 64), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG')
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")

def generate_fx_bell(out_path):
    # Target 256x256, supersample at 2x (512x512)
    w, h = 512, 512
    cx, cy = w // 2, h // 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Divine flash rays (16 radiating rays)
    num_rays = 16
    for i in range(num_rays):
        ang = (i * 2 * math.pi) / num_rays
        length = 230
        w_ang = 0.05
        p1 = (cx, cy)
        p2 = (cx + int(length * math.cos(ang - w_ang)), cy + int(length * math.sin(ang - w_ang)))
        p3 = (cx + int((length + 20) * math.cos(ang)), cy + int((length + 20) * math.sin(ang)))
        p4 = (cx + int(length * math.cos(ang + w_ang)), cy + int(length * math.sin(ang + w_ang)))
        draw.polygon([p1, p2, p3, p4], fill=(255, 225, 77, 85))

    # 2. Golden energy shockwave rings
    for r, width, a in [(170, 5, 120), (210, 3, 90), (130, 4, 150)]:
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 235, 120, a), width=width)

    # 3. Stylized temple bell (Đại Hồng Chung)
    bell_w = 120
    bell_top = cy - 110
    bell_bot = cy + 90
    
    # Bell top crown / hanger (quai chuông bồ lao)
    draw.ellipse([cx - 25, bell_top - 30, cx + 25, bell_top + 10], outline=(255, 215, 0, 255), width=8)
    
    # Bell body
    bell_pts = [
        (cx - 45, bell_top),
        (cx + 45, bell_top),
        (cx + 60, bell_top + 70),
        (cx + 85, bell_bot),
        (cx + 90, bell_bot + 20),
        (cx - 90, bell_bot + 20),
        (cx - 85, bell_bot),
        (cx - 60, bell_top + 70)
    ]
    draw.polygon(bell_pts, fill=(255, 193, 7, 240), outline=(255, 245, 157, 255), width=4)

    # Bell decorative horizontal relief bands & striking boss (núm chuông)
    for y_band in [bell_top + 40, bell_top + 90, bell_top + 140]:
        draw.line([(cx - 65, y_band), (cx + 65, y_band)], fill=(255, 238, 88, 220), width=4)
    # Bosses (circular medallions)
    draw.ellipse([cx - 18, bell_top + 95, cx + 18, bell_top + 131], fill=(255, 249, 196, 255), outline=(245, 127, 23, 255), width=3)

    # 4. Center radiant core burst
    for r in range(90, 0, -3):
        a = int(180 * (1.0 - r / 90))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 220, a))

    # 5. Starburst cross
    draw.line([(cx - 160, cy), (cx + 160, cy)], fill=(255, 255, 255, 210), width=4)
    draw.line([(cx, cy - 160), (cx, cy + 160)], fill=(255, 255, 255, 210), width=4)

    res = img.resize((256, 256), Image.Resampling.LANCZOS)
    res.save(out_path, 'PNG')
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes, size={res.size})")

generate_fx_halo('assets/fx/fx_halo.png')
generate_fx_lotus('assets/fx/fx_lotus.png')
generate_fx_petal('assets/fx/fx_petal.png')
generate_fx_bell('assets/fx/fx_bell.png')
