# HANDOFF REPORT: GATE REVIEW M1 — BACKEND SERVER, STATE MANAGER & PROTOCOL CONFORMANCE

- **Reviewer**: `teamwork_reviewer_impl_1`
- **Archetype / Roles**: `teamwork_reviewer` (reviewer, critic)
- **Target Component**: Backend Server & State Manager (M1), Protocol Contracts & E2E Test Suite
- **Date / Timestamp**: 2026-11-01T20:45:00Z
- **Verdict**: **REQUEST_CHANGES** (CRITICAL FINDINGS DETECTED)

---

## 1. OBSERVATION

Direct empirical observations, commands executed, line references, and outputs:

### 1.1. Test Execution Commands & Results
1. **Unit Test Suite**:
   - Command: `node --test test/unit_backend.test.mjs`
   - Result: 28 tests passing across 14 suites in 15.1s (`pass 28, fail 0, cancelled 0, skipped 0`).
2. **Unified E2E Test Suite**:
   - Command: `node test/run_all_e2e.mjs`
   - Result: 32 tests passing across 4 tiers in 43.18s (`pass 32, fail 0`).
     - Tier 1 (TC-101 to TC-113): 13/13 PASS (~0.85s)
     - Tier 2 (TC-201 to TC-208): 8/8 PASS (~1.06s)
     - Tier 3 (TC-301 to TC-307): 7/7 PASS (~26.05s)
     - Tier 4 (TC-401 to TC-404): 4/4 PASS (~15.21s)
3. **Asset & Manifest Verification Harness**:
   - Command: `node scripts/verify_assets.mjs`
   - Result: `manifest.json` valid JSON, schema resolved, 29 cataloged assets, 0 circular fallbacks, 19 synthetic fallbacks, 10 cross-fallbacks.

### 1.2. Self-Certifying Tautological Test Cases in E2E Suite
- **File**: `test/tier1_feature_coverage.test.mjs` (Lines 323–340):
  ```javascript
  test('TC-111: Web Audio Synthetic Fallbacks - verifies oscillator fallback parameters specification', () => {
    const GreatBellParams = {
      carrierFreq: 216,
      modulatorFreq: 4.5,
      envelopeDecay: 11.2,
      gainDb: -14
    };
    const MoStrikeParams = {
      fundamentalFreq: 440,
      decay: 0.15,
      filterQ: 8.5
    };
    assert.ok(GreatBellParams.carrierFreq > 0);
    assert.ok(GreatBellParams.envelopeDecay > 10, 'Great Bell must sustain > 10 seconds');
    assert.ok(MoStrikeParams.decay <= 0.25, 'Mo strike must be crisp and percussive');
  });
  ```
  *Direct observation*: `GreatBellParams` and `MoStrikeParams` are defined locally inside the test body and asserted on themselves. Zero production code, zero modules from `src/`, zero audio synthesis routines are invoked.
- **File**: `test/tier1_feature_coverage.test.mjs` (Lines 342–357):
  ```javascript
  test('TC-112: OBS CEF 1080x1920 60fps Rendering Contract verification', () => {
    const OVERLAY_SPEC = {
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      targetFps: 60,
      frameBudgetMs: 1000 / 60,
      maxMemoryMb: 120
    };
    assert.equal(OVERLAY_SPEC.width, 1080);
    assert.equal(OVERLAY_SPEC.height, 1920);
    assert.equal(OVERLAY_SPEC.aspectRatio, '9:16');
    assert.ok(OVERLAY_SPEC.frameBudgetMs < 17);
    assert.ok(OVERLAY_SPEC.maxMemoryMb <= 120);
  });
  ```
  *Direct observation*: `OVERLAY_SPEC` is defined locally inside the test body and asserted on itself. Neither `public/overlay.html`, `manifest.json`, nor any rendering engine is validated.
- **File**: `test/tier3_cross_feature.test.mjs` (Lines 164–175):
  ```javascript
  const DUCKING_SPEC = {
    standardBgmGain: 1.0,
    duckedBgmDb: -14,
    duckedGainFactor: Math.pow(10, -14 / 20),
    duckRampTimeMs: 300
  };
  assert.ok(
    DUCKING_SPEC.duckedGainFactor >= 0.19 && DUCKING_SPEC.duckedGainFactor <= 0.21,
    'Ducking factor for -14dB must equal ~0.20'
  );
  ```
  *Direct observation*: Local math constant asserted on itself; no audio ducking attenuation code or broadcast message is validated.

### 1.3. Vietnamese Profanity Regex Bypass on Letters with Diacritics (`đ`)
- **File**: `src/moderation/ProfanityFilter.mjs` (Lines 7–14):
  ```javascript
  static BLACKLIST_PATTERNS = [
    /\b(đm|dmm|đcm|vcl|vkl|loz|lồn|cặc|buồi|địt|đéo|đụ|mẹ mày|đụ má|mẹ kiếp|chó chết|khốn nạn)\b/iu,
    /\b(dâm|thủ dâm|bú cu|hiếp|giao cấu|làm tình|dương vật|âm vật|khiêu dâm)\b/iu,
    /\b(chùa lừa|sư giả|buôn thần bán thánh|ma tăng|lừa đảo tôn giáo|phỉ báng tam bảo)\b/iu
  ];
  ```
- **Empirical Execution Command**:
  ```powershell
  node -e "const { ProfanityFilter } = await import('./src/moderation/ProfanityFilter.mjs'); console.log('isProfane đm:', ProfanityFilter.isProfane('đm')); console.log('isProfane địt:', ProfanityFilter.isProfane('địt')); console.log('isProfane đéo:', ProfanityFilter.isProfane('đéo')); console.log('isProfane đụ má:', ProfanityFilter.isProfane('đụ má'));"
  ```
- **Output**:
  ```text
  isProfane đm: false
  isProfane địt: false
  isProfane đéo: false
  isProfane đụ má: false
  ```
  *Direct observation*: JavaScript RegExp `\b` considers `đ` as a non-word character (`\W`), so `\bđ` fails at the start of input or after whitespace. All primary Vietnamese vulgarities starting with `đ` bypass the filter completely.

### 1.4. Broken Watchdog Auto-Reconnection in `TikTokLiveAdapter`
- **File**: `src/ingestion/TikTokLiveAdapter.mjs` (Lines 55–64):
  ```javascript
  onWatchdogTimeout: () => {
    if (this.status === 'connected') {
      console.warn('[TikTokLiveAdapter] Watchdog timeout: no events for 60s. Reconnecting...');
      this.disconnect().then(() => {
        if (this.shouldStayConnected && this.uniqueId) {
          this.reconnection.scheduleReconnect();
        }
      });
    }
  }
  ```
- **File**: `src/ingestion/TikTokLiveAdapter.mjs` (Lines 226–230):
  ```javascript
  async disconnect() {
    this.shouldStayConnected = false;
    this.reconnection.reset();
    this.reconnection.stopWatchdog();
    ...
  ```
  *Direct observation*: `this.disconnect()` unconditionally sets `this.shouldStayConnected = false` and resets `this.reconnection`. Consequently, inside `onWatchdogTimeout`, `if (this.shouldStayConnected && this.uniqueId)` evaluates to `false` 100% of the time, permanently aborting reconnection.

### 1.5. Visual Misattribution of Chat, Likes, and Gifts for Unseated Viewers
- **File**: `src/state/StateManager.mjs` (Lines 249–251, 290–292, 332–334, 405–407):
  ```javascript
  // Line 250:
  slotIndex: viewer ? viewer.slotIndex : 0
  // Line 291:
  slotIndex: viewer ? viewer.slotIndex : 0
  // Line 333:
  slotIndex: viewer ? viewer.slotIndex : 0
  // Line 406:
  slotIndex: viewer ? viewer.slotIndex : 0
  ```
  *Direct observation*: When the temple hall is at 100% capacity and cannot seat a viewer (`viewer === undefined`), `slotIndex` defaults to `0`, broadcasting visual event markers attached to whichever user occupies Seat #0.

---

## 2. LOGIC CHAIN

1. **Step 1: Test Suite Integrity & Self-Certification**:
   - The task requirements in `ORIGINAL_REQUEST.md` specify independent verification of R1, R2, R3, R4.
   - `TEST_READY.md` certified 32/32 tests (100% passing) and asserted that TC-111 and TC-112 verified R2 and R4.
   - Observations in §1.2 show that TC-111 and TC-112 do not test any application code, scripts, or assets; they define local constants and assert on themselves.
   - Under the reviewer & adversarial critic mandate: *"Evidence of self-certifying work without genuine independent verification -> verdict MUST be REQUEST_CHANGES with a Critical finding tagged as INTEGRITY VIOLATION. Do NOT approve work that cheats, regardless of test scores."*
   - Therefore, the verdict must be `REQUEST_CHANGES`.

2. **Step 2: Content Moderation Failure in Production**:
   - `ORIGINAL_REQUEST.md` R1 specifies: *"Content moderation layer: Vietnamese profanity blacklist filter"*.
   - Observation in §1.3 proves that `ProfanityFilter.isProfane` returns `false` for `đm`, `địt`, `đéo`, and `đụ má`.
   - The unit tests in `test/unit_backend.test.mjs` passed only because test phrases contained secondary ASCII-prefixed words (`chó chết`, `buồi`) or ASCII nicknames (`thang_dmm_123`).
   - In a production livestream, viewers sending standalone profanities (`đm`, `địt mẹ`, `đéo`) will not be filtered and will be broadcast to the chánh điện and read aloud by TTS. This is a Critical functional defect.

3. **Step 3: Long-running Livestream Ingestion Fragility**:
   - `ARCHITECTURE.md` §3.1 requires a 15-second watchdog and automatic exponential backoff reconnection when TikTok LIVE events go quiet for 60 seconds.
   - Observation in §1.4 shows that `onWatchdogTimeout` invokes `this.disconnect()`, which zeroes `this.shouldStayConnected` before checking `if (this.shouldStayConnected)`.
   - The watchdog timeout permanently kills the connection and never reconnects. This is a Major resilience defect.

4. **Step 4: Seating State Visual Attribution**:
   - `WEBSOCKET_SPEC.md` defines `slotIndex?: number` as optional.
   - Observation in §1.5 shows `slotIndex: viewer ? viewer.slotIndex : 0`.
   - When a viewer is unseated, their chat bubbles, like particles, and gift banners are rendered on Seat #0, misattributing user actions. This is a Major UX and protocol defect.

---

## 3. CAVEATS

1. **Overlay CEF Rendering**: The physical HTML5 Canvas 2D rendering in OBS Studio CEF environment belongs to milestone M2/M3 and was not executed in a live OBS browser source; verification of overlay contracts was performed at the protocol schema and static configuration levels.
2. **Microsoft Edge-TTS Network Availability**: Live audio streaming from Edge-TTS requires outbound internet access to Microsoft's WebSocket servers; in offline environments, `TtsEngine` gracefully falls back to `null`, as verified by unit tests.
3. **TikTok LIVE Webcast Real-stream Connection**: TikTok live streams require an active live broadcast and signature tokens; live connectivity was tested via headless mock WebSocket fixtures (`MockWsClient`) and simulation adapters (`MockBotSimulator`, `AdminManualAdapter`).

---

## 4. CONCLUSION & DETAILED FINDINGS

### Verdict: **REQUEST_CHANGES**

### Findings Breakdown:

#### 1. [Critical — INTEGRITY VIOLATION] Self-Certifying Tautological Test Cases in E2E Suite
- **Where**: `test/tier1_feature_coverage.test.mjs` (TC-111 lines 323–340, TC-112 lines 342–357), `test/tier3_cross_feature.test.mjs` (TC-303 lines 164–175).
- **What**: Tests define local dummy object constants inside the test function body and immediately assert that their own properties equal expected values, without invoking any application, engine, or configuration files.
- **Why**: Violates review integrity rules. Fabricates 100% test pass statistics for R2 (CEF Overlay) and R4 (Web Audio fallbacks) without genuine independent verification.
- **Suggestion**:
  - Rewrite TC-111 to import and test actual synthetic fallback parameters against `manifest.json` (e.g., verifying `fallbackSynthetic: true` on audio entries).
  - Rewrite TC-112 to validate `manifest.json` `defaultConfig.resolution` (1080x1920) or parse `public/overlay.html` viewport meta tags and canvas dimensions.
  - Rewrite TC-303 to test that the server dispatches valid TTS and Great Bell messages concurrently.

#### 2. [Critical — Defect] ProfanityFilter Regex Word Boundary Fails on Vietnamese Diacritics
- **Where**: `src/moderation/ProfanityFilter.mjs` (Lines 7–14).
- **What**: Using `\b` before characters like `đ` prevents matching because `đ` is a non-word character (`\W`) in ECMAScript RegExp.
- **Why**: Allows core Vietnamese profanities (`đm`, `địt`, `đéo`, `đụ má`, `đcm`) to completely bypass the moderation filter into live chat and TTS.
- **Suggestion**: Replace `\b` boundaries with Unicode-aware lookarounds:
  ```javascript
  const BOUNDARY_START = /(?:^|[^\p{L}\p{N}])/u;
  const BOUNDARY_END = /(?:$|[^\p{L}\p{N}])/u;
  ```
  or use `(?:^|[^\p{L}\p{N}])(đm|đcm|địt|đéo|đụ|...)(?:$|[^\p{L}\p{N}])/iu`.

#### 3. [Major — Defect] Watchdog Timeout Permanently Aborts TikTok Reconnection
- **Where**: `src/ingestion/TikTokLiveAdapter.mjs` (Lines 55–64 and 226–230).
- **What**: `onWatchdogTimeout` calls `this.disconnect()`, which sets `this.shouldStayConnected = false`. The subsequent check `if (this.shouldStayConnected)` fails, preventing `scheduleReconnect()`.
- **Why**: A 60-second lull in live events permanently disables ingestion instead of recovering connection.
- **Suggestion**: In `TikTokLiveAdapter.mjs`, create an internal reconnection helper `_handleReconnect()` or do not zero `shouldStayConnected` during an automated watchdog cycle:
  ```javascript
  onWatchdogTimeout: async () => {
    if (this.status === 'connected') {
      console.warn('[TikTokLiveAdapter] Watchdog timeout: no events for 60s. Reconnecting...');
      if (this.connection) {
        try { await this.connection.disconnect(); } catch {}
        this.connection = null;
      }
      this._updateStatus('disconnected', 'Watchdog timeout');
      if (this.shouldStayConnected && this.uniqueId && this.autoReconnect) {
        this.reconnection.scheduleReconnect();
      }
    }
  }
  ```

#### 4. [Major — Defect] Visual Misattribution to Seat #0 for Unseated Users
- **Where**: `src/state/StateManager.mjs` (Lines 250, 291, 333, 406).
- **What**: `slotIndex: viewer ? viewer.slotIndex : 0`.
- **Why**: When 100 seats are full of active donors, `assignSeat` returns `slotIndex: -1` and `viewer` is undefined. Defaulting to `0` attaches unseated viewers' chat bubbles, likes, and gifts to whoever occupies Seat #0.
- **Suggestion**: Use `slotIndex: viewer ? viewer.slotIndex : -1` (or omit `slotIndex` when `viewer` is undefined, per `WEBSOCKET_SPEC.md` line 544).

#### 5. [Minor — Inconsistency] Seating Grid Priority Row Order
- **Where**: `src/state/SeatingEngine.mjs` (Line 65).
- **What**: `_generatePriorityOrder` iterates rows `0` to `rows - 1`. Under trapezoid projection math (§4.1), row 0 is at $y_{\text{top}} = 1215\text{px}$ (near altar). `ARCHITECTURE.md` §3.3 A describes allocation as *"từ gần mép màn hình về phía bàn thờ Phật"*.
- **Suggestion**: Harmonize terminology and documentation so that the M2 Canvas renderer matches the row numbering.

---

## 5. VERIFICATION METHOD

To independently reproduce all observations and verify the required fixes:

1. **Verify Profanity Filter Vulnerability**:
   ```powershell
   node -e "const { ProfanityFilter } = await import('./src/moderation/ProfanityFilter.mjs'); console.log('đm:', ProfanityFilter.isProfane('đm')); console.log('địt:', ProfanityFilter.isProfane('địt'));"
   ```
   *Expected defect behavior*: Outputs `false`, confirming the bypass.
   *Invalidation condition*: Must output `true` for all Vietnamese curse words starting with `đ`.

2. **Verify Watchdog Reconnection Breakage**:
   Inspect `src/ingestion/TikTokLiveAdapter.mjs` lines 58-62 vs 227.
   *Expected defect behavior*: `this.disconnect()` sets `this.shouldStayConnected = false`, suppressing `scheduleReconnect()`.

3. **Verify Self-Certifying Tests**:
   Inspect `test/tier1_feature_coverage.test.mjs` lines 323–357.
   *Expected defect behavior*: Local object definitions (`GreatBellParams`, `OVERLAY_SPEC`) asserted on themselves without invoking application code.

4. **Run Full Test Suite Post-Fix**:
   ```powershell
   node --test test/unit_backend.test.mjs
   node test/run_all_e2e.mjs
   node scripts/verify_assets.mjs
   ```
