# Dispatch Assignment: E2E Testing Track — Automated 4-Tier Test Suite & Test Runner (Tiers 1-4)

## Target Agent
- Name: test_writer_1
- Archetype: teamwork_test_writer
- Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\test_writer_1

## Mandatory References
- User Request: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md (MUST READ FIRST)
- Spec Miner 3 Technical Blueprint: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_spec_miner_impl_3\handoff.md
- WebSocket Specification: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\WEBSOCKET_SPEC.md
- Architecture Breakdown: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ARCHITECTURE.md

## Exclusive Write Ownership
You own and must implement the following files exclusively:
- `test/helpers/MockWsClient.mjs`
- `test/tier1_feature_coverage.test.mjs`
- `test/tier2_boundary.test.mjs`
- `test/tier3_cross_feature.test.mjs`
- `test/tier4_workload.test.mjs`
- `test/run_all_e2e.mjs`
- `TEST_INFRA.md`
- `TEST_READY.md`

## Detailed Objectives
1. Implement the headless WebSocket test harness `test/helpers/MockWsClient.mjs` using native `ws` client with role simulation (`role=overlay` and `role=control`), event wait helpers, snapshot assertion, and timeout handling.
2. Implement all 4 test tiers using native `node:test` and `node:assert/strict`:
   - `test/tier1_feature_coverage.test.mjs`: TC-101 to TC-113 covering server bootstrap, role separation, snapshot <50ms, moderation filter, SSML escaping, streak coalescing, seating allocation, LRU eviction, VIP preservation, 90s prayer cache, audio fallbacks, overlay 60fps rendering, admin control dispatch.
   - `test/tier2_boundary.test.mjs`: TC-201 to TC-208 covering empty hall, capacity boundaries (24, 36, 64, 100), 100% donor saturation deadlock resolution, rapid-fire comment spam, combo timeout, extreme BPM clamp [20, 120], and TTS queue overflow limit.
   - `test/tier3_cross_feature.test.mjs`: TC-301 to TC-307 covering admin kick during combo gift, gift interrupting chant, TTS announcement + bell ducking (-14dB), bot flooding during real user join, auto-capacity expansion, and sacred phrase NLP protection.
   - `test/tier4_workload.test.mjs`: TC-401 to TC-404 covering live simulation, 100-gift storm, network backoff recovery, and memory leak benchmark (<120MB heap).
3. Create `test/run_all_e2e.mjs` that runs all test suites sequentially and reports summary statistics.
4. Create `TEST_INFRA.md` detailing the test architecture and coverage matrix.
5. Create `TEST_READY.md` summarizing the test runner command and tier counts once all test files are written and verified.
6. Write a comprehensive completion report in `handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All test cases must be genuine and execute against the real server and protocol contracts. DO NOT create dummy/facade implementations or pass-through stubs. A teamwork_auditor will independently verify your work.


## 2026-11-01T20:14:42Z
You are test_writer_1.
Your working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\test_writer_1

Mandatory initial step: Read c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Read your instructions in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\test_writer_1\DISPATCH.md.
Also inspect the technical blueprint in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_spec_miner_impl_3\handoff.md, as well as WEBSOCKET_SPEC.md and ARCHITECTURE.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Implement the E2E Testing Track:
1. Write `test/helpers/MockWsClient.mjs` (headless WebSocket client with role support and promise-based event assertions).
2. Write `test/tier1_feature_coverage.test.mjs` (TC-101 to TC-113).
3. Write `test/tier2_boundary.test.mjs` (TC-201 to TC-208).
4. Write `test/tier3_cross_feature.test.mjs` (TC-301 to TC-307).
5. Write `test/tier4_workload.test.mjs` (TC-401 to TC-404).
6. Write `test/run_all_e2e.mjs`.
7. Write `TEST_INFRA.md` and `TEST_READY.md`.

Write your completion report in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\test_writer_1\handoff.md.
When finished, send a message to the orchestrator summarizing your test suite.
