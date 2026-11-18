# Dispatch Assignment: Gate Challenger 1 — Backend & Protocol Adversarial Stress Testing

## Target Agent
- Name: teamwork_challenger_impl_1
- Archetype: teamwork_challenger
- Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_challenger_impl_1

## Mandatory References
- User Request: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md (MUST READ FIRST)
- Architecture Breakdown: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ARCHITECTURE.md
- WebSocket Protocol: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\WEBSOCKET_SPEC.md
- Test Ready Notification: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\TEST_READY.md

## Objectives
1. Read ORIGINAL_REQUEST.md and empirically challenge the backend and WebSocket broadcaster.
2. Formulate and execute empirical adversarial stress test scripts:
   - High-throughput client connections: rapid connect/disconnect, unauthorized overlay outbound messages (confirm code 4403).
   - Snapshot timing under concurrent load: verify initial snapshot latency remains <50ms.
   - Gift streak coalescing stress: rapid-fire combos (50-100 gifts in <1s) to confirm zero lost coins and single finalized announcement.
   - Seating eviction stress: rapidly fill room to 100 capacity with 100% donors, test edge-case eviction logic and VIP immunity.
   - Token-bucket rate limiter: test flood of 50 `ctl` commands/sec (confirm code 4429).
3. Document empirical metrics, commands, and results.
4. Deliver your verdict: APPROVE or REQUEST_CHANGES in `handoff.md`.

## 2026-11-01T20:39:04Z
[Message] timestamp=2026-11-01T20:39:04Z sender=af1b3904-b4bd-4e2f-b5dd-3bf5a39183a2 priority=MESSAGE_PRIORITY_HIGH content=You are teamwork_challenger_impl_1.
Your working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_challenger_impl_1

Mandatory initial step: Read c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Read your instructions in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_challenger_impl_1\DISPATCH.md.
Also inspect ARCHITECTURE.md, WEBSOCKET_SPEC.md, and TEST_READY.md.

Your mission:
Empirically challenge the backend, WebSocket broadcaster, and state engine under stress conditions:
1. Write and execute empirical stress test scripts targeting:
   - WebSocket role segregation enforcement (confirm 4403 on overlay messages, 4429 on control flooding).
   - Snapshot timing under concurrent load (<50ms).
   - High-throughput gift streak coalescing (50-100 rapid gifts, verifying single announcement and accurate coin totals).
   - Seating eviction under pressure (100% capacity with 100% donors, LRU quiet eviction, VIP immunity).
2. Run `node test/run_all_e2e.mjs`.
3. Record all empirical measurements and your verdict (APPROVE or REQUEST_CHANGES) in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_challenger_impl_1\handoff.md.
When finished, send a message to the orchestrator summarizing your findings and verdict.
