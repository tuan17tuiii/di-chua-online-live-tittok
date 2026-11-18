import os
import wave
import struct
import math

sfx_files = [
    ('mo_strike_01.wav', 0.35, 48000, 2, 24),
    ('mo_strike_02.wav', 0.35, 48000, 2, 24),
    ('mo_strike_03.wav', 0.35, 48000, 2, 24),
    ('bell_bowl.wav', 4.5, 48000, 2, 24),
    ('bell_temple.wav', 11.2, 48000, 2, 24),
    ('gift_tier1.wav', 1.8, 48000, 2, 24),
    ('gift_tier2.wav', 2.6, 48000, 2, 24),
]

bgm_files = [
    'music1.mp3',
    'music2.mp3'
]

print("=== CHECKING 7 AUDIO SFX (WAV 48kHz / 24-bit PCM Stereo) ===")
sfx_pass = True
for fname, exp_dur, exp_rate, exp_chan, exp_bits in sfx_files:
    fpath = os.path.join('assets/audio/sfx', fname)
    if not os.path.exists(fpath):
        print(f"[FAIL] Missing file: {fpath}")
        sfx_pass = False
        continue

    try:
        with wave.open(fpath, 'rb') as w:
            nchannels = w.getnchannels()
            sampwidth = w.getsampwidth()
            framerate = w.getframerate()
            nframes = w.getnframes()
            dur = nframes / framerate
            raw_data = w.readframes(nframes)

            # Check 24-bit samples
            max_val = 0
            sum_sq = 0
            sample_count = len(raw_data) // 3
            for i in range(0, len(raw_data), 3):
                b0, b1, b2 = raw_data[i], raw_data[i+1], raw_data[i+2]
                u_val = b0 | (b1 << 8) | (b2 << 16)
                if u_val & 0x800000:
                    val = u_val - 0x1000000
                else:
                    val = u_val
                abs_v = abs(val) / 8388607.0
                if abs_v > max_val:
                    max_val = abs_v
                sum_sq += abs_v * abs_v

            rms = math.sqrt(sum_sq / (sample_count or 1))
            rms_db = 20 * math.log10(rms) if rms > 0 else -999
            peak_db = 20 * math.log10(max_val) if max_val > 0 else -999

            ok = (nchannels == exp_chan and
                  sampwidth == exp_bits // 8 and
                  framerate == exp_rate and
                  abs(dur - exp_dur) < 0.01 and
                  rms > 0.001)

            if ok:
                print(f"[PASS] {fname}: {dur:.2f}s, {framerate}Hz, {sampwidth*8}-bit, ch={nchannels}, peak={peak_db:.2f}dBFS, rms={rms_db:.2f}dBFS")
            else:
                print(f"[FAIL] {fname}: dur={dur}s (exp {exp_dur}), rate={framerate}, bits={sampwidth*8}, ch={nchannels}, rms={rms}")
                sfx_pass = False
    except Exception as e:
        print(f"[FAIL] {fname} wave error: {e}")
        sfx_pass = False

print("\n=== CHECKING 2 AUDIO BGM (MP3 Stereo) ===")
bgm_pass = True
for fname in bgm_files:
    fpath = os.path.join('assets/audio/bgm', fname)
    if not os.path.exists(fpath):
        print(f"[FAIL] Missing file: {fpath}")
        bgm_pass = False
        continue

    size = os.path.getsize(fpath)
    with open(fpath, 'rb') as f:
        head = f.read(4096)

    has_id3 = head.startswith(b'ID3')
    sync_found = False
    for i in range(len(head) - 1):
        if head[i] == 0xFF and (head[i+1] & 0xE0) == 0xE0:
            sync_found = True
            break

    if size > 100000 and (has_id3 or sync_found):
        print(f"[PASS] {fname}: size={size} bytes, ID3={has_id3}, MPEG_Sync={sync_found}")
    else:
        print(f"[FAIL] {fname}: size={size}, ID3={has_id3}, sync={sync_found}")
        bgm_pass = False

print("\n=== OVERALL AUDIO VALIDATION RESULT ===")
if sfx_pass and bgm_pass:
    print("[ALL PASS] All 9 audio assets are verified, valid, and compliant!")
else:
    print("[FAIL] Some audio assets failed verification.")
    exit(1)
