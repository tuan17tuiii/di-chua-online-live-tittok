import os

for fname in ["music1.mp3", "music2.mp3"]:
    fpath = os.path.join("assets/audio/bgm", fname)
    size = os.path.getsize(fpath)
    with open(fpath, "rb") as f:
        data = f.read(16384)
    
    # ID3v2 header
    if data[:3] == b"ID3":
        ver_maj = data[3]
        ver_min = data[4]
        flags = data[5]
        # ID3 synchsafe integer for size
        id3_size = ((data[6] & 0x7F) << 21) | ((data[7] & 0x7F) << 14) | ((data[8] & 0x7F) << 7) | (data[9] & 0x7F)
        total_id3 = 10 + id3_size
        print(f"{fname}: ID3v2.{ver_maj}.{ver_min}, id3_size={id3_size}, total_id3_header_len={total_id3}, file_size={size}")
        
        # Check first MPEG sync after ID3 header
        sync_offset = -1
        with open(fpath, "rb") as f:
            f.seek(total_id3)
            after_id3 = f.read(4096)
            for i in range(len(after_id3) - 1):
                if after_id3[i] == 0xFF and (after_id3[i+1] & 0xE0) == 0xE0:
                    sync_offset = total_id3 + i
                    b1 = after_id3[i+1]
                    b2 = after_id3[i+2]
                    b3 = after_id3[i+3]
                    
                    # MPEG version
                    mpeg_ver = (b1 >> 3) & 0x03
                    layer = (b1 >> 1) & 0x03
                    bitrate_idx = (b2 >> 4) & 0x0F
                    samplerate_idx = (b2 >> 2) & 0x03
                    channel_mode = (b3 >> 6) & 0x03
                    
                    ver_map = {0: "MPEG 2.5", 2: "MPEG 2", 3: "MPEG 1"}
                    layer_map = {1: "Layer III", 2: "Layer II", 3: "Layer I"}
                    # Bitrate table for MPEG 1 Layer III
                    bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, -1]
                    srates = [44100, 48000, 32000, 0]
                    mode_map = {0: "Stereo", 1: "Joint Stereo", 2: "Dual Channel", 3: "Single Channel (Mono)"}
                    
                    br = bitrates[bitrate_idx] if bitrate_idx < len(bitrates) else "?"
                    sr = srates[samplerate_idx] if samplerate_idx < len(srates) else "?"
                    ch = mode_map.get(channel_mode, "?")
                    print(f"  First audio frame at offset {sync_offset}: {ver_map.get(mpeg_ver, '?')} {layer_map.get(layer, '?')}, bitrate={br}kbps, samplerate={sr}Hz, mode={ch}")
                    break
        if sync_offset == -1:
            print(f"  [WARNING] No MPEG sync found after ID3 header for {fname}!")
    else:
        print(f"{fname}: No ID3v2 header")
