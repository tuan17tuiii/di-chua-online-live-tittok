import os
import math
from PIL import Image, ImageDraw

os.makedirs('assets/characters', exist_ok=True)

CHAR_SPECS = [
    {
        "id": "char_man",
        "fw": 212, "fh": 300,
        "name": "Cư sĩ Nam áo lam",
        "robe": (92, 111, 132, 255),       # Grey-blue Áo lam
        "trim": (55, 71, 79, 255),         # Slate trim
        "skin": (245, 205, 170, 255),
        "hair": (40, 30, 25, 255),
        "style": "man"
    },
    {
        "id": "char_woman",
        "fw": 200, "fh": 300,
        "name": "Cư sĩ Nữ áo lam",
        "robe": (107, 124, 150, 255),      # Elegant Áo dài lam
        "trim": (207, 216, 220, 255),      # Silk scarf trim
        "skin": (250, 215, 185, 255),
        "hair": (35, 25, 20, 255),
        "style": "woman"
    },
    {
        "id": "char_granny",
        "fw": 195, "fh": 300,
        "name": "Phật tử cao tuổi áo nâu sồng",
        "robe": (93, 64, 55, 255),         # Earth brown Áo nâu sồng
        "trim": (141, 110, 99, 255),
        "skin": (235, 195, 160, 255),
        "hair": (70, 60, 55, 255),         # Velvet headscarf (khăn vấn)
        "style": "granny"
    },
    {
        "id": "char_child",
        "fw": 180, "fh": 260,
        "name": "Chú tiểu ngây thơ",
        "robe": (121, 85, 72, 255),        # Novice monk brown tunic
        "trim": (188, 170, 164, 255),
        "skin": (250, 210, 175, 255),
        "hair": (45, 30, 20, 255),         # Three tufts of hair (tóc ba chỏm)
        "style": "child"
    },
    {
        "id": "char_monk",
        "fw": 215, "fh": 300,
        "name": "Sư thầy thiền môn",
        "robe": (141, 91, 40, 255),        # Ochre monastic robe (nâu nghệ)
        "trim": (212, 143, 56, 255),       # Saffron inner collar
        "skin": (240, 200, 165, 255),
        "hair": None,                      # Shaved head
        "style": "monk"
    },
    {
        "id": "char_nun",
        "fw": 205, "fh": 300,
        "name": "Sư cô ni chúng",
        "robe": (109, 91, 82, 255),        # Grey-brown monastic robe
        "trim": (161, 136, 127, 255),
        "skin": (245, 205, 175, 255),
        "hair": (93, 64, 55, 255),         # Brown cloth headband
        "style": "nun"
    },
    {
        "id": "char_master",
        "fw": 230, "fh": 320,
        "name": "Cao tăng viện chủ",
        "robe": (153, 0, 0, 255),          # Crimson ceremonial kesa (cà sa đỏ)
        "trim": (255, 215, 0, 255),        # Gold embroidery
        "skin": (240, 195, 155, 255),
        "hair": None,                      # Shaved head
        "style": "master"
    }
]

def render_frame_supersampled(spec, frame_idx):
    fw, fh = spec["fw"], spec["fh"]
    scale = 3
    sw, sh = fw * scale, fh * scale
    cx = sw // 2
    bot_y = sh - 2  # exactly bottom-anchored

    img = Image.new('RGBA', (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    robe = spec["robe"]
    trim = spec["trim"]
    skin = spec["skin"]
    hair = spec["hair"]
    style = spec["style"]

    # Proportions based on character height
    total_h = int(sh * (0.84 if style == "child" else 0.88))
    head_r = int(sw * 0.14)

    if frame_idx in [0, 1, 2, 3]:
        # --- Walking Cycle (Frames 0 to 3) ---
        bob = [0, 8, 0, 8][frame_idx]
        foot_offsets = [(-35, 35), (-12, 12), (35, -35), (12, -12)][frame_idx]

        stand_bot = bot_y
        hip_y = stand_bot - int(total_h * 0.46) + bob
        neck_y = stand_bot - int(total_h * 0.80) + bob
        head_cy = neck_y - head_r

        # Feet / Shoes
        shoe_color = (40, 30, 25, 255)
        f_left_x = cx + foot_offsets[0]
        f_right_x = cx + foot_offsets[1]
        draw.ellipse([f_left_x - 18, stand_bot - 14, f_left_x + 18, stand_bot], fill=shoe_color)
        draw.ellipse([f_right_x - 18, stand_bot - 14, f_right_x + 18, stand_bot], fill=shoe_color)

        # Lower Robe / Skirt / Trousers
        robe_bot_y = stand_bot - 10
        robe_pts = [
            (cx - int(sw * 0.28), robe_bot_y),
            (cx + int(sw * 0.28), robe_bot_y),
            (cx + int(sw * 0.22), hip_y),
            (cx - int(sw * 0.22), hip_y)
        ]
        draw.polygon(robe_pts, fill=robe)
        draw.line([(cx, hip_y), (cx, robe_bot_y)], fill=trim, width=4)

        # Torso
        shoulder_w = int(sw * 0.32)
        torso_pts = [
            (cx - shoulder_w, neck_y + 10),
            (cx + shoulder_w, neck_y + 10),
            (cx + int(sw * 0.24), hip_y + 10),
            (cx - int(sw * 0.24), hip_y + 10)
        ]
        draw.polygon(torso_pts, fill=robe)
        # Robe collar / trim
        draw.polygon([(cx, hip_y - 20), (cx + shoulder_w - 15, neck_y + 10), (cx - 15, neck_y + 10)], fill=trim)

        # Master ceremonial kesa sash
        if style == "master":
            draw.line([(cx - shoulder_w + 10, neck_y + 10), (cx + int(sw * 0.22), hip_y)], fill=(255, 215, 0, 255), width=14)
            # Gold grid lines
            for gy in range(neck_y + 40, hip_y, 40):
                draw.line([(cx - 40, gy), (cx + 40, gy)], fill=(255, 235, 120, 255), width=3)

        # Arms in Prayer / Mindful Walk Mudra
        arm_swing = [(-15, 15), (0, 0), (15, -15), (0, 0)][frame_idx]
        draw.line([(cx - shoulder_w + 10, neck_y + 20), (cx - 20 + arm_swing[0], hip_y - 30)], fill=robe, width=22)
        draw.line([(cx + shoulder_w - 10, neck_y + 20), (cx + 20 + arm_swing[1], hip_y - 30)], fill=robe, width=22)
        # Hands (chắp tay / niệm Phật)
        draw.ellipse([cx - 16, hip_y - 45, cx + 16, hip_y - 20], fill=skin)

    elif frame_idx in [4, 5, 6]:
        # --- Sitting Down Transition (Frames 4 to 6) ---
        # 4: bending knees, 5: kneeling down, 6: settling onto floor
        t_stage = (frame_idx - 4) / 2.0  # 0.0 to 1.0
        cur_h = int(total_h * (0.88 - 0.25 * t_stage))
        hip_y = bot_y - int(cur_h * (0.35 - 0.15 * t_stage))
        neck_y = bot_y - int(cur_h * 0.75)
        head_cy = neck_y - head_r

        spread = int(sw * (0.30 + 0.12 * t_stage))
        base_pts = [
            (cx - spread, bot_y),
            (cx + spread, bot_y),
            (cx + int(spread * 0.8), hip_y),
            (cx - int(spread * 0.8), hip_y)
        ]
        draw.polygon(base_pts, fill=robe)

        shoulder_w = int(sw * (0.32 - 0.02 * t_stage))
        torso_pts = [
            (cx - shoulder_w, neck_y + 10),
            (cx + shoulder_w, neck_y + 10),
            (cx + int(sw * 0.24), hip_y + 10),
            (cx - int(sw * 0.24), hip_y + 10)
        ]
        draw.polygon(torso_pts, fill=robe)
        draw.polygon([(cx, hip_y - 10), (cx + shoulder_w - 15, neck_y + 10), (cx - 15, neck_y + 10)], fill=trim)

        if style == "master":
            draw.line([(cx - shoulder_w + 10, neck_y + 10), (cx + int(sw * 0.22), hip_y)], fill=(255, 215, 0, 255), width=14)

        # Arms lowering towards knees
        draw.line([(cx - shoulder_w + 10, neck_y + 20), (cx - int(spread * 0.5), hip_y + 20)], fill=robe, width=22)
        draw.line([(cx + shoulder_w - 10, neck_y + 20), (cx + int(spread * 0.5), hip_y + 20)], fill=robe, width=22)
        draw.ellipse([cx - int(spread * 0.5) - 14, hip_y + 15, cx - int(spread * 0.5) + 14, hip_y + 35], fill=skin)
        draw.ellipse([cx + int(spread * 0.5) - 14, hip_y + 15, cx + int(spread * 0.5) + 14, hip_y + 35], fill=skin)

    else:
        # --- Frame 7: Seated Meditation Idle (Tĩnh tọa kiết già) ---
        # Exactly bottom-anchored at bot_y
        seat_h = int(total_h * 0.65)
        neck_y = bot_y - seat_h
        head_cy = neck_y - head_r
        chest_cy = neck_y + int(seat_h * 0.35)
        lap_cy = bot_y - int(seat_h * 0.22)

        # Crossed legs oval base on floor touching bot_y
        leg_rx = int(sw * 0.44)
        leg_ry = int(seat_h * 0.26)
        draw.ellipse([cx - leg_rx, bot_y - leg_ry * 2, cx + leg_rx, bot_y], fill=robe, outline=trim, width=4)

        # Torso (upright meditative posture)
        shoulder_w = int(sw * 0.32)
        torso_pts = [
            (cx - shoulder_w, neck_y + 10),
            (cx + shoulder_w, neck_y + 10),
            (cx + int(sw * 0.30), lap_cy),
            (cx - int(sw * 0.30), lap_cy)
        ]
        draw.polygon(torso_pts, fill=robe)
        # Collar / lapel trim
        draw.polygon([(cx, lap_cy - 20), (cx + shoulder_w - 15, neck_y + 10), (cx - 15, neck_y + 10)], fill=trim)

        # Master ceremonial kesa
        if style == "master":
            draw.line([(cx - shoulder_w + 10, neck_y + 10), (cx + int(sw * 0.26), bot_y - 20)], fill=(255, 215, 0, 255), width=16)
            for gy in range(neck_y + 45, bot_y - 30, 45):
                draw.line([(cx - 50, gy), (cx + 50, gy)], fill=(255, 235, 120, 255), width=4)

        # Arms folded in lap: Dhyana Mudra (Ấn thiền định)
        draw.line([(cx - shoulder_w + 10, neck_y + 20), (cx - 20, lap_cy)], fill=robe, width=24)
        draw.line([(cx + shoulder_w - 10, neck_y + 20), (cx + 20, lap_cy)], fill=robe, width=24)
        # Hands resting in lap with overlapping palms
        draw.ellipse([cx - 36, lap_cy - 16, cx + 36, lap_cy + 16], fill=skin, outline=trim, width=2)
        draw.line([(cx - 20, lap_cy), (cx + 20, lap_cy)], fill=(200, 150, 110, 255), width=2)

        # Prayer beads around neck (Granny and Master)
        if style in ["granny", "master", "monk"]:
            for bi in range(9):
                bx = cx + int(50 * math.cos(bi * math.pi / 8 + math.pi))
                by = neck_y + 25 + int(55 * math.sin(bi * math.pi / 8))
                draw.ellipse([bx - 6, by - 6, bx + 6, by + 6], fill=(120, 80, 40, 255), outline=(60, 40, 20, 255), width=1)

    # --- Head, Face, and Hair / Headgear (Common to all frames) ---
    # Neck
    draw.polygon([(cx - 16, neck_y + 15), (cx + 16, neck_y + 15), (cx + 14, head_cy + head_r - 10), (cx - 14, head_cy + head_r - 10)], fill=skin)

    # Head Oval
    draw.ellipse([cx - head_r, head_cy - head_r, cx + head_r, head_cy + head_r], fill=skin)

    # Hair / Headwear styles
    if style == "man":
        # Neat side-parted black hair
        draw.chord([cx - head_r - 2, head_cy - head_r - 4, cx + head_r + 2, head_cy + head_r * 0.3], start=180, end=360, fill=hair)
    elif style == "woman":
        # Elegant traditional hair bun (búi tóc)
        draw.chord([cx - head_r - 2, head_cy - head_r - 6, cx + head_r + 2, head_cy + head_r * 0.2], start=180, end=360, fill=hair)
        # Hair bun on top
        draw.ellipse([cx - 24, head_cy - head_r - 26, cx + 24, head_cy - head_r + 8], fill=hair)
        # Golden hairpin (trâm cài vàng)
        draw.line([(cx - 32, head_cy - head_r - 10), (cx + 32, head_cy - head_r - 10)], fill=(255, 215, 0, 255), width=3)
    elif style == "granny":
        # Traditional Vietnamese velvet headscarf (khăn vấn đầu)
        draw.ellipse([cx - head_r - 6, head_cy - head_r - 10, cx + head_r + 6, head_cy - head_r * 0.1], fill=hair)
        draw.line([(cx - head_r, head_cy - head_r * 0.4), (cx + head_r, head_cy - head_r * 0.4)], fill=(120, 100, 90, 255), width=3)
    elif style == "child":
        # Three tufts of hair (tóc ba chỏm)
        draw.ellipse([cx - 14, head_cy - head_r - 18, cx + 14, head_cy - head_r + 4], fill=hair) # center tuft
        draw.ellipse([cx - head_r - 6, head_cy - head_r * 0.4, cx - head_r + 14, head_cy - head_r * 0.1], fill=hair) # left tuft
        draw.ellipse([cx + head_r - 14, head_cy - head_r * 0.4, cx + head_r + 6, head_cy - head_r * 0.1], fill=hair) # right tuft
    elif style == "nun":
        # Brown cloth headband
        draw.ellipse([cx - head_r - 2, head_cy - head_r - 4, cx + head_r + 2, head_cy - head_r * 0.2], fill=hair)
    elif style in ["monk", "master"]:
        # Shaved monastic head - subtle scalp shading
        draw.arc([cx - head_r, head_cy - head_r, cx + head_r, head_cy], start=180, end=360, fill=(210, 175, 140, 255), width=4)

    # Face details (mindful, compassionate, serene)
    # Eyebrows
    draw.arc([cx - head_r * 0.7, head_cy - head_r * 0.35, cx - head_r * 0.15, head_cy], start=200, end=340, fill=(90, 60, 45, 255), width=3)
    draw.arc([cx + head_r * 0.15, head_cy - head_r * 0.35, cx + head_r * 0.7, head_cy], start=200, end=340, fill=(90, 60, 45, 255), width=3)
    # Eyes (gently lowered in meditation)
    draw.arc([cx - head_r * 0.65, head_cy - head_r * 0.1, cx - head_r * 0.2, head_cy + head_r * 0.2], start=20, end=160, fill=(60, 40, 30, 255), width=3)
    draw.arc([cx + head_r * 0.2, head_cy - head_r * 0.1, cx + head_r * 0.65, head_cy + head_r * 0.2], start=20, end=160, fill=(60, 40, 30, 255), width=3)
    # Nose
    draw.line([(cx, head_cy), (cx, head_cy + head_r * 0.3)], fill=(190, 150, 120, 255), width=2)
    # Peaceful smile
    draw.arc([cx - head_r * 0.3, head_cy + head_r * 0.45, cx + head_r * 0.3, head_cy + head_r * 0.65], start=20, end=160, fill=(180, 70, 60, 255), width=3)

    # Downsample to exact frame size (fw x fh)
    res = img.resize((fw, fh), Image.Resampling.LANCZOS)
    return res

def generate_all_characters():
    for spec in CHAR_SPECS:
        cid = spec["id"]
        fw = spec["fw"]
        fh = spec["fh"]
        total_w = fw * 8

        print(f"Generating character {cid} (frame={fw}x{fh}, strip={total_w}x{fh})...")

        # 1. Generate 8 frames
        frames = []
        for f_idx in range(8):
            f_img = render_frame_supersampled(spec, f_idx)
            frames.append(f_img)

        # 2. Save static portrait c_*.png from Frame 7 (seated meditation)
        c_path = f"assets/characters/c_{cid.replace('char_', '')}.png"
        frames[7].save(c_path, 'PNG')
        print(f"  -> Saved portrait {c_path} ({os.path.getsize(c_path)} bytes, size={frames[7].size})")

        # 3. Assemble 8-frame sequential action spritesheet anim_*.png
        strip = Image.new('RGBA', (total_w, fh), (0, 0, 0, 0))
        for f_idx, f_img in enumerate(frames):
            strip.paste(f_img, (f_idx * fw, 0))

        anim_path = f"assets/characters/anim_{cid.replace('char_', '')}.png"
        strip.save(anim_path, 'PNG')
        print(f"  -> Saved spritesheet {anim_path} ({os.path.getsize(anim_path)} bytes, size={strip.size})")

generate_all_characters()
