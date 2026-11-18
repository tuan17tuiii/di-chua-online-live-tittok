# DISPATCH

## 2026-11-01T16:18:56Z
You are Worker 2 (teamwork_worker).
Your working directory is: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_2
Original request file path: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md
YOU MUST READ ORIGINAL_REQUEST.md BEFORE STARTING WORK.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context:
In Gate Iteration 1, Reviewers approved the architecture and the Forensic Auditor verified clean integrity, but Challengers 1 and 2 discovered critical empirical defects in `manifest.json`, `ARCHITECTURE.md`, `WEBSOCKET_SPEC.md`, `ROADMAP.md`, and `ASSET_MANIFEST.md`.

Your Mission:
Remediate all 9 defects identified by Challenger 1, Challenger 2, and Reviewer 2 across the project deliverables:

1. `manifest.json`:
   - Fix 6 recursive self-referential fallbacks (`bg_main_hall`, `altar_table_main`, `statue_shakyamuni`, `altar_censer_bronze`, `altar_candle_stand`, `cushion_lotus_mat`): set `fallbackId: null` and `fallbackSynthetic: true`.
   - Provide explicit fallback targets for all 16 assets currently lacking fallbacks (characters fallback to `char_man`, VFX fallback to procedural particles, SFX fallback to Web Audio synthetic oscillators).
   - Ensure `category` property is present across all 29 assets.
   - Harmonize `bowingFrames`.
2. `assets/asset-manifest.schema.json`:
   - Create this missing JSON Schema (Draft 2020-12) at `c:\Users\tn018\Desktop\Person\media\tiktok\app-live\assets\asset-manifest.schema.json`.
3. `ARCHITECTURE.md`:
   - Seating Eviction Deadlock: Update algorithm to handle 100% donor saturation (when `nonDonors.length === 0`, evict donor with lowest coins and longest inactivity > 15 minutes).
   - 2.5D Perspective Projection: Enforce `cols % 2 === 0` (even columns), add `marginRatio = 0.12` to keep outer seats within the temple floor tile boundary, specify Painter's Algorithm ($Y$-sorted ascending) and sprite anchor `(centerX, bottomY)` to prevent depth inversion.
   - Exponential Backoff Jitter: Fix formula so jitter is applied within the max delay clamp: `delay = Math.min(maxDelay, baseDelay * Math.pow(1.5, attempt) * (1 + (Math.random() * 0.4 - 0.2)))` ensuring delay <= 30.0s.
   - Skin NLP: Exclude sacred phrases ("Nam mô Phật", "Phật bà", "A Di Đà Phật") from falsely triggering "nam" or "bà" skin changes.
4. `WEBSOCKET_SPEC.md`:
   - In `tts` schema: Make `dataUri: string` primary (for in-memory WebSocket streaming), `url?: string` optional.
   - In `gift` schema: Include `repeatEnd: boolean`, `comboCount: number`, `isCombo: boolean`.
   - Standardize `bell` (`isGreatBell?: boolean`) and `mo` command across client and server.
5. `ROADMAP.md` & `ASSET_MANIFEST.md`:
   - Clarify Bowing Animation: Default is procedural cosine compression on Canvas 2D on the seated frame (Frame 7), with `bowingFrames` documented as alternative spritesheet frames.
   - Update 4-Step User Integration Guide: Emphasize convention-based drop-in folders (`assets/backgrounds/`, `assets/altar/`, `assets/audio/`) that the server automatically scans and hot-reloads, eliminating the hazard of users manually editing raw JSON in Windows Notepad.
   - Add OBS Audio Monitoring instructions (Monitor and Output vs Monitor Off) and router alias `/live/` support in `ROADMAP.md`.
   - Harmonize character frame height specifications.
6. Verification:
   Run the test scripts:
   - `node scripts/verify_assets.mjs`
   - `node .agents/teamwork/teamwork_challenger_1/test_perspective_math.cjs`
   - `node .agents/teamwork/teamwork_challenger_1/test_stress_harness.cjs`
   - `node .agents/teamwork/teamwork_challenger_1/test_skin_nlp.cjs`
   Ensure all tests pass cleanly.

Deliverables:
- Update target files.
- Write your comprehensive handoff report to `c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_2\handoff.md`.
- Notify orchestrator via send_message when complete.
