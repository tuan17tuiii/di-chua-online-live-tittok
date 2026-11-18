# Original User Request

## Approved Task Prompt — 2026-11-01T20:00:00Z

Build the functional codebase and working prototype for the TikTok interactive live virtual temple platform ("Chánh Điện Tịnh Tâm") according to existing specifications (ARCHITECTURE.md, WEBSOCKET_SPEC.md, ROADMAP.md, ASSET_MANIFEST.md, PROJECT.md).

Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live
Integrity mode: development

## Reference Material
- Specifications in workspace: ARCHITECTURE.md, WEBSOCKET_SPEC.md, ROADMAP.md, ASSET_MANIFEST.md, PROJECT.md
- Manifest and scripts: manifest.json, assets/asset-manifest.schema.json, scripts/verify_assets.mjs

## Requirements

### R1. Node.js Backend Server & State Manager
Build the Node.js backend server featuring:
- Event ingestion with Mock Event Simulator (and TikTokLiveConnector structure) allowing local end-to-end event generation and testing without requiring an active TikTok live stream.
- WebSocket broadcaster with role segregation (`role=overlay` for read-only OBS overlay clients, `role=control` for admin dashboard) and snapshot synchronization on connect.
- Content moderation layer: Vietnamese profanity blacklist filter, string sanitizer/SSML escaper, per-user rate limiting, and gift streak coalescer.
- Core seating state manager: 2.5D seating slots (24-100 seats, populated center-outward), longest-quiet non-donor eviction policy (evicting coin === 0 users when full), VIP slot protection for donors, and 90-second prayer cache.

### R2. Web-based OBS Browser Source Overlay
Build the web-based overlay (1080×1920 9:16 vertical CEF) featuring:
- Virtual temple scene ("Chánh Điện Tịnh Tâm"), altar, and 2.5D perspective seating floor rendered via HTML5 Canvas 2D, combined with a DOM text layer for high-clarity typography.
- Character states and animations (sitting, breathing idle, bowing/prostration on gifts and rituals).
- Realtime comment bubbles anchored above seated avatars, floating lotus/gift particle effects, and merit leaderboard display.

### R3. Web Admin Dashboard (`control` client)
Build the web admin control dashboard featuring:
- Seating matrix visualization showing seat occupancy with administrative actions (kick, pin VIP, lock).
- System control panel for adjusting parameters (mõ BPM metronome, thresholds) and manual triggers for temple bell, mõ, and ritual visual effects.
- Simulation studio capable of injecting simulated TikTok live events (comments, likes, gifts, bulk bots) to verify end-to-end functionality.

### R4. Audio & TTS Integration
Build the audio and TTS integration featuring:
- Temple bell and mõ sound effects with synthetic / Web Audio API oscillator fallbacks ensuring reliable playback under browser autoplay policies.
- Vietnamese TTS announcement pipeline for gift donors and prayers, with audio ducking (-14dB) during announcements.

## Acceptance Criteria

### Backend & WebSocket Protocol
- [ ] Node.js server starts cleanly and serves WebSocket endpoints respecting role authentication (`role=overlay` vs `role=control`).
- [ ] Initial state snapshot is sent immediately upon client connection within 50ms.
- [ ] Moderation filter sanitizes profanity, escapes SSML/HTML entities, and coalesces combo gifts.
- [ ] Seating manager allocates slots from center outward, evicts quiet non-donors when full, and preserves VIP donors.

### OBS Overlay Visual & Animation
- [ ] Overlay displays at 1080×1920 vertical format without visual distortion.
- [ ] Canvas 2D renders temple environment, altar, and seated avatars with correct 2.5D perspective scaling.
- [ ] Avatars transition between idle breathing, sitting, and bowing animations when events are received.
- [ ] Comment bubbles appear above corresponding seated avatars upon comment events.

### Admin Dashboard & Simulation
- [ ] Admin dashboard connects to the server and displays live seating status in real time.
- [ ] Admin controls can trigger bell/mõ sounds and fire simulated comments, likes, and gifts that immediately appear on the overlay.
- [ ] Administrative seating actions (kick, VIP pin) update server state and broadcast updates to connected clients.

### Audio & Sound Fallback
- [ ] Bell and mõ sound triggers produce audible playback in the overlay client using Web Audio API synthesis when audio files are not present.
- [ ] Background audio ducks appropriately when donor announcement / bell audio is active.


## Approved Task Prompt — 2026-11-02T03:31:43Z

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
