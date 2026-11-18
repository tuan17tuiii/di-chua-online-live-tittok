# Dispatch Assignment: Iteration 2 Remediation Explorer (teamwork_explorer_r2_1)

## Target Agent
- Name: teamwork_explorer_r2_1
- Archetype: teamwork_explorer
- Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_r2_1

## Mandatory References
- User Request: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md (MUST READ FIRST)
- Reviewer 1 Gate Report: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_reviewer_impl_1\handoff.md
- Gate Status: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\orchestrator_1\GATE_STATUS.md
- Source code in workspace: `src/moderation/ProfanityFilter.mjs`, `src/ingestion/TikTokLiveAdapter.mjs`, `src/state/StateManager.mjs`, `test/tier1_feature_coverage.test.mjs`, `test/tier3_cross_feature.test.mjs`

## Objectives
1. Read the Reviewer 1 report and examine all 4 defects:
   - Defect 1: ProfanityFilter word boundary `\b` fails on `đ` (e.g. `đm`, `địt`, `đéo`, `đụ má` return `false`).
   - Defect 2: TikTokLiveAdapter `onWatchdogTimeout` calls `this.disconnect()`, clearing `this.shouldStayConnected` and breaking auto-reconnect.
   - Defect 3: StateManager unseated viewer defaulting to `slotIndex: 0` instead of `-1` or omitting.
   - Defect 4: Self-certifying tautological tests in `test/tier1_feature_coverage.test.mjs` (TC-111, TC-112) and `test/tier3_cross_feature.test.mjs` (TC-303).
2. Propose concrete, exact, copy-pasteable code fixes for each of the 4 defects.
3. Formulate the replacement test code for TC-111, TC-112, and TC-303 ensuring they validate actual application files, schemas, and live contracts without any self-asserting constants.
4. Deliver your recommendations in `handoff.md`.


## 2026-11-01T20:46:17Z
You are teamwork_explorer_r2_1.
Your working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_r2_1

Mandatory initial step: Read c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Read your instructions in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_r2_1\DISPATCH.md.
Also inspect c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_reviewer_impl_1\handoff.md.

Your mission:
Investigate and formulate the exact remediation strategy for the 4 defects identified in Gate 1:
1. `ProfanityFilter.mjs`: Replace ASCII `\b` boundary with Unicode-aware boundaries so words starting with `đ` (`đm`, `địt`, `đéo`, `đụ má`) are strictly detected.
2. `TikTokLiveAdapter.mjs`: Fix `onWatchdogTimeout` so it disconnects the underlying connection without zeroing `shouldStayConnected`, preserving auto-reconnection.
3. `StateManager.mjs`: Fix unseated viewers defaulting to `slotIndex: 0` by using `-1` (so unseated viewers are not visually tied to Seat #0).
4. `test/tier1_feature_coverage.test.mjs` & `test/tier3_cross_feature.test.mjs`: Replace tautological assertions in TC-111, TC-112, and TC-303 with genuine tests asserting against real application files, manifest schemas, and live broadcasts.

Write your detailed remediation recommendations to c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_r2_1\handoff.md.
When finished, send a message to the orchestrator summarizing your fix recommendations.
