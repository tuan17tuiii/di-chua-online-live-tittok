## 2026-11-02T04:53:53Z
You are Remediation Implementation Worker (Agent ID: worker_remediation_1).
Your working directory is: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_remediation_1\
Your parent is orchestrator_2 (Conversation ID: 4657945e-312a-4b1d-8783-863a86deb269).

MANDATORY FIRST STEP:
Read the authoritative user request at:
c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You EXCLUSIVELY own:
- c:\Users\tn018\Desktop\Person\media\tiktok\app-live\assets\backgrounds\
- c:\Users\tn018\Desktop\Person\media\tiktok\app-live\assets\altar\
- c:\Users\tn018\Desktop\Person\media\tiktok\app-live\assets\characters\
- c:\Users\tn018\Desktop\Person\media\tiktok\app-live\assets\fx\
- c:\Users\tn018\Desktop\Person\media\tiktok\app-live\scripts\verify_assets.mjs
(Audio assets in assets/audio/ are already verified 100% compliant; do not overwrite them).

REFERENCE BLUEPRINTS & EVIDENCE (READ CAREFULLY):
- Explorer Fix 1 Blueprint (Character Spritesheets): c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_fix_1\character_fix_blueprint.md
- Explorer Fix 2 Blueprint (Statues, Altar, Backgrounds): c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_fix_2\altar_and_bg_fix_blueprint.md
- Explorer Fix 3 Blueprint (Verification Harness Upgrade): c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_fix_3\harness_fix_blueprint.md
- Auditor Evidence Report: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\auditor_asset_1\audit_report.md
- Scope Document: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\orchestrator_2\SCOPE.md

REMEDIATION TASKS:
1. Fix Character Spritesheets & Portraits:
   - Implement the drop-in modifications from Explorer Fix 1's blueprint (`character_fix_blueprint.md`).
   - Set `fw = 212` for `char_woman`, `char_monk`, and `char_nun`.
   - Regenerate `c_woman.png` (212x300), `anim_woman.png` (1696x300, 8 frames of 212x300).
   - Regenerate `c_monk.png` (212x300), `anim_monk.png` (1696x300, 8 frames of 212x300).
   - Regenerate `c_nun.png` (212x300), `anim_nun.png` (1696x300, 8 frames of 212x300).
   - Ensure bottom floor contact (`y = frameHeight - 1`) across all 8 discrete animation frames.
2. Fix Altar Props, Statues & Background Compression:
   - Implement the drop-in modifications from Explorer Fix 2's blueprint (`altar_and_bg_fix_blueprint.md`).
   - Regenerate `statue_shakyamuni.png` (600x800 PNG RGBA with clean alpha).
   - Regenerate `statue_amitabha.png` (600x800 PNG RGBA with clean alpha).
   - Regenerate `statue_avalokiteshvara.png` (550x820 PNG RGBA with clean alpha).
   - Regenerate `censer_bronze.png` (280x240 PNG RGBA with clean alpha).
   - Regenerate `candle_stand.png` (150x350 PNG RGBA with clean alpha).
   - Regenerate `meditation_cushion.png` (160x90 PNG RGBA with clean alpha).
   - Re-compress `zen_garden.jpg` using PIL (`quality=84, optimize=True, progressive=True`) to achieve size < 550 KB while strictly maintaining 1080x1920 JPG resolution.
3. Upgrade Verification Harness (`scripts/verify_assets.mjs`):
   - Replace `scripts/verify_assets.mjs` with the upgraded, zero-dependency implementation from Explorer Fix 3's blueprint (`harness_fix_blueprint.md`).
   - Ensure it checks all 36 physical files on disk, inspects binary PNG `IHDR` chunks and JPEG `SOF0`/`SOF2` chunks, asserts exact ground-truth pixel dimensions, and exits with code 1 if any defect is detected.

EXECUTION & VERIFICATION REQUIREMENTS:
Run all the following validation suites and document their exact outputs:
1. `node scripts/verify_assets.mjs` (must pass all 36 files with exit code 0)
2. `node scripts/empirical_asset_test.mjs` (must pass 27/27 visual assets with exit code 0)
3. `node scripts/test_character_drift.mjs` (must report 0px seam bleed, 0px out-of-bounds, exit code 0)
4. `node scripts/verify_audio_empirical.mjs` (must pass 20/20 checks with exit code 0)
5. `npm test` and `node scripts/test_overlay_m2.mjs` (must pass 100%)

Deliverables:
- Write changes.md and handoff.md in your working directory (.agents/teamwork/worker_remediation_1/).
- Send a completion message to parent (4657945e-312a-4b1d-8783-863a86deb269) via send_message.
