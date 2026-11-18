# Dispatch Assignment: Iteration 2 Remediation Worker (worker_r2_1)

## Target Agent
- Name: worker_r2_1
- Archetype: teamwork_worker
- Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_r2_1

## Mandatory References
- User Request: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md (MUST READ FIRST)
- Remediation Blueprint: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_r2_1\handoff.md
- Reviewer 1 Report: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_reviewer_impl_1\handoff.md

## Exclusive Write Ownership
You own and must modify:
- `src/moderation/ProfanityFilter.mjs`
- `src/ingestion/TikTokLiveAdapter.mjs`
- `src/state/StateManager.mjs`
- `public/js/OverlayApp.js`
- `test/tier1_feature_coverage.test.mjs`
- `test/tier3_cross_feature.test.mjs`
- `test/unit_backend.test.mjs`

## Detailed Remediation Tasks
1. **ProfanityFilter Diacritics Regex Fix (`src/moderation/ProfanityFilter.mjs`)**:
   - Replace ASCII `\b` boundary with Unicode-aware lookaround boundaries `(?<![\p{L}\p{N}])` and `(?![\p{L}\p{N}])` with `/iu` flag, exactly as specified in `teamwork_explorer_r2_1/handoff.md` Section 4.
   - Verify that `ProfanityFilter.isProfane('đm')`, `ProfanityFilter.isProfane('địt')`, `ProfanityFilter.isProfane('đéo')`, `ProfanityFilter.isProfane('đụ má')`, `ProfanityFilter.isProfane('âm vật')` all return `true`, and `ProfanityFilter.isProfane('đêm')` returns `false`.
2. **TikTokLiveAdapter Watchdog Auto-Reconnection (`src/ingestion/TikTokLiveAdapter.mjs`)**:
   - Fix `onWatchdogTimeout` so it disconnects the existing client without zeroing `shouldStayConnected`, enabling `scheduleReconnect()` to execute.
3. **StateManager Unseated Viewer Slot Attribution (`src/state/StateManager.mjs`)**:
   - Update `slotIndex: viewer ? viewer.slotIndex : -1` so unseated viewers are not attached to Seat #0.
4. **Replacement of Tautological Test Cases (`test/tier1_feature_coverage.test.mjs` and `test/tier3_cross_feature.test.mjs`)**:
   - Replace TC-111 with genuine assertions verifying actual synthetic audio fallback parameters against `manifest.json` and `public/js/WebAudioEngine.js`.
   - Replace TC-112 with genuine assertions inspecting `public/overlay.html` and `public/css/overlay.css` verifying resolution, canvas dimensions, viewport meta, and HUD layers.
   - Replace TC-303 with genuine assertions testing that server and broadcaster dispatch valid TTS and Great Bell events concurrently.
5. **Execute All Test Suites**:
   - Run `node --test test/unit_backend.test.mjs`.
   - Run `node test/run_all_e2e.mjs`.
   - Run `node scripts/verify_assets.mjs`.
   - Ensure 100% pass across all tests with zero failures.
6. Write completion report in `handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.


## 2026-11-01T20:55:05Z
You are assigned as worker_r2_1 (Iteration 2 Remediation Worker).

Your working directory is:
c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_r2_1

Before starting any work, you MUST read the original user request:
c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md

Next, read your detailed task dispatch assignment:
c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_r2_1\DISPATCH.md

And read the exact remediation blueprint and code diff specifications produced by the Explorer:
c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_r2_1\handoff.md

## Exclusive Write Ownership
You own and must modify:
- `src/moderation/ProfanityFilter.mjs`
- `src/ingestion/TikTokLiveAdapter.mjs`
- `src/state/StateManager.mjs`
- `public/js/OverlayApp.js`
- `test/tier1_feature_coverage.test.mjs`
- `test/tier3_cross_feature.test.mjs`
- `test/unit_backend.test.mjs`

## Concrete Tasks to Implement (from Explorer handoff Section 4):
1. `src/moderation/ProfanityFilter.mjs`:
   Replace ASCII \b word boundaries with Unicode-aware lookarounds `(?<![\p{L}\p{N}])` and `(?![\p{L}\p{N}])` with `/iu` flag.
2. `src/ingestion/TikTokLiveAdapter.mjs`:
   In `onWatchdogTimeout`, clean up listeners, disconnect underlying connection without clearing `shouldStayConnected = false`, and trigger `this.reconnection.scheduleReconnect()`.
3. `src/state/StateManager.mjs`:
   Update all 4 event broadcasts (chat, like, gift streak, gift finalized) so unseated viewers use `slotIndex: viewer ? viewer.slotIndex : -1` (instead of fallback 0).
   Ensure `public/js/OverlayApp.js` only triggers chat bubbles/particles if `slotIndex >= 0`.
4. `test/tier1_feature_coverage.test.mjs` and `test/tier3_cross_feature.test.mjs`:
   Replace dummy literal assertions in TC-111, TC-112, and TC-303 with genuine contract/manifest/CSS/HTML/WebSocket assertions as specified in Explorer handoff Section 4.
5. In `test/unit_backend.test.mjs`, augment ProfanityFilter tests with explicit assertions for `đm`, `địt`, `đéo`, `đụ má`, `âm vật`.

## Mandatory Tests & Verification
Run the following verification commands and record outputs in your handoff report:
1. `node -e "const { ProfanityFilter } = await import('./src/moderation/ProfanityFilter.mjs'); console.log('đm:', ProfanityFilter.isProfane('đm')); console.log('địt:', ProfanityFilter.isProfane('địt')); console.log('đéo:', ProfanityFilter.isProfane('đéo')); console.log('đụ má:', ProfanityFilter.isProfane('đụ má')); console.log('âm vật:', ProfanityFilter.isProfane('âm vật')); console.log('đêm:', ProfanityFilter.isProfane('đêm'));"`
2. `node --test test/unit_backend.test.mjs`
3. `node test/run_all_e2e.mjs`
4. `node scripts/verify_assets.mjs`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
