# Dispatch Assignment: Backend, State Manager & Ingestion Exploration (R1 & R4)

## Target Agent
- Name: teamwork_explorer_impl_1
- Archetype: teamwork_explorer
- Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_impl_1

## Mandatory References
- User Request: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md (MUST READ FIRST)
- Architecture Breakdown: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ARCHITECTURE.md
- WebSocket Protocol: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\WEBSOCKET_SPEC.md
- Roadmap & Technical Plan: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ROADMAP.md
- Project Overview & Layout: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\PROJECT.md

## Objectives
1. Read ORIGINAL_REQUEST.md and examine specifications for R1 (Backend Server, Event Ingestion, Mock Event Simulator, WebSocket broadcaster with role segregation `role=overlay` vs `role=control`, Snapshot on connect within 50ms, Moderation layer with Vietnamese profanity filter, string sanitizer/SSML escaper, rate limiter, gift streak coalescer, Seating state manager with 2.5D slots 24-100, center-outward allocation, longest-quiet non-donor eviction, VIP slot protection, 90s prayer cache) and R4 Backend Audio (msedge-tts buffer streaming, audio priority queue).
2. Detail the exact module breakdown, class/function signatures, dependencies needed for `package.json`, environment variables, and state data structures.
3. Verify how MockBotSimulator and TikTokLiveConnector structure can run smoothly locally without requiring live TikTok credentials.


## 2026-11-01T20:03:24Z
You are teamwork_explorer_impl_1.
Your working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_impl_1
Mandatory initial step: Read c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Read your instructions in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_impl_1\DISPATCH.md.
Also inspect ARCHITECTURE.md, WEBSOCKET_SPEC.md, ROADMAP.md, and PROJECT.md in c:\Users\tn018\Desktop\Person\media\tiktok\app-live.

Your mission:
Investigate requirements and technical specifications for R1 (Node.js Backend Server & State Manager) and R4 Backend Audio (TTS pipeline & Priority Queue).
Provide a complete, comprehensive implementation blueprint covering:
1. Module and file structure under src/ (server.mjs, ingestion/, moderation/, state/, audio/, broadcaster/).
2. Dependency manifest for package.json (including ws, dotenv, msedge-tts, etc.) and npm scripts.
3. Class signatures, methods, and data structures for StateManager, SeatingEngine, PrayerCache, MeritLeaderboard, LiturgicalScheduler, ProfanityFilter, GiftStreakCoalescer, EventNormalizer, Broadcaster.
4. Local simulation design for MockBotSimulator and TikTokLiveAdapter structure without requiring active stream credentials.
5. Exact error handling, edge cases, and performance criteria (<50ms snapshot).

Write your detailed findings to c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_impl_1\handoff.md.
When finished, send a message to the orchestrator summarizing your findings and referencing the handoff file.

