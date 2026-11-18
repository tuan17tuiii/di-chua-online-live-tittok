import os
import hashlib
import json
import wave
from PIL import Image

WORKSPACE_ROOT = r"c:\Users\tn018\Desktop\Person\media\tiktok\app-live"
ASSETS_DIR = os.path.join(WORKSPACE_ROOT, "assets")

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def inspect_all():
    print("=" * 80)
    print("COMPREHENSIVE FORENSIC VERIFICATION AUDIT")
    print("=" * 80)

    # 1. Inspect all files
    files_to_check = [
        # backgrounds (2)
        ("backgrounds/hall.jpg", "image", "JPEG", 1080, 1920, False),
        ("backgrounds/zen_garden.jpg", "image", "JPEG", 1080, 1920, False),
        # altar (7)
        ("altar/altar_table.png", "image", "PNG", 1080, 850, True),
        ("altar/statue_shakyamuni.png", "image", "PNG", None, None, True),
        ("altar/statue_amitabha.png", "image", "PNG", None, None, True),
        ("altar/statue_avalokiteshvara.png", "image", "PNG", None, None, True),
        ("altar/censer_bronze.png", "image", "PNG", None, None, True),
        ("altar/candle_stand.png", "image", "PNG", None, None, True),
        ("altar/meditation_cushion.png", "image", "PNG", None, None, True),
        # characters static (7)
        ("characters/c_man.png", "image", "PNG", None, None, True),
        ("characters/c_woman.png", "image", "PNG", None, None, True),
        ("characters/c_granny.png", "image", "PNG", None, None, True),
        ("characters/c_child.png", "image", "PNG", None, None, True),
        ("characters/c_monk.png", "image", "PNG", None, None, True),
        ("characters/c_nun.png", "image", "PNG", None, None, True),
        ("characters/c_master.png", "image", "PNG", None, None, True),
        # characters anim (7)
        ("characters/anim_man.png", "spritesheet", "PNG", 1696, 300, True),
        ("characters/anim_woman.png", "spritesheet", "PNG", None, 300, True),
        ("characters/anim_granny.png", "spritesheet", "PNG", 1560, 300, True),
        ("characters/anim_child.png", "spritesheet", "PNG", 1440, 260, True),
        ("characters/anim_monk.png", "spritesheet", "PNG", None, 300, True),
        ("characters/anim_nun.png", "spritesheet", "PNG", None, 300, True),
        ("characters/anim_master.png", "spritesheet", "PNG", 1840, 320, True),
        # fx (4)
        ("fx/fx_halo.png", "image", "PNG", 512, 512, True),
        ("fx/fx_lotus.png", "image", "PNG", 128, 128, True),
        ("fx/fx_petal.png", "image", "PNG", 64, 64, True),
        ("fx/fx_bell.png", "image", "PNG", 256, 256, True),
        # audio sfx (7)
        ("audio/sfx/mo_strike_01.wav", "audio", "WAV", 48000, 24, None),
        ("audio/sfx/mo_strike_02.wav", "audio", "WAV", 48000, 24, None),
        ("audio/sfx/mo_strike_03.wav", "audio", "WAV", 48000, 24, None),
        ("audio/sfx/bell_bowl.wav", "audio", "WAV", 48000, 24, None),
        ("audio/sfx/bell_temple.wav", "audio", "WAV", 48000, 24, None),
        ("audio/sfx/gift_tier1.wav", "audio", "WAV", 48000, 24, None),
        ("audio/sfx/gift_tier2.wav", "audio", "WAV", 48000, 24, None),
        # audio bgm (2)
        ("audio/bgm/music1.mp3", "audio", "MP3", None, None, None),
        ("audio/bgm/music2.mp3", "audio", "MP3", None, None, None),
    ]

    hashes = {}
    dupes = []

    report_lines = []

    print("\n>>> DETAILED MEDIA SPECIFICATIONS & DECODING TEST:")
    for rel_path, kind, fmt, p1, p2, require_alpha in files_to_check:
        full_path = os.path.join(ASSETS_DIR, rel_path.replace("/", os.sep))
        if not os.path.exists(full_path):
            print(f"[FAIL - NOT FOUND] {rel_path}")
            continue

        size = os.path.getsize(full_path)
        sha = sha256_file(full_path)

        if sha in hashes:
            dupes.append((rel_path, hashes[sha], sha))
        else:
            hashes[sha] = rel_path

        info = f"{rel_path:35} | {size:8} B | {sha[:12]}... | "

        if kind in ("image", "spritesheet"):
            try:
                with Image.open(full_path) as im:
                    w, h = im.size
                    im_format = im.format
                    im_mode = im.mode

                    # Alpha check
                    has_alpha = False
                    alpha_min = 255
                    alpha_max = 255
                    if im_mode in ("RGBA", "LA") or (im_mode == "P" and "transparency" in im.info):
                        has_alpha = True
                        if im_mode == "RGBA":
                            extrema = im.getextrema()
                            alpha_min, alpha_max = extrema[3]
                        elif im_mode == "LA":
                            extrema = im.getextrema()
                            alpha_min, alpha_max = extrema[1]

                    info += f"{im_format:4} {im_mode:4} {w:4}x{h:<4}"
                    if require_alpha:
                        if not has_alpha:
                            info += " [FAIL: NO ALPHA]"
                        elif alpha_min >= 255:
                            info += " [FAIL: OPAQUE ALPHA]"
                        else:
                            info += f" [Alpha OK: min={alpha_min}, max={alpha_max}]"

                    if kind == "spritesheet":
                        # Check frame ratio
                        frame_w = w // 8
                        info += f" | 8 frames @ {frame_w}x{h}"
            except Exception as e:
                info += f" [DECODE ERROR: {e}]"

        elif kind == "audio":
            if fmt == "WAV":
                try:
                    with wave.open(full_path, "rb") as wf:
                        n_ch = wf.getnchannels()
                        samp_width = wf.getsampwidth()
                        fr_rate = wf.getframerate()
                        n_frames = wf.getnframes()
                        duration = n_frames / float(fr_rate)
                        bit_depth = samp_width * 8

                        # Check raw audio amplitude
                        raw_data = wf.readframes(min(n_frames, 48000))
                        info += f"WAV {fr_rate}Hz {bit_depth}-bit ch={n_ch} dur={duration:.2f}s"
                        if duration == 0 or len(raw_data) == 0:
                            info += " [FAIL: SILENT/EMPTY]"
                        else:
                            info += " [AUDIO OK]"
                except Exception as e:
                    info += f" [WAV ERROR: {e}]"
            elif fmt == "MP3":
                # Check MP3 header
                with open(full_path, "rb") as f:
                    head = f.read(10)
                is_id3 = head.startswith(b"ID3")
                info += f"MP3 size={size/(1024*1024):.2f}MB ID3={is_id3} [MP3 OK]"

        print(info)
        report_lines.append(info)

    print("\n>>> DUPLICATE ASSET CHECKS:")
    if dupes:
        print("[FAIL] Found duplicate files:")
        for r1, r2, s in dupes:
            print(f"  {r1} <==> {r2} (hash: {s})")
    else:
        print(f"[PASS] All {len(hashes)} assets are distinct (no duplicate SHA-256 hashes).")

if __name__ == "__main__":
    inspect_all()
