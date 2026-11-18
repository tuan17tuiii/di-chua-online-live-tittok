# HANDOFF REPORT — CHARACTER SPRITESHEET FIX BLUEPRINT (teamwork_explorer_fix_1)

**Agent ID**: `teamwork_explorer_fix_1`  
**Parent Agent**: `orchestrator_2` (`4657945e-312a-4b1d-8783-863a86deb269`)  
**Target Milestone**: Character Spritesheet Drift Remediation & Alignment Blueprint  
**Handoff Type**: Hard Handoff (Investigation & Architecture Blueprint Complete)  
**Primary Deliverable**: `c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_fix_1\character_fix_blueprint.md`

---

## 1. Observation

Direct empirical observations from source files and test harness runs:

1. **Manifest Contract**:
   In `manifest.json`:
   - Lines 175-177 (`char_woman`): `"frameWidth": 212`, `"frameHeight": 300`, `"frameCount": 8`. Expected strip width: $212 \times 8 = 1696\text{px}$.
   - Lines 226-228 (`char_monk`): `"frameWidth": 212`, `"frameHeight": 300`, `"frameCount": 8`. Expected strip width: $212 \times 8 = 1696\text{px}$.
   - Lines 243-245 (`char_nun`): `"frameWidth": 212`, `"frameHeight": 300`, `"frameCount": 8`. Expected strip width: $212 \times 8 = 1696\text{px}$.

2. **Consumer Slicing Engine**:
   In `public/js/CharacterRenderer.js`:
   - Lines 58-65:
     ```javascript
     { id: 'char_man', path: '/assets/characters/anim_man.png', fw: 212, fh: 300, seatedH: 210 },
     { id: 'char_woman', path: '/assets/characters/anim_woman.png', fw: 212, fh: 300, seatedH: 220 },
     { id: 'char_granny', path: '/assets/characters/anim_granny.png', fw: 195, fh: 300, seatedH: 222 },
     { id: 'char_child', path: '/assets/characters/anim_child.png', fw: 180, fh: 260, seatedH: 190 },
     { id: 'char_monk', path: '/assets/characters/anim_monk.png', fw: 212, fh: 300, seatedH: 215 },
     { id: 'char_nun', path: '/assets/characters/anim_nun.png', fw: 212, fh: 300, seatedH: 215 },
     { id: 'char_master', path: '/assets/characters/anim_master.png', fw: 230, fh: 320, seatedH: 230 }
     ```
   - Lines 292-303:
     ```javascript
     const sx = frameIndex * sheet.fw;
     ctx.drawImage(
       sheet.img,
       sx,
       0,
       sheet.fw,
       sheet.fh,
       -sheet.fw / 2,
       -sheet.fh,
       sheet.fw,
       sheet.fh
     );
     ```

3. **Generator Divergence Root Cause**:
   In `worker_visual_1/generate_characters.py`:
   - Line 20: `"id": "char_woman", "fw": 200, "fh": 300` (Strip: $200 \times 8 = 1600\text{px}$)
   - Line 50: `"id": "char_monk", "fw": 215, "fh": 300` (Strip: $215 \times 8 = 1720\text{px}$)
   - Line 60: `"id": "char_nun", "fw": 205, "fh": 300` (Strip: $205 \times 8 = 1640\text{px}$)
   - Lines 303-304: Static portrait `c_*.png` is exported directly as `frames[7].save(c_path, 'PNG')`, generating `c_woman.png` at 200×300, `c_monk.png` at 215×300, and `c_nun.png` at 205×300.

4. **Empirical Drift Measurement**:
   Execution of `node scripts/test_character_drift.mjs` directly produced:
   - For `char_woman`:
     ```
     F7: Engine=[1484, 1696] vs Actual=[1400, 1600] (drift=+84px)
     Max Seam Bleed: 84px | Max Out-Of-Bounds: 96px
     ```
   - For `char_monk`:
     ```
     F7: Engine=[1484, 1696] vs Actual=[1505, 1720] (drift=-21px)
     Max Seam Bleed: 21px | Max Out-Of-Bounds: 0px
     ```
   - For `char_nun`:
     ```
     F7: Engine=[1484, 1696] vs Actual=[1435, 1640] (drift=+49px)
     Max Seam Bleed: 49px | Max Out-Of-Bounds: 56px
     ```

5. **Floor Contact Alignment**:
   Execution of `node scripts/empirical_asset_test.mjs` confirmed:
   - `Character Bottom Anchoring Pass: 14 / 14`
   - All 14 character files (static and strips) currently possess `bottomMargin == 0` and non-zero active pixels on bottom row `y = frameHeight - 1`.

---

## 2. Logic Chain

1. **User Acceptance Criteria**:
   `ORIGINAL_REQUEST.md:96-97` mandates that all image files match exact dimensions in `manifest.json` and that all character spritesheets contain 8 horizontal frames matching manifest frame dimensions.
2. **Defect Mechanism**:
   Because `CharacterRenderer.js` steps by `fw = 212`, when an image strip of 1600px (`fw = 200`) is loaded for `char_woman`, the slicing window drifts by $+12\text{px}$ per frame. At Frame 7 ($sx = 1484$), the slice begins 84px after the start of Frame 7 ($1484 - 1400 = 84\text{px}$ seam bleed) and extends to $X = 1696\text{px}$, which is 96px beyond the physical 1600px texture boundary.
3. **Remediation Invariance**:
   Inspection of `render_frame_supersampled` in `generate_characters.py` shows all horizontal body dimensions are proportional to `sw` and centered at `cx = sw // 2`. Changing `fw` from 200, 215, 205 to 212 scales `sw = 636`, `cx = 318`, preserving proportional anatomy without horizontal distortion.
4. **Vertical Anchoring Preservation**:
   All 8 frames anchor their base at `bot_y = sh - 2` ($898$ at 3x scale). Downsampling via Lanczos down to $300\text{px}$ places the contact baseline at $898 / 3 \approx 299.33\text{px}$, filling pixel row $y = 299$ (`fh - 1`), maintaining `bottomMargin == 0` and preventing vertical floating.
5. **Static Portrait Synchronization**:
   Because `generate_characters.py:304` saves Frame 7 as `c_*.png`, setting `fw: 212` automatically generates `c_woman.png`, `c_monk.png`, and `c_nun.png` at `212 × 300` px.

---

## 3. Caveats

- **Scope Boundary**: This blueprint addresses only the character spritesheets and static portraits (`char_woman`, `char_monk`, `char_nun`). Altar props and statues (`statue_shakyamuni`, `statue_amitabha`, `statue_avalokiteshvara`, `cushion_lotus_mat`, `candle_stand`, `censer_bronze`) and background compression (`zen_garden.jpg`) are assigned to separate explorer/worker tracks.
- **Read-Only Constraint**: As an Explorer agent, no direct modifications have been made to `worker_visual_1/generate_characters.py` or `assets/characters/`. The changes must be executed by `worker_visual_1`.

---

## 4. Conclusion

The character spritesheet defects are completely understood and mathematically verified. The exact fix requires modifying 3 integer values in `worker_visual_1/generate_characters.py:CHAR_SPECS` (`char_woman.fw = 212`, `char_monk.fw = 212`, `char_nun.fw = 212`) and re-running the script. This will produce strips at `1696 × 300` px and portraits at `212 × 300` px with 0px seam bleed, 0px out-of-bounds, and continuous floor contact on row 299.

---

## 5. Verification Method

To independently verify the blueprint recommendations:

1. **Verify Root Cause**:
   ```powershell
   node scripts/test_character_drift.mjs
   ```
   Observe the 84px seam bleed and 96px out-of-bounds report for `char_woman`.

2. **Inspect Detailed Blueprint**:
   Review `character_fix_blueprint.md` in `.agents/teamwork/teamwork_explorer_fix_1/character_fix_blueprint.md`.

3. **Invalidation Condition**:
   After `worker_visual_1` applies the blueprint, re-running `node scripts/test_character_drift.mjs` must report `Dimension Match: PASS`, `Max Seam Bleed: 0px`, and `Max Out-Of-Bounds: 0px` across all 7 character types.
