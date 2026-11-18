import os
import sys
import wave
import struct
from PIL import Image

def inspect():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    print(f"Project root: {root}")

    # List of all 36 expected files
    files = [
        # Cat 1: Backgrounds
        ("bg_main_hall", "assets/backgrounds/hall.jpg", "image"),
        ("bg_zen_garden", "assets/backgrounds/zen_garden.jpg", "image"),
        
        # Cat 2: Altar
        ("altar_table_main", "assets/altar/altar_table.png", "image"),
        ("statue_shakyamuni", "assets/altar/statue_shakyamuni.png", "image"),
        ("statue_amitabha", "assets/altar/statue_amitabha.png", "image"),
        ("statue_avalokiteshvara", "assets/altar/statue_avalokiteshvara.png", "image"),
        ("altar_censer_bronze", "assets/altar/censer_bronze.png", "image"),
        ("altar_candle_stand", "assets/altar/candle_stand.png", "image"),
        ("cushion_lotus_mat", "assets/altar/meditation_cushion.png", "image"),
        
        # Cat 3: Characters (7 portraits + 7 spritesheets = 14)
        ("char_man_portrait", "assets/characters/c_man.png", "image"),
        ("char_man_strip", "assets/characters/anim_man.png", "image"),
        ("char_woman_portrait", "assets/characters/c_woman.png", "image"),
        ("char_woman_strip", "assets/characters/anim_woman.png", "image"),
        ("char_granny_portrait", "assets/characters/c_granny.png", "image"),
        ("char_granny_strip", "assets/characters/anim_granny.png", "image"),
        ("char_child_portrait", "assets/characters/c_child.png", "image"),
        ("char_child_strip", "assets/characters/anim_child.png", "image"),
        ("char_monk_portrait", "assets/characters/c_monk.png", "image"),
        ("char_monk_strip", "assets/characters/anim_monk.png", "image"),
        ("char_nun_portrait", "assets/characters/c_nun.png", "image"),
        ("char_nun_strip", "assets/characters/anim_nun.png", "image"),
        ("char_master_portrait", "assets/characters/c_master.png", "image"),
        ("char_master_strip", "assets/characters/anim_master.png", "image"),
        
        # Cat 4: Visual FX
        ("fx_halo_gold", "assets/fx/fx_halo.png", "image"),
        ("fx_floating_lotus", "assets/fx/fx_lotus.png", "image"),
        ("fx_gold_petal", "assets/fx/fx_petal.png", "image"),
        ("fx_gift_bell_flash", "assets/fx/fx_bell.png", "image"),
        
        # Cat 5: Audio SFX
        ("sfx_mo_01", "assets/audio/sfx/mo_strike_01.wav", "audio_wav"),
        ("sfx_mo_02", "assets/audio/sfx/mo_strike_02.wav", "audio_wav"),
        ("sfx_mo_03", "assets/audio/sfx/mo_strike_03.wav", "audio_wav"),
        ("sfx_bell_bowl", "assets/audio/sfx/bell_bowl.wav", "audio_wav"),
        ("sfx_bell_great_temple", "assets/audio/sfx/bell_temple.wav", "audio_wav"),
        ("sfx_gift_chime_tier1", "assets/audio/sfx/gift_tier1.wav", "audio_wav"),
        ("sfx_gift_chime_tier2", "assets/audio/sfx/gift_tier2.wav", "audio_wav"),
        
        # Cat 6: Audio BGM
        ("bgm_flute_peace", "assets/audio/bgm/music1.mp3", "audio_mp3"),
        ("bgm_zither_morning", "assets/audio/bgm/music2.mp3", "audio_mp3"),
    ]

    print(f"Total assets to check: {len(files)}")
    missing = []
    
    for asset_id, rel_path, kind in files:
        full_path = os.path.join(root, rel_path)
        if not os.path.exists(full_path):
            missing.append((asset_id, rel_path))
            print(f"[MISSING] {asset_id} at {rel_path}")
            continue
        
        size = os.path.getsize(full_path)
        if size == 0:
            print(f"[ZERO-BYTE] {asset_id} at {rel_path}")
            continue
            
        if kind == "image":
            try:
                with Image.open(full_path) as im:
                    fmt = im.format
                    mode = im.mode
                    w, h = im.size
                    has_alpha = ("A" in mode)
                    alpha_min, alpha_max = (None, None)
                    if has_alpha:
                        alpha_ch = im.split()[-1]
                        ext = alpha_ch.getextrema()
                        alpha_min, alpha_max = ext
                    print(f"[IMG] {asset_id:25} | {rel_path:35} | {size:8} B | {fmt:4} | {mode:5} | {w:4}x{h:<4} | Alpha: {has_alpha} ({alpha_min}..{alpha_max})")
            except Exception as e:
                print(f"[IMG ERROR] {asset_id} at {rel_path}: {e}")
                
        elif kind == "audio_wav":
            try:
                with wave.open(full_path, "rb") as wf:
                    nchannels = wf.getnchannels()
                    sampwidth = wf.getsampwidth()
                    framerate = wf.getframerate()
                    nframes = wf.getnframes()
                    dur = nframes / float(framerate)
                    bitdepth = sampwidth * 8
                    
                    # Read frames to check amplitude / peak / clipping
                    raw_frames = wf.readframes(nframes)
                    # For 24-bit PCM: 3 bytes per sample
                    if bitdepth == 24:
                        max_val = 0
                        total_sq = 0
                        sample_count = len(raw_frames) // 3
                        for i in range(sample_count):
                            b = raw_frames[i*3:(i+1)*3]
                            # 24-bit signed int
                            val = struct.unpack("<i", b + (b"\xff" if b[2] & 0x80 else b"\x00"))[0]
                            if abs(val) > max_val:
                                max_val = abs(val)
                            total_sq += (val / 8388607.0) ** 2
                        peak_ratio = max_val / 8388607.0
                        import math
                        peak_db = 20 * math.log10(peak_ratio) if peak_ratio > 0 else -999.0
                        rms = math.sqrt(total_sq / sample_count) if sample_count > 0 else 0
                        rms_db = 20 * math.log10(rms) if rms > 0 else -999.0
                        print(f"[WAV] {asset_id:25} | {rel_path:35} | {size:8} B | {dur:5.2f}s | {framerate}Hz | {bitdepth}bit | ch={nchannels} | peak={peak_db:6.2f}dB | rms={rms_db:6.2f}dB")
                    else:
                        print(f"[WAV NON-24BIT] {asset_id:25} | {rel_path:35} | {dur:5.2f}s | {framerate}Hz | {bitdepth}bit | ch={nchannels}")
            except Exception as e:
                print(f"[WAV ERROR] {asset_id} at {rel_path}: {e}")
                
        elif kind == "audio_mp3":
            try:
                with open(full_path, "rb") as f:
                    header = f.read(10)
                    has_id3 = header[:3] == b"ID3"
                print(f"[MP3] {asset_id:25} | {rel_path:35} | {size:8} B | ID3: {has_id3}")
            except Exception as e:
                print(f"[MP3 ERROR] {asset_id} at {rel_path}: {e}")

    print(f"\nMissing files count: {len(missing)} / {len(files)}")

if __name__ == "__main__":
    inspect()
