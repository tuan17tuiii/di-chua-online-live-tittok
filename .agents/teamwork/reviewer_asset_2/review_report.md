# INDEPENDENT INTEGRATION, REGRESSION & ADVERSARIAL REVIEW REPORT

**Reviewer**: Reviewer 2 (`reviewer_asset_2`)  
**Parent Orchestrator**: `orchestrator_2` (`4657945e-312a-4b1d-8783-863a86deb269`)  
**Date**: 2026-11-02T04:41:00Z  
**Target Milestone**: Visual and Audio Physical Assets Integration  
**Workspace**: `c:\Users\tn018\Desktop\Person\media\tiktok\app-live`  

---

## 1. Executive Summary

**Verdict: REQUEST_CHANGES**

An exhaustive, independent verification was conducted across all 36 physical asset files, manifest configurations, backend test suites (`npm test`), overlay test harnesses (`node scripts/test_overlay_m2.mjs`, `node scripts/test_overlay_app_events.mjs`), and the manifest validation harness (`node scripts/verify_assets.mjs`).

While the backend tests pass 100% (28/28 tests), overlay tests pass 100% (23/23 tests), and all 7 audio SFX WAV files conform strictly to the 48000 Hz / 24-bit PCM Stereo standard, a **Critical Finding** was identified in the visual character spritesheets:
- Three character spritesheet strips (`anim_woman.png`, `anim_monk.png`, `anim_nun.png`) and their corresponding static portraits (`c_woman.png`, `c_monk.png`, `c_nun.png`) were generated with non-conforming frame dimensions (200px, 215px, and 205px wide respectively) instead of the 212px width mandated by `manifest.json`, `ASSET_MANIFEST.md`, and the client rendering engine `public/js/CharacterRenderer.js`.
- In Canvas 2D rendering, `CharacterRenderer.js` slices frames using `sx = frameIndex * 212`. Because `anim_woman.png` is only 1600px wide (8 * 200px), Frame 7 attempts to sample from `x = 1484px` to `x = 1696px`, which exceeds the image boundary (1600px) and slices across mismatched frame offsets. This causes severe visual tearing and distortion in the OBS live stream.
- Additionally, `scripts/verify_assets.mjs` was found to have a significant validation blindspot: it reported 100% PASS because it only validates file presence (`fs.existsSync`) and matches JSON fields against Markdown table text without ever inspecting physical pixel dimensions or image headers of files on disk.

---

## 2. Findings

### [Critical] Finding 1: Character Spritesheet Frame Dimension Mismatch Breaking Canvas 2D Slicing
- **Location**:
  - `assets/characters/anim_woman.png` (actual: 1600×300 px; expected: 1696×300 px, 8 × 212px)
  - `assets/characters/c_woman.png` (actual: 200×300 px; expected: 212×300 px)
  - `assets/characters/anim_monk.png` (actual: 1720×300 px; expected: 1696×300 px, 8 × 212px)
  - `assets/characters/c_monk.png` (actual: 215×300 px; expected: 212×300 px)
  - `assets/characters/anim_nun.png` (actual: 1640×300 px; expected: 1696×300 px, 8 × 212px)
  - `assets/characters/c_nun.png` (actual: 205×300 px; expected: 212×300 px)
- **Impact & Root Cause**:
  - In `public/js/CharacterRenderer.js` (lines 58-66, lines 292-303):
    ```javascript
    { id: 'char_woman', path: '/assets/characters/anim_woman.png', fw: 212, fh: 300, seatedH: 220 },
    { id: 'char_monk', path: '/assets/characters/anim_monk.png', fw: 212, fh: 300, seatedH: 215 },
    { id: 'char_nun', path: '/assets/characters/anim_nun.png', fw: 212, fh: 300, seatedH: 215 }
    ```
    The engine computes frame source rectangle as `sx = frameIndex * sheet.fw`.
    For `char_woman`:
    - Frame 0: `sx = 0..212` (Image has frame 0 from 0..200; captures 12px into frame 1).
    - Frame 1: `sx = 212..424` (Image has frame 1 from 200..400; clips 12px of frame 1 and captures 24px of frame 2).
    - Frame 7 (sitting idle): `sx = 7 * 212 = 1484`. Reading `1484 + 212 = 1696px` exceeds image width (1600px).
  - This violates the explicit Acceptance Criteria in `ORIGINAL_REQUEST.md`:
    > "All character spritesheet strips (`anim_*.png`) contain exactly 8 frames horizontally with frame dimensions matching `manifest.json`."
- **Suggested Fix**:
  Regenerate `c_woman.png`, `anim_woman.png`, `c_monk.png`, `anim_monk.png`, `c_nun.png`, and `anim_nun.png` with exact frame width of 212px (total strip width: 1696px, 8 frames of 212×300px), harmonizing with `manifest.json`, `ASSET_MANIFEST.md`, and `CharacterRenderer.js`.

---

### [Major] Finding 2: Altar Prop Dimension Discrepancies Causing Aspect Ratio Distortion
- **Location**:
  - `assets/altar/statue_shakyamuni.png` (actual: 420×680 px; manifest: 600×800 px)
  - `assets/altar/statue_amitabha.png` (actual: 420×680 px; manifest: 600×800 px)
  - `assets/altar/statue_avalokiteshvara.png` (actual: 420×680 px; manifest: 550×820 px)
  - `assets/altar/censer_bronze.png` (actual: 280×260 px; manifest: 280×240 px)
  - `assets/altar/candle_stand.png` (actual: 140×320 px; manifest: 150×350 px)
  - `assets/altar/meditation_cushion.png` (actual: 240×120 px; manifest: 160×90 px)
- **Impact & Root Cause**:
  In `public/js/CanvasFloorEngine.js` (lines 143-144):
  ```javascript
  ctx.drawImage(this.images.statue, 240, 360, 600, 800);
  ```
  Drawing a 420×680 image into a 600×800 viewport stretches the Buddha statue horizontally from aspect ratio 0.618 to 0.750 (+21.4% width distortion). Similarly, cushions are rendered at 160×90 scale on the trapezoid floor, while the physical asset was rendered at 240×120 (ratio 2.0 vs 1.78).
- **Suggested Fix**:
  Either:
  a) Regenerate altar props at their declared manifest dimensions (e.g. 600×800 for statues, 160×90 for cushion, 280×240 for censer, 150×350 for candle stand); OR
  b) Standardize `manifest.json` and adjust `CanvasFloorEngine.js` draw coordinates to preserve native aspect ratios using centered proportional scaling.

---

### [Major] Finding 3: Validation Harness Façade & Coverage Blindspot in `scripts/verify_assets.mjs`
- **Location**: `scripts/verify_assets.mjs` (lines 80-90, lines 177-200)
- **Impact & Root Cause**:
  `scripts/verify_assets.mjs` reported 100% pass and 0 missing physical files despite 12 files possessing mismatched dimensions because:
  1. In CHECK 3, it only evaluates `fs.existsSync(filePath)` without reading file dimensions from PNG/JPG headers.
  2. For characters, it checks `const filePath = item.path || item.staticPath`, never verifying whether `item.spritesheetPath` exists on disk!
  3. In CHECK 6, it compares `c.frameWidth` from `manifest.json` with regex captures from `ASSET_MANIFEST.md`. Because both text documents stated `212px`, it claimed `Result: 100% harmonized`, masking the fact that the physical files on disk were 200px, 215px, and 205px.
- **Suggested Fix**:
  Enhance `scripts/verify_assets.mjs` to:
  - Check both `staticPath` and `spritesheetPath` for character existence.
  - Read PNG `IHDR` and JPEG `SOF0` chunks to verify that actual file dimensions match declared `manifest.json` width and height.

---

### [Minor] Finding 4: BGM MP3 Bitrate Discrepancy (160 kbps vs Manifest 320 kbps)
- **Location**:
  - `assets/audio/bgm/music1.mp3` (actual: 160 kbps, 44100 Hz, 4,683,904 bytes)
  - `assets/audio/bgm/music2.mp3` (actual: 160 kbps, 44100 Hz, 4,348,535 bytes)
  - `manifest.json` (lines 443, 459: `bitrate: 320`)
- **Impact**:
  Both MP3 files are valid, decodable MPEG-1 Layer III audio files with proper ID3 headers and sync words. They play and loop cleanly in WebAudioEngine. The 160 kbps stream provides lower bandwidth usage for OBS CEF streaming, but represents a minor metadata discrepancy with `manifest.json`.
- **Suggested Fix**:
  Update `manifest.json` to record `bitrate: 160` (or re-encode at 320 kbps if lossless source available).

---

## 3. Verified Claims Matrix

| Verification Target | Expected / Claimed | Empirical Observation | Verdict |
|---|---|---|:---:|
| Backend Unit Tests | `npm test` passes 100% | 28 tests across 14 suites passed, 0 failed (14.39s) | **PASS** |
| Overlay Milestone 2 Test Suite | `node scripts/test_overlay_m2.mjs` passes 100% | 23 tests passed, 0 failed across all 7 test groups | **PASS** |
| Overlay Event Simulation | `node scripts/test_overlay_app_events.mjs` passes | Event dispatching, state apply, and cleanup passed | **PASS** |
| Asset Manifest Physical Presence | 29 cataloged entries on disk | 0 missing physical files reported by `verify_assets.mjs` (37 total files) | **PASS** |
| Audio SFX WAV Format | RIFF WAV 48000Hz, 24-bit PCM Stereo | All 7 SFX WAV files verified: 48kHz, 2-ch, 24-bit, unclipped peak < 0.0dBFS | **PASS** |
| Audio BGM MP3 Decodability | Valid decodable MP3 files | `music1.mp3` (8,965 frames) & `music2.mp3` (8,315 frames) verified MPEG-1 Layer III | **PASS** |
| Web Audio Fallback Integrity | Web Audio synthesis when buffers missing | Seamless fallback to swept triangle mõ & Solfeggio bell; -14dB ducking functional | **PASS** |
| Character Spritesheet Count & Frames | 7 characters, 8 frames horizontally | 7 characters present; all strips contain 8 sequential action frames | **PASS** |
| Spritesheet Dimension Conformance | Frame width matches manifest & ASSET_MANIFEST.md | 3 strips (`anim_woman`, `anim_monk`, `anim_nun`) have mismatched frame widths | **FAIL** |
| Altar Prop Dimension Conformance | Pixel dimensions match manifest.json | 6 altar assets differ from manifest.json specifications | **FAIL** |
| Alpha Transparency Quality | PNG assets have clean alpha cutouts (`minAlpha = 0`) | All 25 PNG assets verified: corner pixels = 0, clean alpha transparency | **PASS** |

---

## 4. Adversarial Challenges (Critic Perspective)

### Challenge 1: The "Invisible" Spritesheet Tearing in Live Stream
- **Attack Scenario**:
  During a live broadcast, viewers trigger prostrations or clothing changes to `char_woman` or `char_monk`.
- **Failure Mode**:
  `CharacterRenderer.js` draws each frame with step `sx = frameIndex * 212`.
  For `char_woman` (frame width 200), Frame 7 (sitting meditation) is drawn from `sx = 1484` with width 212 (up to 1696px).
  Because the image ends at 1600px, Canvas 2D will either clip or sample undefined texture memory, resulting in avatar visual clipping, while earlier frames display adjacent character frames slicing through the body.
- **Blast Radius**: High. Breaks primary visual immersion on TikTok LIVE stream.

### Challenge 2: The Self-Certifying Test Façade
- **Attack Scenario**:
  CI/CD pipeline runs `scripts/verify_assets.mjs` to gate production deployment.
- **Failure Mode**:
  `verify_assets.mjs` checks file presence and compares JSON against Markdown text. Even if all images were 1x1 pixel white squares or mismatched sizes, the test passes with green exit code 0.
- **Blast Radius**: High. Masking production defects behind green test badges.

---

## 5. Summary Recommendation

1. **Worker Visual**:
   Update `generate_characters.py` to fix:
   - `char_woman`: fw = 212, fh = 300 (strip 1696×300)
   - `char_monk`: fw = 212, fh = 300 (strip 1696×300)
   - `char_nun`: fw = 212, fh = 300 (strip 1696×300)
   Regenerate static portraits `c_woman.png`, `c_monk.png`, `c_nun.png` at 212×300.
   Optionally regenerate altar statues and cushion to match `manifest.json` dimensions.
2. **Scripts**:
   Update `scripts/verify_assets.mjs` to check actual image dimensions and verify `spritesheetPath`.
