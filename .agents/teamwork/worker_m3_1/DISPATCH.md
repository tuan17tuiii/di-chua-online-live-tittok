# Dispatch Assignment: Milestone 3 — Web Admin Control Dashboard (`control` client) (R3)

## Target Agent
- Name: worker_m3_1
- Archetype: teamwork_worker
- Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_m3_1

## Mandatory References
- User Request: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md (MUST READ FIRST)
- Spec Miner 3 Technical Blueprint: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_spec_miner_impl_3\handoff.md
- WebSocket Specification: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\WEBSOCKET_SPEC.md (Client-to-Server Control commands)
- Architecture Breakdown: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ARCHITECTURE.md (§5 Admin Dashboard)

## Exclusive Write Ownership
You own and must implement the following files exclusively:
- `public/control.html`
- `public/css/control.css`
- `public/js/ControlApp.js`

## Detailed Objectives
1. Implement the complete Web Admin Control Dashboard exactly according to `teamwork_spec_miner_impl_3/handoff.md`:
   - Connection to WebSocket at `ws://127.0.0.1:3000/ws?role=control` with automatic reconnection.
   - Module 1 (Connection Hub): Target stream input `@uniqueId`, connect/disconnect controls, live stream telemetry (online viewers, likes, uptime), 9:16 OBS preview launcher popup.
   - Module 2 (Interactive Seating Matrix): Visual 2.5D floor perspective grid for 24/36/64/100 slots, context menu/modal on clicking any slot (Kick User, Pin VIP, Lock/Unlock Slot, Force Skin), capacity mode switcher (auto vs fixed), Clear Hall button, and rapid fill sample viewers.
   - Module 3 (Live Audio Mixing Console): BGM volume slider & toggle, Mõ metronome cadence slider (20-120 BPM) & toggle, manual Mõ strike button, Great Bell strike button, Edge-TTS voice customizer (Nam Minh / Hoài My, pitch, rate), and Emergency announcement broadcast (`cmd: "say"`).
   - Module 4 (Simulation Studio): Simulated chat injection form, simulated gift injection (tiers 1-3: rose 1 xu, lotus lamp 30 xu, golden bell 199 xu, grand ritual), autonomous bot engine controller (toggle on/off, bot count slider 1-100, pace selector slow/mid/fast).
   - Module 5 (Audit Logger): Realtime scrolling buffer of recent 300 server logs, category filter buttons (all, gift, chat, error, warning), and distinct color coding.
2. Ensure full conformance with all 16 `ctl` command schemas in `WEBSOCKET_SPEC.md`.
3. Provide an intuitive, responsive Zen Brown / Gold UI theme (`#241915`, `#382721`, `#f59e0b`) suitable for streamer operations.
4. Write a comprehensive completion report in `handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.


## 2026-11-01T20:14:17Z
[Message] timestamp=2026-11-01T20:14:17Z sender=af1b3904-b4bd-4e2f-b5dd-3bf5a39183a2 priority=MESSAGE_PRIORITY_HIGH content=You are worker_m3_1.
Your working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_m3_1

Mandatory initial step: Read c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Read your instructions in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_m3_1\DISPATCH.md.
Also inspect the technical blueprint in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_spec_miner_impl_3\handoff.md, as well as WEBSOCKET_SPEC.md and ARCHITECTURE.md (§5).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Implement Milestone 3: Web Admin Control Dashboard (`role=control` client) (R3).
Write all files under your exclusive ownership:
- public/control.html
- public/css/control.css
- public/js/ControlApp.js

Ensure full implementation of all 5 modules:
1. Room Connection Hub (connect, disconnect, live telemetry, 9:16 popup launcher).
2. Interactive Seating Matrix (visual 2.5D floor grid 24/36/64/100 slots, context menu with kick, pin VIP, lock, force skin, fill, clear).
3. Live Audio Mixing Console (BGM fader, mõ metronome BPM slider 20-120 with cadence reset, manual bell & mõ triggers, Edge-TTS customizer, emergency announcement `say`).
4. Simulation Studio (simulated chat, simulated gift tiers 1-3, autonomous bot engine controller).
5. Audit Logger (300-entry scrolling buffer, category filters, color coding).
Adhere strictly to all 16 `ctl` WebSocket schemas in WEBSOCKET_SPEC.md.

Write your completion report in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_m3_1\handoff.md.
When finished, send a message to the orchestrator summarizing your implementation.
