# Dispatch Assignment: Gate 2 Challenger (challenger_gate2_1)

## Target Agent
- Name: challenger_gate2_1
- Archetype: teamwork_challenger
- Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\challenger_gate2_1

## Mandatory References
- User Request: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md (MUST READ FIRST)
- Worker Remediation Report: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_r2_1\handoff.md
- Gate 1 Reviewer Report: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_reviewer_impl_1\handoff.md

## Empirical Stress & Edge Case Verification Scope
Write and execute automated stress harnesses to empirically verify:
1. **Unicode Profanity Boundary Rigor**:
   - Test standalone profanities (`đm`, `địt`, `đéo`, `đụ má`, `âm vật`).
   - Test embedded strings that should NOT trigger (`đêm nay`, `đạo tràng`, `đức hạnh`, `con đường`).
   - Test punctuation boundaries (`.đm,`, `!địt?`, `(đéo)`).
2. **Watchdog Auto-Reconnection Lifecycle**:
   - Simulate a stalled connection triggering `onWatchdogTimeout`. Verify that `shouldStayConnected` remains true and `reconnection.scheduleReconnect()` is activated without duplicate listeners or process hang.
3. **Unseated Viewer Slot Index Isolation**:
   - Simulate a full temple hall (100 seats filled) with incoming chats, likes, and gifts from unseated users (`viewer === undefined`).
   - Assert that broadcast messages have `slotIndex: -1`.
   - Assert that Seat #0 occupant does not have their speech bubble or visual state mutated by unseated events.

## Output Requirements
Document test code, execution results, performance metrics, and final verdict (`APPROVE` or `REQUEST_CHANGES`) in:
`c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\challenger_gate2_1\handoff.md`
