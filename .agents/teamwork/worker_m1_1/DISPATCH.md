# Dispatch Assignment: Milestone 1 — Node.js Backend Server & State Manager (R1 & R4 Backend)

## Target Agent
- Name: worker_m1_1
- Archetype: teamwork_worker
- Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_m1_1

## Mandatory References
- User Request: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md (MUST READ FIRST)
- Explorer 1 Technical Blueprint: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_impl_1\handoff.md
- WebSocket Specification: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\WEBSOCKET_SPEC.md
- Architecture Breakdown: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ARCHITECTURE.md

## Exclusive Write Ownership
You own and must implement the following files exclusively:
- `package.json`
- `.env.example`
- `src/config.mjs`
- `src/server.mjs`
- `src/ingestion/TikTokLiveAdapter.mjs`
- `src/ingestion/MockBotSimulator.mjs`
- `src/ingestion/AdminManualAdapter.mjs`
- `src/ingestion/ReconnectionEngine.mjs`
- `src/moderation/EventNormalizer.mjs`
- `src/moderation/ProfanityFilter.mjs`
- `src/moderation/GiftStreakCoalescer.mjs`
- `src/moderation/Sanitizer.mjs`
- `src/state/StateManager.mjs`
- `src/state/SeatingEngine.mjs`
- `src/state/PrayerCache.mjs`
- `src/state/MeritLeaderboard.mjs`
- `src/state/LiturgicalScheduler.mjs`
- `src/audio/TtsEngine.mjs`
- `src/audio/AudioPriorityQueue.mjs`
- `src/broadcaster/Broadcaster.mjs`
- `src/broadcaster/MessageSchemas.mjs`
- `test/unit_backend.test.mjs` (unit tests for backend)

## Detailed Objectives
1. Implement `package.json` (with `"type": "module"`, dependencies: `ws`, `express`, `dotenv`, `msedge-tts`, `tiktok-live-connector`, `hpagent`) and `.env.example`.
2. Run `npm install` via terminal command to install all dependencies cleanly.
3. Implement all modules under `src/` exactly according to the technical blueprint in `teamwork_explorer_impl_1/handoff.md`:
   - Express static file hosting in `server.mjs` serving both `/` and `/live/` for OBS CEF compatibility, upgrading `/ws` to native `ws`.
   - Native `ws` Broadcaster with role segregation (`role=overlay` read-only vs `role=control`), rate limiting (10 cmd/s for control), error codes (4400, 4401, 4403, 4429), and snapshot-on-connect within 50ms.
   - Content moderation: Vietnamese profanity blacklist filter, string sanitizer with SSML escaping (`<>&'"`), gift streak coalescer with 1.5s debounce and `repeatEnd` handling, event normalizer with skin NLP.
   - Core seating state manager: 24/36/64/100 slots, center-outward allocation math, longest-quiet non-donor eviction (`coins === 0`), 100% donor saturation deadlock resolution (>15 min idle rule), VIP protection, 90s prayer cache, merit leaderboard Top 10, liturgical scheduler (mo metronome 20-120 BPM with cadence reset).
   - Audio/TTS pipeline: `TtsEngine` in-memory streaming using `msedge-tts` to Base64 Data URI over WebSocket (`data:audio/mp3;base64,...`), MD5 cache, and 3-tier priority queue.
   - Ingestion: `MockBotSimulator` (1-100 bots, slow/mid/fast, 60% chant, 30% like, 10% gift) and `TikTokLiveAdapter` with graceful offline fallback.
4. Create a comprehensive unit test suite `test/unit_backend.test.mjs` testing all core classes and methods using `node --test`.
5. Run the tests and verify that all unit tests pass with exit code 0.
6. Write a comprehensive completion report in `handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.


## 2026-11-01T20:13:18Z
You are worker_m1_1.
Your working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_m1_1

Mandatory initial step: Read c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Read your instructions in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_m1_1\DISPATCH.md.
Also inspect the technical blueprint in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_impl_1\handoff.md, as well as WEBSOCKET_SPEC.md and ARCHITECTURE.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Implement Milestone 1: Node.js Backend Server & State Manager (R1 & R4 Backend).
Write all files under your exclusive ownership:
- package.json & .env.example
- src/config.mjs & src/server.mjs
- src/ingestion/ (TikTokLiveAdapter.mjs, MockBotSimulator.mjs, AdminManualAdapter.mjs, ReconnectionEngine.mjs)
- src/moderation/ (EventNormalizer.mjs, ProfanityFilter.mjs, GiftStreakCoalescer.mjs, Sanitizer.mjs)
- src/state/ (StateManager.mjs, SeatingEngine.mjs, PrayerCache.mjs, MeritLeaderboard.mjs, LiturgicalScheduler.mjs)
- src/audio/ (TtsEngine.mjs, AudioPriorityQueue.mjs)
- src/broadcaster/ (Broadcaster.mjs, MessageSchemas.mjs)
- test/unit_backend.test.mjs

Execute `npm install` and run `npm test` (or `node --test test/unit_backend.test.mjs`). Verify all tests pass cleanly.
Write your completion report in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_m1_1\handoff.md with all build/test results documented.
When finished, send a message to the orchestrator summarizing your implementation and test results.
