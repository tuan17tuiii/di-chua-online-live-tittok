import os
import hashlib
import wave
import struct
import math
from PIL import Image

WORKSPACE_ROOT = r"c:\Users\tn018\Desktop\Person\media\tiktok\app-live"
ASSETS_DIR = os.path.join(WORKSPACE_ROOT, "assets")

def audit_character_spritesheets():
    print("=" * 70)
    print("DEEP AUDIT: CHARACTER SPRITESHEETS & FRAMES")
    print("=" * 70)
    chars = [
        ("char_man", "characters/anim_man.png", 8),
        ("char_woman", "characters/anim_woman.png", 8),
        ("char_granny", "characters/anim_granny.png", 8),
        ("char_child", "characters/anim_child.png", 8),
        ("char_monk", "characters/anim_monk.png", 8),
        ("char_nun", "characters/anim_nun.png", 8),
        ("char_master", "characters/anim_master.png", 8),
    ]

    char_crops = {}

    for cid, rel_path, frame_count in chars:
        p = os.path.join(ASSETS_DIR, rel_path.replace("/", os.sep))
        im = Image.open(p)
        w, h = im.size
        fw = w // frame_count
        print(f"\nEvaluating character: {cid} (total strip: {w}x{h}, frame: {fw}x{h})")

        frames = []
        for i in range(frame_count):
            box = (i * fw, 0, (i + 1) * fw, h)
            frame_crop = im.crop(box)
            frames.append(frame_crop)

        char_crops[cid] = (frames, fw, h)

        # Check frame-to-frame variations using pixel differences
        def frame_diff(im_a, im_b):
            bytes_a = im_a.tobytes()
            bytes_b = im_b.tobytes()
            diff_sum = sum(abs(a - b) for a, b in zip(bytes_a, bytes_b))
            return diff_sum / len(bytes_a)

        diff_0_1 = frame_diff(frames[0], frames[1])
        diff_0_4 = frame_diff(frames[0], frames[4])
        diff_4_7 = frame_diff(frames[4], frames[7])

        print(f"  Frame variation diff(F0, F1) [walk step]:      {diff_0_1:.2f}")
        print(f"  Frame variation diff(F0, F4) [walk vs sit]:     {diff_0_4:.2f}")
        print(f"  Frame variation diff(F4, F7) [sit vs idle]:     {diff_4_7:.2f}")

        if diff_0_1 == 0 or diff_0_4 == 0 or diff_4_7 == 0:
            print(f"  [FAIL] Static/identical frames detected in {cid}!")
        else:
            print(f"  [PASS] Non-trivial frame variations confirmed across walk, sitting, and idle.")

    # Cross-character difference
    print("\n--- Cross-Character Distinctiveness ---")
    char_keys = list(char_crops.keys())
    for i in range(len(char_keys)):
        for j in range(i + 1, len(char_keys)):
            c1 = char_keys[i]
            c2 = char_keys[j]
            f1_idle = char_crops[c1][0][7] # Frame 7 idle
            f2_idle = char_crops[c2][0][7] # Frame 7 idle
            f2_resized = f2_idle.resize(f1_idle.size)
            bytes_a = f1_idle.tobytes()
            bytes_b = f2_resized.tobytes()
            diff = sum(abs(a - b) for a, b in zip(bytes_a, bytes_b)) / len(bytes_a)
            print(f"  Diff({c1:12}, {c2:12}): {diff:.2f}")
            if diff < 1.0:
                print(f"  [FAIL] {c1} and {c2} appear identical/aliased!")

def audit_audio_sfx_waveforms():
    print("\n" + "=" * 70)
    print("DEEP AUDIT: AUDIO SFX WAVEFORMS & DIVERSITY")
    print("=" * 70)

    mo_files = [
        "audio/sfx/mo_strike_01.wav",
        "audio/sfx/mo_strike_02.wav",
        "audio/sfx/mo_strike_03.wav",
    ]

    mo_signals = []
    for rel_path in mo_files:
        p = os.path.join(ASSETS_DIR, rel_path.replace("/", os.sep))
        with wave.open(p, "rb") as wf:
            n_frames = wf.getnframes()
            data = wf.readframes(n_frames)
            samples = []
            for i in range(0, len(data), 3):
                b = data[i:i+3]
                val = int.from_bytes(b, byteorder='little', signed=True)
                samples.append(val)
            mo_signals.append((rel_path, samples))
            sum_sq = sum(s * s for s in samples)
            rms = math.sqrt(sum_sq / len(samples))
            peak = max(abs(s) for s in samples)
            print(f"{rel_path}: {n_frames} frames, RMS={rms:.0f}, Peak={peak:.0f}")

    def samples_diff(s1, s2):
        min_len = min(len(s1), len(s2))
        return sum(abs(s1[i] - s2[i]) for i in range(min_len)) / min_len

    diff_1_2 = samples_diff(mo_signals[0][1], mo_signals[1][1])
    diff_2_3 = samples_diff(mo_signals[1][1], mo_signals[2][1])
    diff_1_3 = samples_diff(mo_signals[0][1], mo_signals[2][1])
    print(f"Mo Strike Diff(01, 02): {diff_1_2:.2f}")
    print(f"Mo Strike Diff(02, 03): {diff_2_3:.2f}")
    print(f"Mo Strike Diff(01, 03): {diff_1_3:.2f}")
    if min(diff_1_2, diff_2_3, diff_1_3) == 0:
        print("[FAIL] Identical audio detected in mo strikes!")
    else:
        print("[PASS] All 3 mo strikes have distinct acoustic waveforms.")

    bells = [
        ("bell_bowl.wav", "audio/sfx/bell_bowl.wav"),
        ("bell_temple.wav", "audio/sfx/bell_temple.wav"),
        ("gift_tier1.wav", "audio/sfx/gift_tier1.wav"),
        ("gift_tier2.wav", "audio/sfx/gift_tier2.wav"),
    ]
    for name, rel_path in bells:
        p = os.path.join(ASSETS_DIR, rel_path.replace("/", os.sep))
        with wave.open(p, "rb") as wf:
            n_frames = wf.getnframes()
            dur = n_frames / wf.getframerate()
            print(f"{name}: {dur:.2f}s, {n_frames} frames at {wf.getframerate()}Hz")

def audit_codebase_cleanliness():
    print("\n" + "=" * 70)
    print("DEEP AUDIT: CODEBASE CLEANLINESS & WATERMARK DETECTION")
    print("=" * 70)

    suspicious_patterns = [
        "_q = [",
        "__watermark",
        "eval(",
        "fromcharcode",
        "base64.b64decode",
    ]

    target_dirs = ["src", "public", "scripts", "test"]
    flagged = []

    for d in target_dirs:
        full_d = os.path.join(WORKSPACE_ROOT, d)
        for root, dirs, files in os.walk(full_d):
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in (".js", ".mjs", ".html", ".css", ".json", ".py"):
                    fpath = os.path.join(root, f)
                    try:
                        with open(fpath, "r", encoding="utf-8", errors="ignore") as fh:
                            content = fh.read()
                            for pat in suspicious_patterns:
                                if pat in content.lower():
                                    flagged.append((fpath, pat))
                    except Exception as e:
                        pass

    if flagged:
        print("[FAIL - SUSPICIOUS CODE DETECTED]")
        for fp, pat in flagged:
            print(f"  {fp}: matched '{pat}'")
    else:
        print("[PASS] Clean scan across src/, public/, scripts/, test/. Zero watermarks or obfuscated arrays found.")

if __name__ == "__main__":
    audit_character_spritesheets()
    audit_audio_sfx_waveforms()
    audit_codebase_cleanliness()
