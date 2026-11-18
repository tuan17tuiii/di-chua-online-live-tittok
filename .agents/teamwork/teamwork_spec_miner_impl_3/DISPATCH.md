# Dispatch Assignment: Admin Dashboard, Simulation Studio & E2E Validation Spec Mining (R3 & Acceptance Criteria)

## Target Agent
- Name: teamwork_spec_miner_impl_3
- Archetype: teamwork_spec_miner
- Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_spec_miner_impl_3

## Mandatory References
- User Request: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md (MUST READ FIRST)
- Architecture Breakdown: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ARCHITECTURE.md (§5)
- WebSocket Protocol: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\WEBSOCKET_SPEC.md (Client-to-Server Control commands)
- Roadmap & Technical Plan: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ROADMAP.md
- Project Layout: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\PROJECT.md

## Objectives
1. Read ORIGINAL_REQUEST.md and examine specifications for R3 (Web Admin Dashboard `control` client, seating matrix visualization with interactive actions: kick, pin VIP, lock; system control panel: mõ BPM metronome, thresholds, manual triggers for temple bell, mõ, ritual VFX; Simulation studio: injecting simulated TikTok live events comments, likes, gifts, bulk bots).
2. Detail the exact UI structure, module design (modular architecture / reactive state), WebSocket client-to-server command payloads (`{t: "ctl", cmd: "..."}`), and server response handling.
3. Formulate the comprehensive 4-Tier E2E test plan (Category-Partition, Boundary & Corner, Cross-Feature, Real-World Workload) and automated test harnesses required for acceptance criteria.
4. Produce a detailed handoff report in `handoff.md` with exact specifications, UI contracts, and test cases.

## 2026-11-01T20:03:37Z
Sender: af1b3904-b4bd-4e2f-b5dd-3bf5a39183a2
Priority: MESSAGE_PRIORITY_HIGH
Content:
You are teamwork_spec_miner_impl_3.
Your working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_spec_miner_impl_3
Mandatory initial step: Read c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Read your instructions in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_spec_miner_impl_3\DISPATCH.md.
Also inspect ARCHITECTURE.md (§5), WEBSOCKET_SPEC.md, ROADMAP.md, and PROJECT.md in c:\Users\tn018\Desktop\Person\media\tiktok\app-live.

Your mission:
Investigate requirements and technical specifications for R3 (Web Admin Dashboard `control` client) and Acceptance Criteria / E2E Verification Strategy.
Provide a complete specification and testing blueprint covering:
1. Admin Dashboard architecture: Layout, state management, module organization (Room Connection Hub, Interactive Seating Matrix with kick/VIP pin/lock, Live Audio Mixer with mõ BPM slider & manual bell/mõ triggers, Simulation Studio with simulated TikTok events and bot injection, Audit Logger).
2. Exact WebSocket Client-to-Server protocol specification: role=control authentication, command payload schemas (`{t: "ctl", cmd: ...}`), server response envelopes, and error handling.
3. 4-Tier E2E Test Suite design (Tiers 1-4) covering all features in PROJECT.md:
   - Tier 1: Feature Coverage (server start, role separation, snapshot <50ms, moderation, seating allocation, evictions, VIP preservation, audio fallbacks, overlay rendering, admin controls).
   - Tier 2: Boundary & Corner Cases (empty room, full room 24/100 slots, rapid-fire comments, combo gift timeout, extreme BPM, non-donor evictions under pressure).
   - Tier 3: Cross-Feature Interactions (admin kick during combo gift, TTS announcement during bell/mõ with audio ducking, simulated bot flooding while real user joins).
   - Tier 4: Real-World Workload Scenarios (continuous live simulation with comments, gifts, likes, chants).
4. Concrete test runner scripts and automation plan for automated headless and E2E verification.

Write your detailed findings to c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_spec_miner_impl_3\handoff.md.
When finished, send a message to the orchestrator summarizing your findings and referencing the handoff file.
