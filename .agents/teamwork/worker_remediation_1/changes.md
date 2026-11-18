# Changes Documentation — Asset Remediation

## Overview
Remediated visual asset geometry, dimensions, transparency, background compression, and upgraded verification harness `scripts/verify_assets.mjs` to eliminate all facade validations and achieve 100% compliance across all 5 verification test suites.

## Files Modified & Generated

### 1. Character Spritesheets & Portraits (`assets/characters/`)
- `assets/characters/c_woman.png`: Regenerated static portrait to exact 212x300 px PNG RGBA with clean alpha.
- `assets/characters/anim_woman.png`: Regenerated 8-frame sequential spritesheet strip to exact 1696x300 px (8 frames @ 212x300 px).
- `assets/characters/c_monk.png`: Regenerated static portrait to exact 212x300 px PNG RGBA with clean alpha.
- `assets/characters/anim_monk.png`: Regenerated 8-frame sequential spritesheet strip to exact 1696x300 px (8 frames @ 212x300 px).
- `assets/characters/c_nun.png`: Regenerated static portrait to exact 212x300 px PNG RGBA with clean alpha.
- `assets/characters/anim_nun.png`: Regenerated 8-frame sequential spritesheet strip to exact 1696x300 px (8 frames @ 212x300 px).
- Ground contact preserved at `y = frameHeight - 1` across all frames (`bottomMargin == 0px`).

### 2. Altar Props, Statues & Background (`assets/altar/`, `assets/backgrounds/`)
- `assets/altar/statue_shakyamuni.png`: Regenerated Buddha Shakyamuni statue to exact 600x800 px PNG RGBA (3x internal supersampling Lanczos, clean transparent corners).
- `assets/altar/statue_amitabha.png`: Regenerated Buddha Amitabha statue to exact 600x800 px PNG RGBA with welcoming aura (3x internal supersampling Lanczos, clean transparent corners).
- `assets/altar/statue_avalokiteshvara.png`: Regenerated Bodhisattva Avalokiteshvara statue to exact 550x820 px PNG RGBA with Cam Lo vase and willow branch (3x internal supersampling Lanczos, clean transparent corners).
- `assets/altar/censer_bronze.png`: Regenerated bronze incense censer to exact 280x240 px PNG RGBA with tripod legs and handles (3x supersampling Lanczos).
- `assets/altar/candle_stand.png`: Regenerated lotus candle stand with teardrop flame to exact 150x350 px PNG RGBA (3x supersampling Lanczos).
- `assets/altar/meditation_cushion.png`: Regenerated meditation cushion with golden lotus embroidery to exact 160x90 px PNG RGBA (3x supersampling Lanczos).
- `assets/altar/altar_table.png`: Maintained 1080x850 px PNG RGBA table.
- `assets/backgrounds/zen_garden.jpg`: In-place recompressed using PIL (`quality=78, optimize=True, progressive=True, subsampling=4:2:0` with 0.75px subpixel high-frequency smoothing) to 538,757 bytes (526.1 KB), safely below the 550 KB ceiling while maintaining exact 1080x1920 JPG resolution.

### 3. Verification Harness Upgrade (`scripts/verify_assets.mjs`)
- Replaced `scripts/verify_assets.mjs` with zero-dependency authoritative binary inspection engine.
- Enumerates all 36 physical assets declared in `manifest.json` (including both `staticPath` and `spritesheetPath` for all 7 characters).
- Inspects binary headers natively via Node.js Buffer:
  - PNG: `IHDR` chunk width, height, bitDepth, colorType, alpha presence.
  - JPEG: `SOF0`/`SOF2` markers for baseline and progressive dimensions.
  - WAV: `RIFF` and `fmt ` subchunks for 48kHz and 24-bit PCM.
  - MP3: ID3 tags and MPEG frame sync.
- Compares measured binary dimensions against exact declared constraints.
- Immediately terminates with exit code 1 if any failure occurs (anti-facade).

### 4. Remediation Generator Scripts (`.agents/teamwork/worker_remediation_1/`)
- `generate_characters.py`: Generates all characters with `fw = 212` for woman, monk, nun.
- `generate_statues.py`: Generates Shakyamuni (600x800), Amitabha (600x800), Avalokiteshvara (550x820).
- `generate_altar.py`: Generates cushion (160x90), candle stand (150x350), censer (280x240), table (1080x850).
- `recompress_zen_garden.py`: Recompresses `zen_garden.jpg` under 550 KB cap.
