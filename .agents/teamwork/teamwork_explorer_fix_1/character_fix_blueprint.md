# TECHNICAL FIX BLUEPRINT: CHARACTER SPRITESHEET GEOMETRY & BOTTOM-ANCHORING
## Nền Tảng Livestream Tương Tác TikTok "Chánh Điện Tịnh Tâm"

- **Document ID**: `character_fix_blueprint.md`
- **Author**: Explorer Fix 1 (`teamwork_explorer_fix_1`)
- **Recipient**: Orchestrator 2 (`4657945e-312a-4b1d-8783-863a86deb269`) / Visual Asset Worker (`worker_visual_1`)
- **Date**: 2026-11-02
- **Status**: Production Blueprint (Ready for Implementation)

---

## 1. Executive Summary & Objective

Following the Forensic Audit Integrity Violation reported by `auditor_asset_1`, `challenger_asset_1`, and `reviewer_asset_1`, this blueprint specifies the **exact technical fix** required to eliminate the spritesheet geometry drift, frame seam bleeding, and texture out-of-bounds (OOB) memory access across the character asset set.

### Core Objectives:
1. **Enforce Ground-Truth Dimensions**: Standardize `char_woman`, `char_monk`, and `char_nun` to exact frame dimensions `fw = 212`, `fh = 300`, resulting in an 8-frame strip of exactly **`1696 × 300` px** on disk, matching `manifest.json:175-177, 226-228, 243-245` and `CharacterRenderer.js:60, 63, 64`.
2. **Align Static Portraits**: Generate `c_woman.png`, `c_monk.png`, and `c_nun.png` at exact dimensions **`212 × 300` px** directly from the Frame 7 seated meditation pose.
3. **Preserve Perfect Bottom-Anchored Floor Contact**: Ensure all 8 action frames (F0-F3 walk cycle, F4-F6 sitting down, F7 seated meditation idle) maintain floor contact at `y = frameHeight - 1` (`y = 299`), with `bottomMargin == 0`, zero vertical float, and zero visual distortion.

---

## 2. Ground-Truth Defect Analysis & Mathematical Proof

### 2.1. Divergence Source
In Iteration 1, `worker_visual_1/generate_characters.py` hardcoded divergent frame widths based on an superseded dispatch prompt rather than ground-truth `manifest.json`:
- `char_woman`: hardcoded `fw = 200` $\implies$ strip `1600 × 300` px
- `char_monk`: hardcoded `fw = 215` $\implies$ strip `1720 × 300` px
- `char_nun`: hardcoded `fw = 205` $\implies$ strip `1640 × 300` px

Meanwhile, both `manifest.json` and `public/js/CharacterRenderer.js` were built to the authoritative specification:
```javascript
// public/js/CharacterRenderer.js lines 59-65
const list = [
  { id: 'char_man',    path: '/assets/characters/anim_man.png',   fw: 212, fh: 300, seatedH: 210 },
  { id: 'char_woman',  path: '/assets/characters/anim_woman.png', fw: 212, fh: 300, seatedH: 220 },
  { id: 'char_granny', path: '/assets/characters/anim_granny.png',fw: 195, fh: 300, seatedH: 222 },
  { id: 'char_child',  path: '/assets/characters/anim_child.png', fw: 180, fh: 260, seatedH: 190 },
  { id: 'char_monk',   path: '/assets/characters/anim_monk.png',  fw: 212, fh: 300, seatedH: 215 },
  { id: 'char_nun',    path: '/assets/characters/anim_nun.png',   fw: 212, fh: 300, seatedH: 215 },
  { id: 'char_master', path: '/assets/characters/anim_master.png',fw: 230, fh: 320, seatedH: 230 }
];
```

### 2.2. Runtime Canvas Slicing Equation & Mathematical Breakdown
In `public/js/CharacterRenderer.js:292-303`, the rendering engine draws character animation frames using:
$$\text{sx} = \text{frameIndex} \times \text{sheet.fw}$$
$$\text{ctx.drawImage}(\text{sheet.img}, \text{sx}, 0, \text{sheet.fw}, \text{sheet.fh}, -\frac{\text{sheet.fw}}{2}, -\text{sheet.fh}, \text{sheet.fw}, \text{sheet.fh})$$

Where `sheet.fw = 212` is constant for `char_woman`, `char_monk`, and `char_nun`.

#### Case A: `char_woman` (`actual_fw = 200`, `strip_width = 1600`)
- **Cumulative offset formula**: $\Delta(f) = f \times (212 - 200) = +12f\text{ px}$.
- **Frame-by-frame drift**:
  - **F0**: Engine reads $[0, 212]$. Actual F0 is $[0, 200]$. Bleeds **12px** into F1.
  - **F1**: Engine reads $[212, 424]$. Actual F1 is $[200, 400]$. Bleeds **24px** into F2.
  - **F2**: Engine reads $[424, 636]$. Actual F2 is $[400, 600]$. Bleeds **36px** into F3.
  - **F3**: Engine reads $[636, 848]$. Actual F3 is $[600, 800]$. Bleeds **48px** into F4.
  - **F4**: Engine reads $[848, 1060]$. Actual F4 is $[800, 1000]$. Bleeds **60px** into F5.
  - **F5**: Engine reads $[1060, 1272]$. Actual F5 is $[1000, 1200]$. Bleeds **72px** into F6.
  - **F6**: Engine reads $[1272, 1484]$. Actual F6 is $[1200, 1400]$. Bleeds **84px** into F7.
  - **F7** (`phase === 'sit'` / seated idle meditation):
    $$\text{sx} = 7 \times 212 = 1484\text{ px}$$
    $$\text{end\_x} = 1484 + 212 = 1696\text{ px}$$
    Actual F7 boundary on disk: $[1400, 1600]\text{ px}$.
    - **Seam Bleed**: $1484 - 1400 = \mathbf{84\text{ px}}$. The left 84px of the seated character is sheared off; instead, the engine renders 84px from the right side of F6 (kneeling transition).
    - **Out-of-Bounds (OOB) Sampling**: $1696 - 1600 = \mathbf{96\text{ px}}$. The engine requests 96 pixels beyond the physical width of the image. In Chromium/CEF, this results in transparent clipping or memory clamp artifacts on the live stream overlay.

#### Case B: `char_monk` (`actual_fw = 215`, `strip_width = 1720`)
- **Cumulative offset formula**: $\Delta(f) = f \times (212 - 215) = -3f\text{ px}$.
- At F7: Engine reads $[1484, 1696]$. Actual F7 is $[1505, 1720]$.
- **Seam Bleed**: $1505 - 1484 = \mathbf{21\text{ px}}$. Slices 21px backwards into Frame 6, displaying a ghost kneeling silhouette on the left of the meditating monk.

#### Case C: `char_nun` (`actual_fw = 205`, `strip_width = 1640`)
- **Cumulative offset formula**: $\Delta(f) = f \times (212 - 205) = +7f\text{ px}$.
- At F7: Engine reads $[1484, 1696]$. Actual F7 is $[1435, 1640]$.
- **Seam Bleed**: $1484 - 1435 = \mathbf{49\text{ px}}$ of Frame 7 is lost.
- **Out-of-Bounds**: $1696 - 1640 = \mathbf{56\text{ px}}$ past the 1640px strip edge.

---

## 3. Technical Fix Blueprint for `generate_characters.py`

### 3.1. Target File
`c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_visual_1\generate_characters.py`

### 3.2. Exact Code Modifications in `CHAR_SPECS`
Update the `fw` parameter to `212` for `char_woman`, `char_monk`, and `char_nun`:

```python
# ==============================================================================
# MODIFICATION: CHAR_SPECS in worker_visual_1/generate_characters.py
# Enforce fw = 212 across char_man, char_woman, char_monk, char_nun
# ==============================================================================

CHAR_SPECS = [
    {
        "id": "char_man",
        "fw": 212, "fh": 300,
        "name": "Cư sĩ Nam áo lam",
        "robe": (92, 111, 132, 255),       # Grey-blue Áo lam
        "trim": (55, 71, 79, 255),         # Slate trim
        "skin": (245, 205, 170, 255),
        "hair": (40, 30, 25, 255),
        "style": "man"
    },
    {
        "id": "char_woman",
        "fw": 212, "fh": 300,             # <<< FIXED: was 200
        "name": "Cư sĩ Nữ áo lam",
        "robe": (107, 124, 150, 255),      # Elegant Áo dài lam
        "trim": (207, 216, 220, 255),      # Silk scarf trim
        "skin": (250, 215, 185, 255),
        "hair": (35, 25, 20, 255),
        "style": "woman"
    },
    {
        "id": "char_granny",
        "fw": 195, "fh": 300,
        "name": "Phật tử cao tuổi áo nâu sồng",
        "robe": (93, 64, 55, 255),         # Earth brown Áo nâu sồng
        "trim": (141, 110, 99, 255),
        "skin": (235, 195, 160, 255),
        "hair": (70, 60, 55, 255),         # Velvet headscarf (khăn vấn)
        "style": "granny"
    },
    {
        "id": "char_child",
        "fw": 180, "fh": 260,
        "name": "Chú tiểu ngây thơ",
        "robe": (121, 85, 72, 255),        # Novice monk brown tunic
        "trim": (188, 170, 164, 255),
        "skin": (250, 210, 175, 255),
        "hair": (45, 30, 20, 255),         # Three tufts of hair (tóc ba chỏm)
        "style": "child"
    },
    {
        "id": "char_monk",
        "fw": 212, "fh": 300,             # <<< FIXED: was 215
        "name": "Sư thầy thiền môn",
        "robe": (141, 91, 40, 255),        # Ochre monastic robe (nâu nghệ)
        "trim": (212, 143, 56, 255),       # Saffron inner collar
        "skin": (240, 200, 165, 255),
        "hair": None,                      # Shaved head
        "style": "monk"
    },
    {
        "id": "char_nun",
        "fw": 212, "fh": 300,             # <<< FIXED: was 205
        "name": "Sư cô ni chúng",
        "robe": (109, 91, 82, 255),        # Grey-brown monastic robe
        "trim": (161, 136, 127, 255),
        "skin": (245, 205, 175, 255),
        "hair": (93, 64, 55, 255),         # Brown cloth headband
        "style": "nun"
    },
    {
        "id": "char_master",
        "fw": 230, "fh": 320,
        "name": "Cao tăng viện chủ",
        "robe": (153, 0, 0, 255),          # Crimson ceremonial kesa (cà sa đỏ)
        "trim": (255, 215, 0, 255),        # Gold embroidery
        "skin": (240, 195, 155, 255),
        "hair": None,                      # Shaved head
        "style": "master"
    }
]
```

### 3.3. Spritesheet Assembly & Portrait Generation Pipeline
The existing generation loop in `generate_characters.py:287-315` will automatically generate both outputs correctly once `CHAR_SPECS` is updated:

1. **Static Portraits (`c_*.png`)**:
   ```python
   # Line 302-305: Frame 7 (seated meditation) is saved as the static portrait
   c_path = f"assets/characters/c_{cid.replace('char_', '')}.png"
   frames[7].save(c_path, 'PNG')
   ```
   - For `char_woman`: saved at `212 × 300` px.
   - For `char_monk`: saved at `212 × 300` px.
   - For `char_nun`: saved at `212 × 300` px.
2. **Sequential 8-Frame Spritesheet Strips (`anim_*.png`)**:
   ```python
   # Line 292, 308-313: Strip is assembled as total_w = fw * 8
   total_w = fw * 8  # 212 * 8 = 1696 px
   strip = Image.new('RGBA', (total_w, fh), (0, 0, 0, 0))
   for f_idx, f_img in enumerate(frames):
       strip.paste(f_img, (f_idx * fw, 0))
   anim_path = f"assets/characters/anim_{cid.replace('char_', '')}.png"
   strip.save(anim_path, 'PNG')
   ```
   - Strip dimensions for `anim_woman.png`, `anim_monk.png`, `anim_nun.png`: **`1696 × 300` px**.

---

## 4. Preservation of Bottom-Anchoring & Proportional Geometry

### 4.1. The Supersampling Architecture
`generate_characters.py` renders frames using a 3x supersampling buffer:
```python
fw, fh = spec["fw"], spec["fh"]  # 212, 300
scale = 3
sw, sh = fw * scale, fh * scale   # 636, 900
cx = sw // 2                      # 318 (exact horizontal center)
bot_y = sh - 2                    # 898 (bottom floor contact baseline)
```

### 4.2. Horizontal Centering Without Distortion
Every feature in `render_frame_supersampled` is parameterized relative to `cx = sw // 2` and proportional to `sw`:
- `head_r = int(sw * 0.14)` $= \text{int}(636 \times 0.14) = 89\text{ px}$
- `shoulder_w = int(sw * 0.32)` $= \text{int}(636 \times 0.32) = 203\text{ px}$
- `leg_rx = int(sw * 0.44)` $= \text{int}(636 \times 0.44) = 279\text{ px}$
- Robe polygon points: $[(cx - \text{int}(sw \times 0.28), \dots), (cx + \text{int}(sw \times 0.28), \dots)]$

**Key Geometric Guarantee**:
Because all horizontal components scale directly with `sw` and anchor symmetrically around `cx`, transitioning from `fw = 200` to `fw = 212` creates **zero aspect ratio distortion**. The character is simply centered with an additional 6px of breathing room on each lateral margin, preventing robe clipping at the frame boundary.

### 4.3. Vertical Bottom-Anchored Floor Contact (`y = frameHeight - 1`)
In `CharacterRenderer.js:287-303`, the canvas pivot point is:
```javascript
ctx.translate(char.currentX, char.currentY + yOffset);
ctx.scale(scale, scale * yScale);
ctx.drawImage(sheet.img, sx, 0, sheet.fw, sheet.fh, -sheet.fw / 2, -sheet.fh, sheet.fw, sheet.fh);
```
- Draw destination Y range is $[-\text{sheet.fh}, 0]$.
- This means the bottom row of the image ($y = \text{fh} - 1 = 299$) corresponds to $Y = 0$, the floor contact plane.
- If an avatar has padding/transparent rows at the bottom, the avatar floats above the meditation cushion or temple floor.

#### Floor Contact Verification Across All 8 Frames:
1. **Frames 0–3 (Walk Cycle)**:
   ```python
   stand_bot = bot_y  # 898
   draw.ellipse([f_left_x - 18, stand_bot - 14, f_left_x + 18, stand_bot], fill=shoe_color)
   draw.ellipse([f_right_x - 18, stand_bot - 14, f_right_x + 18, stand_bot], fill=shoe_color)
   ```
   Shoe ellipses touch `stand_bot = bot_y = 898`.
2. **Frames 4–6 (Sitting Down Transition)**:
   ```python
   base_pts = [
       (cx - spread, bot_y),
       (cx + spread, bot_y),
       (cx + int(spread * 0.8), hip_y),
       (cx - int(spread * 0.8), hip_y)
   ]
   draw.polygon(base_pts, fill=robe)
   ```
   Base polygon edge touches `bot_y = 898`.
3. **Frame 7 (Seated Meditation Idle)**:
   ```python
   draw.ellipse([cx - leg_rx, bot_y - leg_ry * 2, cx + leg_rx, bot_y], fill=robe, outline=trim, width=4)
   ```
   Crossed legs meditation base touches `bot_y = 898`.

#### Lanczos Downsampling Mapping:
Downsampling from `(sw, sh) = (636, 900)` to `(fw, fh) = (212, 300)` via `Image.Resampling.LANCZOS`:
$$\text{Target } Y = \frac{898}{900} \times 300 = 299.33\text{ px} \implies \text{Index } 299\text{ (row } \text{fh} - 1\text{)}$$
This guarantees that row index 299 contains active, opaque contact pixels (`alpha > 20`), resulting in `bottomMargin == 0` for all 8 frames.

---

## 5. Secondary Artifact & Harness Harmonization

### 5.1. Update `worker_visual_1/verify_visual_assets.py`
In `worker_visual_1/verify_visual_assets.py`, update lines 23–24 and 32–37:
```python
    {"path": "assets/characters/c_woman.png", "format": "PNG", "mode": "RGBA", "width": 212, "height": 300, "has_alpha": True},
    {"path": "assets/characters/anim_woman.png", "format": "PNG", "mode": "RGBA", "width": 1696, "height": 300, "has_alpha": True, "frames": 8, "fw": 212},

    {"path": "assets/characters/c_monk.png", "format": "PNG", "mode": "RGBA", "width": 212, "height": 300, "has_alpha": True},
    {"path": "assets/characters/anim_monk.png", "format": "PNG", "mode": "RGBA", "width": 1696, "height": 300, "has_alpha": True, "frames": 8, "fw": 212},

    {"path": "assets/characters/c_nun.png", "format": "PNG", "mode": "RGBA", "width": 212, "height": 300, "has_alpha": True},
    {"path": "assets/characters/anim_nun.png", "format": "PNG", "mode": "RGBA", "width": 1696, "height": 300, "has_alpha": True, "frames": 8, "fw": 212},
```

### 5.2. Verification Test Harness Expected Outputs
When re-executed post-generation:

1. **`node scripts/test_character_drift.mjs`**:
   ```
   Character: char_woman (Cư sĩ Nữ áo lam)
     Declared Frame: 212x300 | Actual Strip: 1696x300 | Inferred FW: 212
     Dimension Match: PASS
     Max Seam Bleed: 0px | Max Out-Of-Bounds: 0px

   Character: char_monk (Sư thầy thiền môn)
     Declared Frame: 212x300 | Actual Strip: 1696x300 | Inferred FW: 212
     Dimension Match: PASS
     Max Seam Bleed: 0px | Max Out-Of-Bounds: 0px

   Character: char_nun (Sư cô ni chúng)
     Declared Frame: 212x300 | Actual Strip: 1696x300 | Inferred FW: 212
     Dimension Match: PASS
     Max Seam Bleed: 0px | Max Out-Of-Bounds: 0px
   ```
2. **`node scripts/empirical_asset_test.mjs`**:
   - `[char_woman_static]`: `Dim: PASS (212x300) | Alpha: PASS | Anchor: PASS (bottomMargins=[0px])`
   - `[char_woman_strip]`: `Dim: PASS (1696x300) | Alpha: PASS | Anchor: PASS (bottomMargins=[0, 0, 0, 0, 0, 0, 0, 0px])`
   - `[char_monk_static]`: `Dim: PASS (212x300) | Alpha: PASS | Anchor: PASS (bottomMargins=[0px])`
   - `[char_monk_strip]`: `Dim: PASS (1696x300) | Alpha: PASS | Anchor: PASS (bottomMargins=[0, 0, 0, 0, 0, 0, 0, 0px])`
   - `[char_nun_static]`: `Dim: PASS (212x300) | Alpha: PASS | Anchor: PASS (bottomMargins=[0px])`
   - `[char_nun_strip]`: `Dim: PASS (1696x300) | Alpha: PASS | Anchor: PASS (bottomMargins=[0, 0, 0, 0, 0, 0, 0, 0px])`

---

## 6. Actionable Implementation Checklist for Visual Worker

- [ ] **Step 1**: Open `worker_visual_1/generate_characters.py`.
- [ ] **Step 2**: Replace `fw: 200` with `fw: 212` for `char_woman` (line 20).
- [ ] **Step 3**: Replace `fw: 215` with `fw: 212` for `char_monk` (line 50).
- [ ] **Step 4**: Replace `fw: 205` with `fw: 212` for `char_nun` (line 60).
- [ ] **Step 5**: Execute `python .agents/teamwork/worker_visual_1/generate_characters.py`.
- [ ] **Step 6**: Update `worker_visual_1/verify_visual_assets.py` with the 212px dimensions.
- [ ] **Step 7**: Run `node scripts/test_character_drift.mjs` and confirm 0px bleed / 0px OOB.
- [ ] **Step 8**: Run `node scripts/empirical_asset_test.mjs` and confirm all 14 character checks pass.
