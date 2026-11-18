# SURVEY FILESYSTEM REPORT: ASSET STATE & VALIDATION HARNESS AUDIT
**Agent**: Survey Explorer 1 (`teamwork_explorer_survey_1`)  
**Date**: 2026-11-02  
**Target Repository**: `c:\Users\tn018\Desktop\Person\media\tiktok\app-live`  
**Milestone**: Milestone 3 — Asset Acquisition & Manifest Verification

---

## 1. Executive Summary

An exhaustive survey of the asset filesystem (`assets/`) and the validation harness (`scripts/verify_assets.mjs`) was conducted in accordance with `ORIGINAL_REQUEST.md`, `manifest.json`, `ASSET_MANIFEST.md`, and `assets/asset-manifest.schema.json`.

**Key Findings:**
1. **Physical Asset Status**: Exactly **0 out of 36 required physical asset files** exist on disk. The `assets/` directory contains only `asset-manifest.schema.json` (8,049 bytes). No asset subdirectories (`backgrounds/`, `altar/`, `characters/`, `fx/`, `audio/`, `audio/sfx/`, `audio/bgm/`) currently exist.
2. **Harness Execution Baseline**: `node scripts/verify_assets.mjs` executes cleanly (exit code 0) but flags `Physical files missing on disk count: 29 / 29`.
3. **Harness Scope Discrepancy Identified**: `scripts/verify_assets.mjs` (line 81: `const filePath = item.path || item.staticPath;`) tests exactly one file path per manifest entry. For the 7 character definitions, it checks `staticPath` (`c_*.png`) but ignores `spritesheetPath` (`anim_*.png`). Therefore, while the harness reports 29 missing entries, the actual missing physical file count is **36 files** (29 manifest entries + 7 spritesheet files).
4. **Harness Verification Level**: `verify_assets.mjs` verifies physical file existence via `fs.existsSync(fullPath)` and inspects JSON property schema declarations, fallback chains, character dimensions, and markdown synchronization. It does **not** decode binary headers (e.g., PNG IHDR chunks, JPEG SOF0 chunks, WAV RIFF headers, or MP3 frame headers) nor test for alpha transparency channels.
5. **Runtime Fallback State**: The frontend (`CanvasFloorEngine.js`, `CharacterRenderer.js`, `WebAudioEngine.js`) currently relies on synthetic vector fallbacks and Web Audio oscillator synthesis, which pass all automated mock tests (23/23 in `test_overlay_m2.mjs` and 28/28 in `unit_backend.test.mjs`), confirming that the codebase operates gracefully under missing-asset conditions.

---

## 2. In-Depth Analysis of `scripts/verify_assets.mjs`

### 2.1. Architecture and Dependencies
- **Runtime Environment**: Node.js ES Module (`"type": "module"`).
- **External Dependencies**: Zero third-party dependencies; uses exclusively Node.js standard built-ins (`import fs from 'fs'`, `import path from 'path'`).
- **Target Files**:
  - `manifest.json` (root directory)
  - `assets/asset-manifest.schema.json`
  - `ASSET_MANIFEST.md`
  - Files referenced by `item.path` or `item.staticPath`.

### 2.2. Validation Checks Performed
The harness executes 9 sequential checks:

| Step / Check | Target Scope | Validation Logic & Methods | Pass/Fail Criteria |
|---|---|---|---|
| **Step 1: Manifest Parsing** | `manifest.json` | `fs.readFileSync(manifestFile, 'utf8')` + `JSON.parse(raw)` | Fails process if invalid JSON. |
| **Check 1: Schema Reference** | `$schema` | `path.resolve(rootDir, manifest['$schema'])` + `fs.existsSync()` | Confirms schema file exists on disk (`asset-manifest.schema.json`). |
| **Check 2: Default Config** | `defaultConfig` | Checks `resolution.width === 1080`, `height === 1920`, `aspectRatio === "9:16"`, audio defaults | Requires exact 1080x1920 9:16 resolution and audio block. |
| **Check 3: Asset Entries & Filesystem** | All categories | Iterates `['backgrounds', 'altar', 'characters', 'visual_fx', 'audio_sfx', 'audio_bgm']`: checks `id` uniqueness, `category`, `license`, category-specific specs, and `fs.existsSync(fullPath)` | Flags missing properties, duplicate IDs, and missing physical files on disk. |
| **Check 4: Fallback Paths** | `fallbackId`, `fallbackSynthetic` | Graph analysis of fallback pointers: detects self-referential cycles (`fallbackId === id`), dangling IDs, valid cross-fallbacks, and unhandled assets | Alerts on cycles, dangling IDs, or missing fallbacks. |
| **Check 5: Character Spritesheet** | `characters` | Calculates total strip width `c.frameWidth * c.frameCount`; checks `bowingFrames` array bounds `[0, frameCount - 1]` | Flags out-of-bounds frame indices. |
| **Check 6: MD vs JSON Sync** | `ASSET_MANIFEST.md` | Parses Markdown tables via regex `/\|\s*`(\w+)`\s*\|[^|]+\|[^|]+\|[^|]+\|\s*(\d+)\s*[×x]\s*(\d+)\s*px\s*\|\s*(\d+)\s*px/g`; compares dimensions with `manifest.json` | Flags dimension or seated height discrepancies. |
| **Check 7: Audio Specifications** | `audio_sfx`, `audio_bgm` | Validates format, duration, volume, sampleRate, bitDepth, bitrate | Ensures audio parameters align with broadcast specs. |
| **Check 8: User Guide Stress Test** | JSON parsing quirks | Evaluates failure modes: UTF-8 BOM, smart quotes (`“”`), trailing commas, missing commas | Documents vulnerabilities in manual editing. |
| **Check 9: OBS / CEF Performance** | Theoretical GPU/CPU | Calculates framebuffer size (7.91 MB), compositing bandwidth (474.61 MB/s @ 60fps), texture footprint (~13.5 MB), and draw call budget | Evaluates 60fps CEF rendering feasibility. |

### 2.3. Category-Specific Validation Matrix in Harness

| Category | Dimension Checks in Harness | Format Checks | Alpha Channel Checks | Frame Count Checks | Audio Checks |
|---|---|---|---|---|---|
| **`backgrounds`** | `item.width`, `item.height` verified from JSON | `item.format` verified from JSON (`jpg`, `webp`, `png`) | None (not inspected) | N/A | N/A |
| **`altar`** | `item.width`, `item.height` verified from JSON | `item.format` verified from JSON (`png`, `webp`) | None (not inspected) | N/A | N/A |
| **`characters`** | `frameWidth`, `frameHeight`, `seatedHeight` verified from JSON + cross-checked with Markdown | `item.format` verified from JSON (`png`, `webp`) | None (not inspected) | `frameCount` (8), `fps` (8), `bowingFrames` bounds verified | N/A |
| **`visual_fx`** | `item.width`, `item.height` verified from JSON | `item.format` verified from JSON (`png`, `webp`) | None (not inspected) | N/A | N/A |
| **`audio_sfx`** | N/A | `format` verified from JSON (`wav`, `mp3`) | N/A | N/A | `sampleRate` (48000), `bitDepth` (24), `durationSec`, `volume` |
| **`audio_bgm`** | N/A | `format` verified from JSON (`mp3`, `wav`, `ogg`) | N/A | N/A | `bitrate` (320), `durationSec`, `volume`, `loop` |

### 2.4. Technical Gaps & Limitations of Current Harness
1. **Omission of Spritesheet File Verification in Check 3**:
   Line 81 only inspects `const filePath = item.path || item.staticPath;`. For character items, this validates `/assets/characters/c_*.png`, but skips `/assets/characters/anim_*.png`. An update to `verify_assets.mjs` or an auxiliary check must verify `spritesheetPath` as well.
2. **Absence of Binary File Introspection**:
   The harness checks `fs.existsSync()` but does not inspect file magic bytes, image dimensions (IHDR/SOF0), alpha channels (color type 6 in PNG), or audio headers (RIFF chunk, sample rate, bit depth). If a zero-byte or corrupt file is placed at the path, `fs.existsSync()` returns `true`.
3. **No Alpha Channel Transparency Validation**:
   The harness does not test whether PNG assets (altar, characters, FX) contain true transparent pixels vs opaque white/black backgrounds.

---

## 3. Filesystem Audit of `c:\Users\tn018\Desktop\Person\media\tiktok\app-live\assets\`

### 3.1. Directory Structure on Disk
Inspection of `assets/` via `list_dir` and `find_by_name`:
```
c:\Users\tn018\Desktop\Person\media\tiktok\app-live\assets\
└── asset-manifest.schema.json (8,049 bytes)
```
- Total existing subdirectories: **0**
- Total existing asset files: **0**

### 3.2. Subdirectories Required vs Present

| Directory Path | Purpose | Required Files | Present on Disk? |
|---|---|:---:|:---:|
| `assets/backgrounds/` | Main temple hall & night zen garden backgrounds | 2 | ❌ Missing |
| `assets/altar/` | Altar table, Buddha statues, censer, candles, cushion | 7 | ❌ Missing |
| `assets/characters/` | 7 character static portraits + 7 8-frame spritesheets | 14 | ❌ Missing |
| `assets/fx/` | Divine halo, floating lotus, golden petals, gift flash | 4 | ❌ Missing |
| `assets/audio/sfx/` | Mõ strikes, singing bowl, temple bell, gift chimes | 7 | ❌ Missing |
| `assets/audio/bgm/` | Ambient meditation flute & zither BGM tracks | 2 | ❌ Missing |
| **Total** | | **36** | **0% Present** |

---

## 4. Empirical Baseline Execution Output

Execution of `node scripts/verify_assets.mjs` produced the following baseline metrics:

```
================================================================
EMPIRICAL ASSET & MANIFEST VALIDATION HARNESS
Root Directory: C:\Users\tn018\Desktop\Person\media\tiktok\app-live
Target Manifest: C:\Users\tn018\Desktop\Person\media\tiktok\app-live\manifest.json
================================================================

[PASS] manifest.json exists and parsed successfully as valid JSON.

--- CHECK 1: Schema File Reference ---
Schema path declared: ./assets/asset-manifest.schema.json
Resolved path: C:\Users\tn018\Desktop\Person\media\tiktok\app-live\assets\asset-manifest.schema.json
File exists on disk: [PASS]

--- CHECK 2: Default Configuration Block ---
Resolution: {"width":1080,"height":1920,"aspectRatio":"9:16"}
Audio defaults: {"sampleRate":48000,"channels":2,"bgmVolume":0.55,"sfxVolume":0.85,"bellVolume":0.95}
1080x1920 9:16 check: [PASS]

--- CHECK 3: Asset Entries Validation against Dispatch Requirements ---
Declared asset categories: backgrounds, altar, characters, visual_fx, audio_sfx, audio_bgm
Total assets cataloged: 29
Missing 'category' property count: 0 / 29
Missing 'path' property count: 0
Missing 'license' property count: 0
Missing 'specifications' count: 0
Physical files missing on disk count: 29 / 29

--- CHECK 4: Fallback Paths & Self-Referential Traps ---
Fallback Summary:
  - Self-Referential (Recursive Trap): 0
  - Valid Cross-Fallback: 10
  - Dead Fallback ID: 0
  - Synthetic Fallback: 19
  - Total with NO Fallback: 0

--- CHECK 5: Spritesheet & Bowing Frame Analysis ---
All 7 characters have valid 8-frame bounds [0..7].

--- CHECK 6: ASSET_MANIFEST.md vs manifest.json Harmonization Check ---
Result: 100% harmonized between manifest.json and ASSET_MANIFEST.md specifications.

--- CHECK 7: Audio Loudness & Format Specifications ---
All 9 audio assets (7 SFX + 2 BGM) have valid spec blocks.

--- CHECK 8: Empirical Stress Test of 4-Step User Integration Guide ---
Confirmed JSON vulnerability behaviors (BOM, smart quotes, trailing commas).

--- CHECK 9: OBS Studio & CEF Empirical Calculations ---
Single RGBA Framebuffer: 7.91 MB | 60fps Compositing: 474.61 MB/s | Total Spritesheet GPU footprint: ~13.5 MB.
```

---

## 5. Complete Manifest Inventory & Physical Asset Gap Table

The following master table lists all 29 cataloged assets and the **36 concrete physical files** required to fulfill `ORIGINAL_REQUEST.md` and `manifest.json`:

| # | Asset ID | Category | Relative Path | Target Format | Target Dimensions / Audio Spec | Alpha Channel Required? | Current Disk Status |
|---|---|---|---|---|---|:---:|:---:|
| 1 | `bg_main_hall` | backgrounds | `assets/backgrounds/hall.jpg` | JPG | 1080 × 1920 px | No | ❌ Missing |
| 2 | `bg_zen_garden` | backgrounds | `assets/backgrounds/zen_garden.jpg` | JPG | 1080 × 1920 px | No | ❌ Missing |
| 3 | `altar_table_main` | altar | `assets/altar/altar_table.png` | PNG | 1080 × 850 px | **Yes** | ❌ Missing |
| 4 | `statue_shakyamuni`| altar | `assets/altar/statue_shakyamuni.png` | PNG | 600 × 800 px | **Yes** | ❌ Missing |
| 5 | `statue_amitabha` | altar | `assets/altar/statue_amitabha.png` | PNG | 600 × 800 px | **Yes** | ❌ Missing |
| 6 | `statue_avalokiteshvara` | altar | `assets/altar/statue_avalokiteshvara.png` | PNG | 550 × 820 px | **Yes** | ❌ Missing |
| 7 | `altar_censer_bronze` | altar | `assets/altar/censer_bronze.png` | PNG | 280 × 240 px | **Yes** | ❌ Missing |
| 8 | `altar_candle_stand` | altar | `assets/altar/candle_stand.png` | PNG | 150 × 350 px | **Yes** | ❌ Missing |
| 9 | `cushion_lotus_mat` | altar | `assets/altar/meditation_cushion.png` | PNG | 160 × 90 px | **Yes** | ❌ Missing |
| 10a| `char_man` (static) | characters | `assets/characters/c_man.png` | PNG | 212 × 300 px | **Yes** | ❌ Missing |
| 10b| `char_man` (anim) | characters | `assets/characters/anim_man.png` | PNG | 1696 × 300 px (8×212) | **Yes** | ❌ Missing |
| 11a| `char_woman` (static)| characters | `assets/characters/c_woman.png` | PNG | 212 × 300 px | **Yes** | ❌ Missing |
| 11b| `char_woman` (anim) | characters | `assets/characters/anim_woman.png` | PNG | 1696 × 300 px (8×212) | **Yes** | ❌ Missing |
| 12a| `char_granny` (static)| characters | `assets/characters/c_granny.png` | PNG | 195 × 300 px | **Yes** | ❌ Missing |
| 12b| `char_granny` (anim) | characters | `assets/characters/anim_granny.png` | PNG | 1560 × 300 px (8×195) | **Yes** | ❌ Missing |
| 13a| `char_child` (static) | characters | `assets/characters/c_child.png` | PNG | 180 × 260 px | **Yes** | ❌ Missing |
| 13b| `char_child` (anim) | characters | `assets/characters/anim_child.png` | PNG | 1440 × 260 px (8×180) | **Yes** | ❌ Missing |
| 14a| `char_monk` (static) | characters | `assets/characters/c_monk.png` | PNG | 212 × 300 px | **Yes** | ❌ Missing |
| 14b| `char_monk` (anim) | characters | `assets/characters/anim_monk.png` | PNG | 1696 × 300 px (8×212) | **Yes** | ❌ Missing |
| 15a| `char_nun` (static) | characters | `assets/characters/c_nun.png` | PNG | 212 × 300 px | **Yes** | ❌ Missing |
| 15b| `char_nun` (anim) | characters | `assets/characters/anim_nun.png` | PNG | 1696 × 300 px (8×212) | **Yes** | ❌ Missing |
| 16a| `char_master` (static)| characters | `assets/characters/c_master.png` | PNG | 230 × 320 px | **Yes** | ❌ Missing |
| 16b| `char_master` (anim) | characters | `assets/characters/anim_master.png` | PNG | 1840 × 320 px (8×230) | **Yes** | ❌ Missing |
| 17 | `fx_halo_gold` | visual_fx | `assets/fx/fx_halo.png` | PNG | 512 × 512 px | **Yes** | ❌ Missing |
| 18 | `fx_floating_lotus` | visual_fx | `assets/fx/fx_lotus.png` | PNG | 128 × 128 px | **Yes** | ❌ Missing |
| 19 | `fx_gold_petal` | visual_fx | `assets/fx/fx_petal.png` | PNG | 64 × 64 px | **Yes** | ❌ Missing |
| 20 | `fx_gift_bell_flash`| visual_fx | `assets/fx/fx_bell.png` | PNG | 256 × 256 px | **Yes** | ❌ Missing |
| 21 | `sfx_mo_01` | audio_sfx | `assets/audio/sfx/mo_strike_01.wav` | WAV | 48kHz / 24-bit PCM / 0.35s | N/A | ❌ Missing |
| 22 | `sfx_mo_02` | audio_sfx | `assets/audio/sfx/mo_strike_02.wav` | WAV | 48kHz / 24-bit PCM / 0.35s | N/A | ❌ Missing |
| 23 | `sfx_mo_03` | audio_sfx | `assets/audio/sfx/mo_strike_03.wav` | WAV | 48kHz / 24-bit PCM / 0.35s | N/A | ❌ Missing |
| 24 | `sfx_bell_bowl` | audio_sfx | `assets/audio/sfx/bell_bowl.wav` | WAV | 48kHz / 24-bit PCM / 4.50s | N/A | ❌ Missing |
| 25 | `sfx_bell_great_temple`| audio_sfx | `assets/audio/sfx/bell_temple.wav` | WAV | 48kHz / 24-bit PCM / 11.20s | N/A | ❌ Missing |
| 26 | `sfx_gift_chime_tier1`| audio_sfx | `assets/audio/sfx/gift_tier1.wav` | WAV | 48kHz / 24-bit PCM / 1.80s | N/A | ❌ Missing |
| 27 | `sfx_gift_chime_tier2`| audio_sfx | `assets/audio/sfx/gift_tier2.wav` | WAV | 48kHz / 24-bit PCM / 2.60s | N/A | ❌ Missing |
| 28 | `bgm_flute_peace` | audio_bgm | `assets/audio/bgm/music1.mp3` | MP3 | 320 kbps / 48kHz / 320s | N/A | ❌ Missing |
| 29 | `bgm_zither_morning` | audio_bgm | `assets/audio/bgm/music2.mp3` | MP3 | 320 kbps / 48kHz / 375s | N/A | ❌ Missing |

---

## 6. Synthesis and Recommendations for Acquisition Plan

To achieve the Acceptance Criteria of Milestone 3 (`node scripts/verify_assets.mjs` reports 0 missing files and passes all format/dimension/transparency constraints):

1. **Subdirectory Creation**:
   7 directories must be initialized:
   - `assets/backgrounds`
   - `assets/altar`
   - `assets/characters`
   - `assets/fx`
   - `assets/audio/sfx`
   - `assets/audio/bgm`
2. **Spritesheet Verification Expansion**:
   `scripts/verify_assets.mjs` line 81 should be enhanced to check both `item.path || item.staticPath` AND `item.spritesheetPath` so that neither character portraits nor character animation strips can be omitted unnoticed.
3. **Alpha Channel & Dimension Rigor**:
   All 18 PNG assets (altar layers, statues, cushions, characters, FX) must possess clean 8-bit alpha channels to prevent bounding-box artifacts on the OBS 2.5D Canvas.
4. **Audio Format Normalization**:
   All 7 SFX must be formatted as 48,000 Hz, 24-bit uncompressed PCM WAV. Both BGM tracks must be MP3 stereo at 320 kbps with seamless loop markers.
