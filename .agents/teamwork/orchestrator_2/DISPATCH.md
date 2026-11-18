## 2026-11-02T03:32:39Z

Research and populate the complete set of visual and audio assets for the TikTok interactive live virtual temple platform ("Chánh Điện Tịnh Tâm") in accordance with project specifications and manifest definitions.

Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live
Integrity mode: development

## Reference Material
- Specifications: ASSET_MANIFEST.md, manifest.json
- Validation harness: scripts/verify_assets.mjs

## Requirements

### R1. Visual Assets Acquisition and Processing
Research, acquire, and format all required 2D visual assets from open-source, royalty-free, or public domain sources (CC0, CC-BY, Public Domain), ensuring visual harmony with the solemn Vietnamese Buddhist temple aesthetic ("Chánh Điện Tịnh Tâm Cổ Tự"):
- Background scenes (`/assets/backgrounds/`): `bg_main_hall` (1080×1920) and `bg_zen_garden` (1080×1920).
- Altar layers and props (`/assets/altar/`): `altar_table_main` (1080×850 PNG with alpha), Buddha/Bodhisattva statues (`statue_shakyamuni`, `statue_amitabha`, `statue_avalokiteshvara`), bronze censer (`altar_censer_bronze`), lotus candle stands (`altar_candle_stand`), and meditation cushion (`cushion_lotus_mat`).
- Character avatars and spritesheets (`/assets/characters/`): Static portraits (`c_*.png`) and 8-frame sequential action spritesheet strips (`anim_*.png`) for all 7 character types (`char_man`, `char_woman`, `char_granny`, `char_child`, `char_monk`, `char_nun`, `char_master`) adhering to individual frame dimensions, frame counts, and seated height metrics in `manifest.json`.
- Visual effects (`/assets/fx/`): Golden halo (`fx_halo_gold`, 512×512), floating lotus (`fx_floating_lotus`, 128×128), golden lotus petal (`fx_gold_petal`, 64×64), and gift bell flash (`fx_gift_bell_flash`, 256×256) with alpha transparency.

### R2. Audio Assets Acquisition and Normalization
Research and source royalty-free or public domain sound effects and meditation music:
- Audio SFX (`/assets/audio/sfx/`): Wooden fish strikes (`mo_strike_01.wav`, `mo_strike_02.wav`, `mo_strike_03.wav`), singing bowl (`bell_bowl.wav`), temple great bell (`bell_temple.wav`), and gift blessing chimes (`gift_tier1.wav`, `gift_tier2.wav`) in WAV format.
- Audio BGM (`/assets/audio/bgm/`): Seamless meditation ambient music tracks (`music1.mp3`, `music2.mp3`) in MP3 format.

### R3. File Placement and Manifest Integrity
Place all populated assets into their exact paths declared in `manifest.json`. Ensure every asset file is readable, meets specified dimension and format requirements, and maintains transparent alpha channels where PNG is specified.

## Acceptance Criteria

### Automated Validation Harness
- [ ] `node scripts/verify_assets.mjs` executes and reports 0 missing physical files on disk across all declared asset categories (backgrounds, altar, characters, visual_fx, audio_sfx, audio_bgm).
- [ ] All image files match the exact dimensions, formats (JPG/PNG), and transparency constraints defined in `manifest.json` and `ASSET_MANIFEST.md`.
- [ ] All character spritesheet strips (`anim_*.png`) contain exactly 8 frames horizontally with frame dimensions matching `manifest.json`.
- [ ] All audio files exist at declared paths in valid WAV/MP3 formats.

### Visual and Thematic Quality
- [ ] Visual assets exhibit a cohesive, solemn Vietnamese Buddhist temple aesthetic without visual artifacts or distortion.
- [ ] Transparent assets (altar layers, statues, cushions, FX, character sprites) have clean alpha transparency cutouts without opaque background clipping.
