import os
import sys
from PIL import Image

EXPECTED_ASSETS = [
    # 1. Backgrounds
    {"path": "assets/backgrounds/hall.jpg", "format": "JPEG", "mode": "RGB", "width": 1080, "height": 1920, "has_alpha": False},
    {"path": "assets/backgrounds/zen_garden.jpg", "format": "JPEG", "mode": "RGB", "width": 1080, "height": 1920, "has_alpha": False},

    # 2. Altar Props & Statues
    {"path": "assets/altar/altar_table.png", "format": "PNG", "mode": "RGBA", "width": 1080, "height": 850, "has_alpha": True},
    {"path": "assets/altar/statue_shakyamuni.png", "format": "PNG", "mode": "RGBA", "width": 420, "height": 680, "has_alpha": True},
    {"path": "assets/altar/statue_amitabha.png", "format": "PNG", "mode": "RGBA", "width": 420, "height": 680, "has_alpha": True},
    {"path": "assets/altar/statue_avalokiteshvara.png", "format": "PNG", "mode": "RGBA", "width": 420, "height": 680, "has_alpha": True},
    {"path": "assets/altar/censer_bronze.png", "format": "PNG", "mode": "RGBA", "width": 280, "height": 260, "has_alpha": True},
    {"path": "assets/altar/candle_stand.png", "format": "PNG", "mode": "RGBA", "width": 140, "height": 320, "has_alpha": True},
    {"path": "assets/altar/meditation_cushion.png", "format": "PNG", "mode": "RGBA", "width": 240, "height": 120, "has_alpha": True},

    # 3. Characters (7 portraits + 7 spritesheets)
    {"path": "assets/characters/c_man.png", "format": "PNG", "mode": "RGBA", "width": 212, "height": 300, "has_alpha": True},
    {"path": "assets/characters/anim_man.png", "format": "PNG", "mode": "RGBA", "width": 1696, "height": 300, "has_alpha": True, "frames": 8, "fw": 212},

    {"path": "assets/characters/c_woman.png", "format": "PNG", "mode": "RGBA", "width": 200, "height": 300, "has_alpha": True},
    {"path": "assets/characters/anim_woman.png", "format": "PNG", "mode": "RGBA", "width": 1600, "height": 300, "has_alpha": True, "frames": 8, "fw": 200},

    {"path": "assets/characters/c_granny.png", "format": "PNG", "mode": "RGBA", "width": 195, "height": 300, "has_alpha": True},
    {"path": "assets/characters/anim_granny.png", "format": "PNG", "mode": "RGBA", "width": 1560, "height": 300, "has_alpha": True, "frames": 8, "fw": 195},

    {"path": "assets/characters/c_child.png", "format": "PNG", "mode": "RGBA", "width": 180, "height": 260, "has_alpha": True},
    {"path": "assets/characters/anim_child.png", "format": "PNG", "mode": "RGBA", "width": 1440, "height": 260, "has_alpha": True, "frames": 8, "fw": 180},

    {"path": "assets/characters/c_monk.png", "format": "PNG", "mode": "RGBA", "width": 215, "height": 300, "has_alpha": True},
    {"path": "assets/characters/anim_monk.png", "format": "PNG", "mode": "RGBA", "width": 1720, "height": 300, "has_alpha": True, "frames": 8, "fw": 215},

    {"path": "assets/characters/c_nun.png", "format": "PNG", "mode": "RGBA", "width": 205, "height": 300, "has_alpha": True},
    {"path": "assets/characters/anim_nun.png", "format": "PNG", "mode": "RGBA", "width": 1640, "height": 300, "has_alpha": True, "frames": 8, "fw": 205},

    {"path": "assets/characters/c_master.png", "format": "PNG", "mode": "RGBA", "width": 230, "height": 320, "has_alpha": True},
    {"path": "assets/characters/anim_master.png", "format": "PNG", "mode": "RGBA", "width": 1840, "height": 320, "has_alpha": True, "frames": 8, "fw": 230},

    # 4. Visual FX
    {"path": "assets/fx/fx_halo.png", "format": "PNG", "mode": "RGBA", "width": 512, "height": 512, "has_alpha": True},
    {"path": "assets/fx/fx_lotus.png", "format": "PNG", "mode": "RGBA", "width": 128, "height": 128, "has_alpha": True},
    {"path": "assets/fx/fx_petal.png", "format": "PNG", "mode": "RGBA", "width": 64, "height": 64, "has_alpha": True},
    {"path": "assets/fx/fx_bell.png", "format": "PNG", "mode": "RGBA", "width": 256, "height": 256, "has_alpha": True}
]

print("==================================================================")
print(f"VERIFYING ALL {len(EXPECTED_ASSETS)} VISUAL ASSETS ON DISK")
print("==================================================================")

failures = []

for idx, spec in enumerate(EXPECTED_ASSETS, 1):
    fpath = spec["path"]
    if not os.path.exists(fpath):
        failures.append(f"[{idx}] MISSING FILE: {fpath}")
        print(f"[{idx:02d}/27] FAIL: {fpath} does not exist!")
        continue

    size_bytes = os.path.getsize(fpath)
    if size_bytes == 0:
        failures.append(f"[{idx}] ZERO BYTES: {fpath}")
        print(f"[{idx:02d}/27] FAIL: {fpath} is 0 bytes!")
        continue

    try:
        im = Image.open(fpath)
    except Exception as e:
        failures.append(f"[{idx}] CORRUPT IMAGE: {fpath} ({e})")
        print(f"[{idx:02d}/27] FAIL: {fpath} cannot be opened: {e}")
        continue

    # Dimension check
    w, h = im.size
    if w != spec["width"] or h != spec["height"]:
        failures.append(f"[{idx}] DIMENSION MISMATCH: {fpath} got {w}x{h}, expected {spec['width']}x{spec['height']}")
        print(f"[{idx:02d}/27] FAIL: {fpath} dimensions {w}x{h} != expected {spec['width']}x{spec['height']}")
        continue

    # Format / Mode check
    if im.format != spec["format"]:
        failures.append(f"[{idx}] FORMAT MISMATCH: {fpath} got {im.format}, expected {spec['format']}")
        print(f"[{idx:02d}/27] FAIL: {fpath} format {im.format} != expected {spec['format']}")
        continue

    if im.mode != spec["mode"]:
        failures.append(f"[{idx}] MODE MISMATCH: {fpath} got {im.mode}, expected {spec['mode']}")
        print(f"[{idx:02d}/27] FAIL: {fpath} mode {im.mode} != expected {spec['mode']}")
        continue

    # Alpha check for PNGs
    if spec["has_alpha"]:
        extrema = im.getextrema()
        alpha_min = extrema[3][0]
        if alpha_min != 0:
            failures.append(f"[{idx}] NO TRANSPARENCY: {fpath} alpha_min={alpha_min} (expected 0)")
            print(f"[{idx:02d}/27] FAIL: {fpath} alpha channel has no transparent pixels (alpha_min={alpha_min})")
            continue

    # Spritesheet check
    if "frames" in spec:
        expected_w = spec["fw"] * spec["frames"]
        if w != expected_w:
            failures.append(f"[{idx}] SPRITESHEET WIDTH MISMATCH: {fpath} {w} != {expected_w}")
            print(f"[{idx:02d}/27] FAIL: {fpath} spritesheet width {w} != {expected_w}")
            continue

    print(f"[{idx:02d}/27] PASS: {fpath} ({w}x{h} {im.format} {im.mode}, {size_bytes} bytes)")

print("\n==================================================================")
if len(failures) == 0:
    print(f"ALL {len(EXPECTED_ASSETS)} VISUAL ASSETS VERIFIED 100% CLEAN AND PASSING!")
    print("==================================================================")
    sys.exit(0)
else:
    print(f"FAILED WITH {len(failures)} DEFECTS:")
    for f in failures:
        print("  - " + f)
    print("==================================================================")
    sys.exit(1)
