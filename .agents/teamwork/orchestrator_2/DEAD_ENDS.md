# Dead Ends Log

| Iteration | Approach Tried | Why It Failed | Files Touched |
|:---:|---|---|---|
| Iteration 1 | Rendering visual assets with ad-hoc dimensions (`anim_woman.png` at 1600x300, `anim_monk.png` at 1720x300, `anim_nun.png` at 1640x300, statues at 420x680) instead of strict ground-truth dimensions in `manifest.json` | Failed with INTEGRITY VIOLATION, REJECT, and REQUEST_CHANGES. Caused 96px out-of-bounds canvas slicing and seam bleeding in `CharacterRenderer.js` and +21.4% aspect ratio distortion on Buddha statues in `CanvasFloorEngine.js`. `verify_assets.mjs` was self-certifying by only checking file existence. | `assets/characters/`, `assets/altar/`, `scripts/verify_assets.mjs` |
