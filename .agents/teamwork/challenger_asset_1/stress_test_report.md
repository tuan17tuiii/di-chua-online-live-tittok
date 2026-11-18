# Empirical Stress Test Report: Visual Assets Verification

- **Agent ID**: challenger_asset_1
- **Target**: All 27 Visual Assets in `assets/backgrounds/`, `assets/altar/`, `assets/characters/`, and `assets/fx/`
- **Execution Date**: 2026-11-02
- **Test Scripts Executed**:
  - `node scripts/empirical_asset_test.mjs`
  - `node scripts/test_character_drift.mjs`
- **Overall Verdict**: **REJECT**

---

## 1. Executive Summary & Verdict

| Category | Total Assets | Passed | Failed | Status |
|---|---|---|---|---|
| **1. Binary Image Integrity** | 27 | 27 | 0 | **PASS (100%)** |
| **2. Dimensions & Geometry** | 27 | 15 | 12 | **FAIL (44.4% Defect Rate)** |
| **3. Alpha Transparency & Borders** | 25 (PNGs) | 25 | 0 | **PASS (100%)** |
| **4. Seated Character Anchoring** | 14 (7 static + 7 strips) | 14 | 0 | **PASS (100%)** |
| **5. File Size Constraints (ASSET_MANIFEST.md)** | 27 | 26 | 1 | **FAIL (3.7% Defect Rate)** |

### Final Verdict: **REJECT**
While binary integrity, alpha transparency cutouts, and bottom anchoring are structurally intact, **12 out of 27 visual assets (44.4%) severely violate the exact pixel geometry and dimension specifications** declared in `manifest.json`, `ASSET_MANIFEST.md`, and consumer rendering engines (`CharacterRenderer.js`, `CanvasFloorEngine.js`).

Crucially:
1. **Spritesheet Frame Slicing Corruption**: 3 out of 7 character spritesheets (`anim_woman.png`, `anim_monk.png`, `anim_nun.png`) do NOT match the 212px frame width contract hardcoded into `manifest.json` and `CharacterRenderer.js`. This causes cumulative frame drift up to **84 pixels**, rendering seam bleed across all 8 animation phases, and out-of-bounds texture memory sampling by up to **96 pixels** beyond the image buffer.
2. **Altar Statues & Props Dimension Divergence**: 6 altar assets (`statue_shakyamuni`, `statue_amitabha`, `statue_avalokiteshvara`, `altar_censer_bronze`, `altar_candle_stand`, `cushion_lotus_mat`) diverge substantially from specification (e.g. statues are 420×680 instead of 600×800/550×820), leading to **+21.4% non-uniform aspect ratio distortion** when drawn onto the OBS Canvas.
3. **Background File Size Overflow**: `bg_zen_garden.jpg` is 767.8 KB, violating the `< 550 KB` threshold defined in `ASSET_MANIFEST.md` Table 2.1 by +39.3%.

---

## 2. Test Suite 1: Binary Image Integrity

### Methodology
- Evaluated all 27 files on disk using binary buffer parsing:
  - **PNG**: Checked 8-byte signature `89 50 4E 47 0D 0A 1A 0A`, parsed every chunk (`IHDR`, `IDAT`, `IEND`), verified CRC32 checksums for every chunk against the IEEE 802.3 standard polynomial (`0xEDB88320`), verified no truncated streams, and confirmed zero trailing bytes after `IEND`.
  - **JPEG**: Checked SOI marker `0xFF 0xD8`, APP0 `0xFF 0xE0` JFIF marker, SOF0/SOF2 baseline/progressive frame headers, and EOI marker `0xFF 0xD9`.
  - Checked for zero-byte or corrupt files.

### Empirical Results: 27 / 27 PASS (100%)
- 0 truncated files.
- 0 corrupted headers.
- 0 CRC32 chunk mismatches.
- 0 trailing garbage bytes.
- All 25 PNGs utilize Color Type 6 (RGBA), Bit Depth 8, Compression Method 0, Filter Method 0, Interlace 0.

---

## 3. Test Suite 2: Dimensions & Geometry Stress Test

### Contract Specifications
- `manifest.json` lines 20-324
- `ASSET_MANIFEST.md` §2.1, §2.2, §2.3
- `CharacterRenderer.js` lines 58-66: Hardcoded frame width `fw: 212` for `char_man`, `char_woman`, `char_monk`, `char_nun`.

### Comprehensive Asset Dimension Comparison Matrix

| ID | File Path | Declared (Manifest / Doc) | Actual On Disk | Delta / Error | Status |
|---|---|:---:|:---:|:---:|:---:|
| `bg_main_hall` | `assets/backgrounds/hall.jpg` | 1080 × 1920 | 1080 × 1920 | 0 | **PASS** |
| `bg_zen_garden` | `assets/backgrounds/zen_garden.jpg` | 1080 × 1920 | 1080 × 1920 | 0 | **PASS** |
| `altar_table_main` | `assets/altar/altar_table.png` | 1080 × 850 | 1080 × 850 | 0 | **PASS** |
| `statue_shakyamuni` | `assets/altar/statue_shakyamuni.png` | 600 × 800 | **420 × 680** | **-180w, -120h** | **FAIL** |
| `statue_amitabha` | `assets/altar/statue_amitabha.png` | 600 × 800 | **420 × 680** | **-180w, -120h** | **FAIL** |
| `statue_avalokiteshvara` | `assets/altar/statue_avalokiteshvara.png` | 550 × 820 | **420 × 680** | **-130w, -140h** | **FAIL** |
| `altar_censer_bronze` | `assets/altar/censer_bronze.png` | 280 × 240 | **280 × 260** | **+20h** | **FAIL** |
| `altar_candle_stand` | `assets/altar/candle_stand.png` | 150 × 350 | **140 × 320** | **-10w, -30h** | **FAIL** |
| `cushion_lotus_mat` | `assets/altar/meditation_cushion.png` | 160 × 90 | **240 × 120** | **+80w, +30h** | **FAIL** |
| `char_man_static` | `assets/characters/c_man.png` | 212 × 300 | 212 × 300 | 0 | **PASS** |
| `char_man_strip` | `assets/characters/anim_man.png` | 1696 × 300 | 1696 × 300 | 0 (8 × 212) | **PASS** |
| `char_woman_static` | `assets/characters/c_woman.png` | 212 × 300 | **200 × 300** | **-12w** | **FAIL** |
| `char_woman_strip` | `assets/characters/anim_woman.png` | 1696 × 300 | **1600 × 300** | **-96w (8 × 200)** | **FAIL** |
| `char_granny_static` | `assets/characters/c_granny.png` | 195 × 300 | 195 × 300 | 0 | **PASS** |
| `char_granny_strip` | `assets/characters/anim_granny.png` | 1560 × 300 | 1560 × 300 | 0 (8 × 195) | **PASS** |
| `char_child_static` | `assets/characters/c_child.png` | 180 × 260 | 180 × 260 | 0 | **PASS** |
| `char_child_strip` | `assets/characters/anim_child.png` | 1440 × 260 | 1440 × 260 | 0 (8 × 180) | **PASS** |
| `char_monk_static` | `assets/characters/c_monk.png` | 212 × 300 | **215 × 300** | **+3w** | **FAIL** |
| `char_monk_strip` | `assets/characters/anim_monk.png` | 1696 × 300 | **1720 × 300** | **+24w (8 × 215)** | **FAIL** |
| `char_nun_static` | `assets/characters/c_nun.png` | 212 × 300 | **205 × 300** | **-7w** | **FAIL** |
| `char_nun_strip` | `assets/characters/anim_nun.png` | 1696 × 300 | **1640 × 300** | **-56w (8 × 205)** | **FAIL** |
| `char_master_static` | `assets/characters/c_master.png` | 230 × 320 | 230 × 320 | 0 | **PASS** |
| `char_master_strip` | `assets/characters/anim_master.png` | 1840 × 320 | 1840 × 320 | 0 (8 × 230) | **PASS** |
| `fx_halo_gold` | `assets/fx/fx_halo.png` | 512 × 512 | 512 × 512 | 0 | **PASS** |
| `fx_floating_lotus` | `assets/fx/fx_lotus.png` | 128 × 128 | 128 × 128 | 0 | **PASS** |
| `fx_gold_petal` | `assets/fx/fx_petal.png` | 64 × 64 | 64 × 64 | 0 | **PASS** |
| `fx_gift_bell_flash` | `assets/fx/fx_bell.png` | 256 × 256 | 256 × 256 | 0 | **PASS** |

**Summary**: 15 PASS, 12 FAIL.

---

## 4. Deep-Dive Attack: Character Spritesheet Frame Drift & Blast Radius

### Root Cause
In `CharacterRenderer.js` lines 292-303, the rendering pipeline calculates source crop coordinates assuming `fw = 212` for `char_woman`, `char_monk`, and `char_nun`:
```javascript
const sx = frameIndex * sheet.fw; // sheet.fw == 212
ctx.drawImage(sheet.img, sx, 0, sheet.fw, sheet.fh, -sheet.fw / 2, -sheet.fh, sheet.fw, sheet.fh);
```

### Empirical Drift Simulation Results

#### 1. `char_woman` (Inferred actual frame width: 200px, declared: 212px)
- Total image width: 1600px (short by 96px).
- **Frame 0 (Walk 1)**: Engine samples `[0, 212]`. Actual frame is `[0, 200]`. Bleeds 12px into Frame 1.
- **Frame 1 (Walk 2)**: Engine samples `[212, 424]`. Actual frame is `[200, 400]`. Drifts by +12px, bleeds 24px into Frame 2.
- **Frame 2 (Walk 3)**: Engine samples `[424, 636]`. Actual frame is `[400, 600]`. Drifts by +24px, bleeds 36px into Frame 3.
- **Frame 3 (Walk 4)**: Engine samples `[636, 848]`. Actual frame is `[600, 800]`. Drifts by +36px, bleeds 48px into Frame 4.
- **Frame 4 (Sit 1)**: Engine samples `[848, 1060]`. Actual frame is `[800, 1000]`. Drifts by +48px, bleeds 60px into Frame 5.
- **Frame 5 (Sit 2)**: Engine samples `[1060, 1272]`. Actual frame is `[1000, 1200]`. Drifts by +60px, bleeds 72px into Frame 6.
- **Frame 6 (Sit 3)**: Engine samples `[1272, 1484]`. Actual frame is `[1200, 1400]`. Drifts by +72px, bleeds 84px into Frame 7.
- **Frame 7 (Sit Idle / Bowing)**: Engine samples `[1484, 1696]`.
  - Actual Frame 7 is `[1400, 1600]`.
  - The engine starts 84px into Frame 7 (cutting off the entire left side of the seated avatar).
  - The engine tries to read up to X=1696, which is **96 pixels past the end of the image buffer (1600px)**!
  - **Blast Radius**: Massive texture distortion, ghost edge artifacts, and browser canvas out-of-bounds sampling.

#### 2. `char_monk` (Inferred actual frame width: 215px, declared: 212px)
- Total image width: 1720px (exceeds by 24px).
- Frame 7 (Sit Idle): Engine samples `[1484, 1696]`.
- Actual Frame 7 starts at `1505` (`7 * 215`).
- The engine starts sampling at `1484`, which is **21 pixels before Frame 7 starts**.
- **Blast Radius**: 21 pixels of the kneeling avatar from Frame 6 bleed directly into the side of the seated monk during meditation.

#### 3. `char_nun` (Inferred actual frame width: 205px, declared: 212px)
- Total image width: 1640px (short by 56px).
- Frame 7 (Sit Idle): Engine samples `[1484, 1696]`.
- Actual Frame 7 ends at `1640`.
- The engine reads **56 pixels past the end of the image buffer**.
- **Blast Radius**: Right edge of seated nun is truncated, producing seam tearing on the OBS floor.

---

## 5. Test Suite 3: Alpha Transparency & Border Artifacts

### Methodology
- Decompressed scanlines of all 25 PNG assets via `zlib.inflateSync`.
- Reconstructed 32-bit RGBA pixel buffers by decoding PNG filter types (None, Sub, Up, Average, Paeth).
- Inspected:
  1. Minimum alpha: Asserted `minAlpha == 0` (transparent regions exist).
  2. Maximum alpha: Asserted `maxAlpha > 200` (opaque subject exists).
  3. 4 Corner pixels: Asserted `alpha == 0` at `(0, 0)`, `(width-1, 0)`, `(0, height-1)`, `(width-1, height-1)`.
  4. Border perimeter: Checked for opaque box clipping artifacts.

### Empirical Results: 25 / 25 PASS (100%)
- Every PNG asset possesses a genuine alpha channel with `minAlpha == 0`.
- Every PNG asset features an opaque or semi-opaque subject with `maxAlpha >= 214` (e.g. `fx_halo` max alpha is 214; all others 255).
- All 4 corners of all 25 PNG files have `alpha == 0` with zero opaque rectangle border clipping.
- Anti-aliasing quality: Semi-transparent boundary pixels (`0 < alpha < 255`) represent 4.0% to 14.0% of pixels in character and statue cutouts, confirming smooth edge blending.

---

## 6. Test Suite 4: Solemn Aesthetic & Character Anchoring

### Methodology
- Inspected the bottom row (`y = frameHeight - 1`) and the bottom 5 rows (`y >= frameHeight - 5`) for all 7 static character portraits and all 56 individual animation frames (7 strips × 8 frames).
- Verified that the subject's base/robe anchors to the bottom contact plane (`bottomMargin == 0`).

### Empirical Results: 14 / 14 PASS (100%)
- In all 7 static avatars (`c_*.png`), the bottom row `y = frameHeight - 1` contains between 27 and 30 active pixels (`alpha > 20`), indicating firm bottom contact.
- In all 56 animation frames, characters do NOT float in mid-air (`bottomMargin == 0`).
- Bottom row active pixels during sitting/bowing phases expand appropriately to represent wide seated robe bases (up to 194 active pixels at `y = frameHeight - 1`).

---

## 7. Test Suite 5: File Size Constraints (ASSET_MANIFEST.md Table 2.1)

| Asset ID | File Path | Limit in ASSET_MANIFEST.md | Actual Size On Disk | Status |
|---|---|:---:|:---:|:---:|
| `bg_main_hall` | `assets/backgrounds/hall.jpg` | < 600 KB | 528,144 B (515.8 KB) | **PASS** |
| `bg_zen_garden` | `assets/backgrounds/zen_garden.jpg` | < 550 KB | **786,254 B (767.8 KB)** | **FAIL (+39.3%)** |
| `altar_table_main` | `assets/altar/altar_table.png` | < 500 KB | 85,540 B (83.5 KB) | **PASS** |
| `statue_shakyamuni` | `assets/altar/statue_shakyamuni.png` | < 450 KB | 83,848 B (81.9 KB) | **PASS** |
| `statue_amitabha` | `assets/altar/statue_amitabha.png` | < 450 KB | 95,423 B (93.2 KB) | **PASS** |
| `statue_avalokiteshvara` | `assets/altar/statue_avalokiteshvara.png` | < 420 KB | 88,211 B (86.1 KB) | **PASS** |
| `altar_censer_bronze` | `assets/altar/censer_bronze.png` | < 120 KB | 30,079 B (29.4 KB) | **PASS** |
| `altar_candle_stand` | `assets/altar/candle_stand.png` | < 80 KB | 15,013 B (14.7 KB) | **PASS** |
| `cushion_lotus_mat` | `assets/altar/meditation_cushion.png` | < 60 KB | 26,427 B (25.8 KB) | **PASS** |

---

## 8. Root Cause Analysis & Recommendations

### Why existing verification (`verify_assets.mjs`) missed this:
In `scripts/verify_assets.mjs` lines 86-90:
```javascript
const fullPath = path.join(rootDir, localRelPath);
if (!fs.existsSync(fullPath)) {
  physicalFilesMissing.push({ id: item.id, declaredPath: filePath, localRelPath });
}
```
The test harness only checked `fs.existsSync(fullPath)`. It **never parsed the binary headers** (`IHDR` / `SOF0`) to assert that the files on disk actually matched the dimensions declared in `manifest.json`.

### Remediation Plan:
1. **Regenerate / Re-export the 12 defective visual assets**:
   - `c_woman.png` to exactly 212 × 300 px; `anim_woman.png` to exactly 1696 × 300 px (8 frames of 212px).
   - `c_monk.png` to exactly 212 × 300 px; `anim_monk.png` to exactly 1696 × 300 px (8 frames of 212px).
   - `c_nun.png` to exactly 212 × 300 px; `anim_nun.png` to exactly 1696 × 300 px (8 frames of 212px).
   - `statue_shakyamuni.png` and `statue_amitabha.png` to exactly 600 × 800 px.
   - `statue_avalokiteshvara.png` to exactly 550 × 820 px.
   - `censer_bronze.png` to exactly 280 × 240 px.
   - `candle_stand.png` to exactly 150 × 350 px.
   - `meditation_cushion.png` to exactly 160 × 90 px.
   - Compress `bg_zen_garden.jpg` using standard mozjpeg/guetzli quality factor to bring size under 550 KB.
2. **Upgrade `verify_assets.mjs`**:
   - Incorporate the binary header parser from `scripts/empirical_asset_test.mjs` directly into `verify_assets.mjs` so that CI/CD automatically fails if an asset file's physical dimensions differ from `manifest.json`.
