# HANDOFF REPORT: GATE 1 REMEDIATION STRATEGY & CODE SPECIFICATIONS

- **Agent**: `teamwork_explorer_r2_1`
- **Archetype**: `teamwork_explorer`
- **Date**: 2026-11-01T20:58:00Z
- **Target**: Gate 1 Remediation for M1 Backend Server, State Manager, Ingestion, Moderation, and E2E Test Suite
- **Recipient**: Orchestrator (`af1b3904-b4bd-4e2f-b5dd-3bf5a39183a2`) and Implementation Workers

---

## 1. OBSERVATION

Direct empirical observations, reproduction commands, line references, and outputs:

### 1.1. Defect 1 — ProfanityFilter Diacritics Bypass (`đ`, `â`, etc.)
- **Location**: `src/moderation/ProfanityFilter.mjs` (Lines 7–14)
- **Code**:
  ```javascript
  static BLACKLIST_PATTERNS = [
    /\b(đm|dmm|đcm|vcl|vkl|loz|lồn|cặc|buồi|địt|đéo|đụ|mẹ mày|đụ má|mẹ kiếp|chó chết|khốn nạn)\b/iu,
    /\b(dâm|thủ dâm|bú cu|hiếp|giao cấu|làm tình|dương vật|âm vật|khiêu dâm)\b/iu,
    /\b(chùa lừa|sư giả|buôn thần bán thánh|ma tăng|lừa đảo tôn giáo|phỉ báng tam bảo)\b/iu
  ];
  ```
- **Reproduction Command**:
  ```powershell
  node -e "const { ProfanityFilter } = await import('./src/moderation/ProfanityFilter.mjs'); console.log('đm:', ProfanityFilter.isProfane('đm')); console.log('địt:', ProfanityFilter.isProfane('địt')); console.log('đéo:', ProfanityFilter.isProfane('đéo')); console.log('đụ má:', ProfanityFilter.isProfane('đụ má')); console.log('âm vật:', ProfanityFilter.isProfane('âm vật'));"
  ```
- **Observed Output**:
  ```text
  đm: false
  địt: false
  đéo: false
  đụ má: false
  âm vật: false
  ```
- **Root Cause**: JavaScript RegExp `\b` is defined strictly on ASCII `[a-zA-Z0-9_]`. Characters outside ASCII (such as `đ` U+0111, `â` U+00E2) are treated as `\W`. Between the start-of-string (or whitespace) and `đ`, both sides are non-word characters, so `\b` fails to match. Standalone Vietnamese profanities starting with `đ` or `â` completely bypass moderation.

---

### 1.2. Defect 2 — Broken Watchdog Auto-Reconnection in `TikTokLiveAdapter`
- **Location**: `src/ingestion/TikTokLiveAdapter.mjs` (Lines 55–64 and Lines 226–230)
- **Code in `onWatchdogTimeout` (Lines 55–64)**:
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
- **Code in `disconnect()` (Lines 226–230)**:
  ```javascript
  async disconnect() {
    this.shouldStayConnected = false;
    this.reconnection.reset();
    this.reconnection.stopWatchdog();
    ...
  ```
- **Root Cause**: Calling `this.disconnect()` inside `onWatchdogTimeout` unconditionally sets `this.shouldStayConnected = false` and resets `this.reconnection`. Consequently, `this.shouldStayConnected` is already `false` when checked inside `.then()`, permanently suppressing `scheduleReconnect()`. A 60-second lull permanently halts ingestion instead of recovering.

---

### 1.3. Defect 3 — Visual Misattribution of Unseated Viewers to Seat #0
- **Location**: `src/state/StateManager.mjs` (Lines 249, 291, 332, 406)
- **Code**:
  - Line 249 (`chat` event): `slotIndex: viewer ? viewer.slotIndex : 0`
  - Line 291 (`like` event): `slotIndex: viewer ? viewer.slotIndex : 0`
  - Line 332 (`gift` streak event): `slotIndex: viewer ? viewer.slotIndex : 0`
  - Line 406 (`gift` finalized event): `slotIndex: viewer ? viewer.slotIndex : 0`
- **Root Cause**: When the temple hall is at 100% capacity and cannot seat a viewer (`viewer === undefined`), `slotIndex` falls back to `0`. Under `WEBSOCKET_SPEC.md` §3.4 and overlay rendering rules, chat bubbles, floating like hearts, and gift banners are visually pinned to whichever user occupies Seat #0 (`slotCoords[0]`).

---

### 1.4. Defect 4 — Self-Certifying Tautological Assertions in TC-111, TC-112, and TC-303
- **Locations**:
  - `test/tier1_feature_coverage.test.mjs` (TC-111 lines 323–340, TC-112 lines 342–357)
  - `test/tier3_cross_feature.test.mjs` (TC-303 lines 164–175)
- **Code in TC-111**:
  ```javascript
  const GreatBellParams = { carrierFreq: 216, envelopeDecay: 11.2, gainDb: -14 };
  assert.ok(GreatBellParams.carrierFreq > 0);
  assert.ok(GreatBellParams.envelopeDecay > 10);
  ```
- **Code in TC-112**:
  ```javascript
  const OVERLAY_SPEC = { width: 1080, height: 1920, aspectRatio: '9:16', ... };
  assert.equal(OVERLAY_SPEC.width, 1080);
  assert.equal(OVERLAY_SPEC.height, 1920);
  ```
- **Code in TC-303**:
  ```javascript
  const DUCKING_SPEC = { duckedGainFactor: Math.pow(10, -14 / 20) };
  assert.ok(DUCKING_SPEC.duckedGainFactor >= 0.19 && DUCKING_SPEC.duckedGainFactor <= 0.21);
  ```
- **Root Cause**: Tests declared local dummy literals and asserted on those exact literals without invoking or inspecting application code, assets, manifests, or live WebSocket broadcasts.

---

## 2. LOGIC CHAIN

1. **Defect 1**:
   - `ORIGINAL_REQUEST.md` R1 requires a content moderation layer for Vietnamese profanity blacklist filtering.
   - JavaScript RegExp supports ES2018 Unicode property escapes `\p{L}` (any Unicode letter) and `\p{N}` (any Unicode numeric).
   - A Unicode-aware boundary can be strictly specified as:
     - Boundary Start: `(?<![\p{L}\p{N}])` (negative lookbehind: not preceded by a letter/number)
     - Boundary End: `(?![\p{L}\p{N}])` (negative lookahead: not followed by a letter/number)
   - Tested against test corpus: Standalone `đm`, `địt`, `đéo`, `đụ má`, `đcm`, `âm vật` all match (`true`). Harmless words containing letters like `đêm`, `đức`, `đạm`, `đạo` return `false`.

2. **Defect 2**:
   - User-initiated `disconnect()` must disable auto-reconnection (`shouldStayConnected = false`).
   - Watchdog timeout is an involuntary connection failure due to socket stagnation, not a user cancellation. `shouldStayConnected` must remain `true`.
   - On watchdog timeout, the adapter should stop the watchdog, remove listeners on the dead connection to prevent duplicate event loops, disconnect the underlying `TikTokLiveConnection`, set `this.connection = null`, transition status to `'disconnected'`, and invoke `this.reconnection.scheduleReconnect()`.

3. **Defect 3**:
   - `WEBSOCKET_SPEC.md` lines 520, 544–546 specify that `slotIndex` is optional and represents seats `0 -> 99`.
   - For an unseated viewer, `slotIndex` should be `-1`.
   - Setting `slotIndex: viewer ? viewer.slotIndex : -1` across all 4 event broadcasts in `StateManager.mjs` cleanly distinguishes seated viewers (`0..99`) from unseated audience members (`-1`).
   - In `public/js/OverlayApp.js`, chat bubbles and particles are anchored only when `slotIndex >= 0`, preventing visual pollution on Seat #0.

4. **Defect 4**:
   - Genuine testing requires asserting against actual application artifacts:
     - TC-111 must assert against `manifest.json` (`sfx_bell_great_temple`, `sfx_mo_01..03`, `fallbackSynthetic: true`, `durationSec`, `sampleRate: 48000`) and verify synthesis logic in `public/js/WebAudioEngine.js` (216Hz fundamental, triangle swept wave, bandpass filter).
     - TC-112 must assert against `manifest.json` `defaultConfig.resolution`, `public/overlay.html` native `<canvas id="templeCanvas" width="1080" height="1920">` and viewport meta, and `public/css/overlay.css` dimension rules.
     - TC-303 must assert against concurrent live broadcasts to both `overlay` and `control` clients (`isGreatBell: true`), verify emergency announcement queuing in `stateManager.audioQueue`, and validate the look-ahead -14dB ducking contract in `manifest.json` and `public/js/WebAudioEngine.js`.

---

## 3. CAVEATS

1. **ECMAScript Lookbehind Compatibility**: Lookbehind assertions `(?<!...)` require ES2018+. The project environment runs Node.js v24.16.0 where full Unicode property escapes and lookaround assertions are natively supported.
2. **Overlay CEF Rendering**: The physical HTML5 canvas rendering occurs in the browser/OBS CEF environment. Contract verification for TC-111, TC-112, and TC-303 is asserted against the canonical source files (`manifest.json`, `overlay.html`, `overlay.css`, `WebAudioEngine.js`) and live WebSocket broadcasts.

---

## 4. CONCLUSION & CONCRETE REMEDIATION SPECIFICATIONS

Below are the exact, drop-in replacement specifications for each of the 4 defects.

---

### Remediation 1: `src/moderation/ProfanityFilter.mjs`

#### Target: Lines 7–14
Replace `BLACKLIST_PATTERNS` definition:

```javascript
<<<<<<< BEFORE (Lines 7–14)
  static BLACKLIST_PATTERNS = [
    // Teencode, curse words, vulgar slang
    /\b(đm|dmm|đcm|vcl|vkl|loz|lồn|cặc|buồi|địt|đéo|đụ|mẹ mày|đụ má|mẹ kiếp|chó chết|khốn nạn)\b/iu,
    // Pornographic & sexually explicit terms
    /\b(dâm|thủ dâm|bú cu|hiếp|giao cấu|làm tình|dương vật|âm vật|khiêu dâm)\b/iu,
    // Blasphemy and insulting Buddhist religion/monks
    /\b(chùa lừa|sư giả|buôn thần bán thánh|ma tăng|lừa đảo tôn giáo|phỉ báng tam bảo)\b/iu
  ];
=======
  static BLACKLIST_PATTERNS = [
    // Teencode, curse words, vulgar slang (Unicode-aware word boundaries)
    /(?<![\p{L}\p{N}])(đm|dmm|đcm|vcl|vkl|loz|lồn|cặc|buồi|địt|đéo|đụ|mẹ mày|đụ má|mẹ kiếp|chó chết|khốn nạn)(?![\p{L}\p{N}])/iu,
    // Pornographic & sexually explicit terms
    /(?<![\p{L}\p{N}])(dâm|thủ dâm|bú cu|hiếp|giao cấu|làm tình|dương vật|âm vật|khiêu dâm)(?![\p{L}\p{N}])/iu,
    // Blasphemy and insulting Buddhist religion/monks
    /(?<![\p{L}\p{N}])(chùa lừa|sư giả|buôn thần bán thánh|ma tăng|lừa đảo tôn giáo|phỉ báng tam bảo)(?![\p{L}\p{N}])/iu
  ];
>>>>>>> AFTER
```

#### Unit Test Augmentation: `test/unit_backend.test.mjs`
Inside `describe('Moderation: ProfanityFilter', ...)` (around line 45), add explicit checks for words starting with `đ` and `â`:
```javascript
assert.strictEqual(ProfanityFilter.isProfane('đm'), true, 'Must detect standalone đm');
assert.strictEqual(ProfanityFilter.isProfane('địt con mẹ'), true, 'Must detect standalone địt');
assert.strictEqual(ProfanityFilter.isProfane('đéo'), true, 'Must detect standalone đéo');
assert.strictEqual(ProfanityFilter.isProfane('đụ má'), true, 'Must detect standalone đụ má');
assert.strictEqual(ProfanityFilter.isProfane('âm vật'), true, 'Must detect standalone âm vật');
```

---

### Remediation 2: `src/ingestion/TikTokLiveAdapter.mjs`

#### Target: Lines 55–64
Replace `onWatchdogTimeout` callback in `constructor`:

```javascript
<<<<<<< BEFORE (Lines 55–64)
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
=======
      onWatchdogTimeout: async () => {
        if (this.status === 'connected') {
          console.warn('[TikTokLiveAdapter] Watchdog timeout: no events for 60s. Reconnecting...');
          this.reconnection.stopWatchdog();
          if (this.connection) {
            try {
              if (typeof this.connection.removeAllListeners === 'function') {
                this.connection.removeAllListeners();
              }
              await this.connection.disconnect();
            } catch {
              // ignore
            }
            this.connection = null;
          }
          this._updateStatus('disconnected', 'Watchdog timeout: không nhận được sự kiện sau 60s');
          if (this.shouldStayConnected && this.uniqueId && this.autoReconnect) {
            this.reconnection.scheduleReconnect();
          }
        }
      }
>>>>>>> AFTER
```

---

### Remediation 3: `src/state/StateManager.mjs`

#### Target: Lines 249, 291, 332, 406
Replace default `slotIndex: viewer ? viewer.slotIndex : 0` with `-1`:

1. **Line 249 (chat event)**:
   ```javascript
   // Before:
   slotIndex: viewer ? viewer.slotIndex : 0
   // After:
   slotIndex: viewer ? viewer.slotIndex : -1
   ```

2. **Line 291 (like event)**:
   ```javascript
   // Before:
   slotIndex: viewer ? viewer.slotIndex : 0
   // After:
   slotIndex: viewer ? viewer.slotIndex : -1
   ```

3. **Line 332 (gift combo event)**:
   ```javascript
   // Before:
   slotIndex: viewer ? viewer.slotIndex : 0
   // After:
   slotIndex: viewer ? viewer.slotIndex : -1
   ```

4. **Line 406 (gift finalized event)**:
   ```javascript
   // Before:
   slotIndex: viewer ? viewer.slotIndex : 0
   // After:
   slotIndex: viewer ? viewer.slotIndex : -1
   ```

#### Client Overlay Safeguard: `public/js/OverlayApp.js`
In `public/js/OverlayApp.js` line 250, 267, 295:
```javascript
// handleChat:
const slotIndex = char ? char.slotIndex : (typeof msg.slotIndex === 'number' ? msg.slotIndex : -1);
if (slotIndex >= 0) {
  this.showChatBubble(slotIndex, text);
}
```

---

### Remediation 4: Replacement Tests in `test/tier1_feature_coverage.test.mjs` & `test/tier3_cross_feature.test.mjs`

#### Target 4A: `test/tier1_feature_coverage.test.mjs`
1. Add `import { readFileSync } from 'node:fs';` at the top of `test/tier1_feature_coverage.test.mjs`.
2. Replace TC-111 and TC-112 (Lines 323–357):

```javascript
<<<<<<< BEFORE (Lines 323–357)
  test('TC-111: Web Audio Synthetic Fallbacks - verifies oscillator fallback parameters specification', () => {
    // When audio files are missing, oscillator fallback parameters ensure audio generation
    const GreatBellParams = {
      carrierFreq: 216, // Hz (A3 bell tone)
      modulatorFreq: 4.5, // Hz shimmer
      envelopeDecay: 11.2, // seconds
      gainDb: -14
    };
    const MoStrikeParams = {
      fundamentalFreq: 440, // Hz
      decay: 0.15, // seconds
      filterQ: 8.5
    };

    assert.ok(GreatBellParams.carrierFreq > 0);
    assert.ok(GreatBellParams.envelopeDecay > 10, 'Great Bell must sustain > 10 seconds');
    assert.ok(MoStrikeParams.decay <= 0.25, 'Mo strike must be crisp and percussive');
  });

  test('TC-112: OBS CEF 1080x1920 60fps Rendering Contract verification', () => {
    const OVERLAY_SPEC = {
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      targetFps: 60,
      frameBudgetMs: 1000 / 60, // 16.67ms
      maxMemoryMb: 120
    };

    assert.equal(OVERLAY_SPEC.width, 1080);
    assert.equal(OVERLAY_SPEC.height, 1920);
    assert.equal(OVERLAY_SPEC.aspectRatio, '9:16');
    assert.ok(OVERLAY_SPEC.frameBudgetMs < 17);
    assert.ok(OVERLAY_SPEC.maxMemoryMb <= 120);
  });
=======
  test('TC-111: Web Audio Synthetic Fallbacks - verifies oscillator fallback parameters specification', () => {
    // 1. Verify manifest.json audio assets declare synthetic fallbacks and correct audio parameters
    const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
    assert.equal(manifest.defaultConfig.audio.sampleRate, 48000, 'Audio sample rate must be 48kHz');
    assert.equal(manifest.defaultConfig.audio.channels, 2, 'Audio must be stereo 2-channel');

    // Great Bell asset manifest verification
    const greatBellAsset = manifest.assets.audio_sfx.find((a) => a.id === 'sfx_bell_great_temple');
    assert.ok(greatBellAsset, 'Great temple bell asset must be cataloged in manifest');
    assert.equal(greatBellAsset.fallbackSynthetic, true, 'Great bell must have fallbackSynthetic enabled');
    assert.ok(greatBellAsset.durationSec >= 10, 'Great bell duration must sustain >= 10s');
    assert.equal(greatBellAsset.sampleRate, 48000);

    // Mo strike assets manifest verification
    const moAssets = manifest.assets.audio_sfx.filter((a) => a.type === 'mo');
    assert.equal(moAssets.length, 3, 'Must catalog 3 round-robin mõ strike variations');
    for (const mo of moAssets) {
      assert.equal(mo.fallbackSynthetic, true, `Mõ asset ${mo.id} must support synthetic fallback`);
      assert.ok(mo.durationSec <= 0.5, 'Mõ strike duration must be <= 0.5s for crisp cadence');
      assert.equal(mo.roundRobinGroup, 'mo_cadence');
    }

    // 2. Verify WebAudioEngine.js implementation contains real synthesis and ducking parameters
    const webAudioSource = readFileSync('public/js/WebAudioEngine.js', 'utf8');
    assert.match(webAudioSource, /synthesizeBell/, 'WebAudioEngine must implement synthesizeBell');
    assert.match(webAudioSource, /freq:\s*216/, 'Great Bell synthesis must include 216Hz fundamental carrier');
    assert.match(webAudioSource, /synthesizeMo/, 'WebAudioEngine must implement synthesizeMo');
    assert.match(webAudioSource, /osc\.type\s*=\s*['"]triangle['"]/, 'Mõ strike must use triangle oscillator');
    assert.match(webAudioSource, /filter\.type\s*=\s*['"]bandpass['"]/, 'Mõ strike must apply bandpass resonance filter');
  });

  test('TC-112: OBS CEF 1080x1920 60fps Rendering Contract verification', () => {
    // 1. Verify manifest.json resolution contract
    const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
    assert.equal(manifest.defaultConfig.resolution.width, 1080, 'Manifest width must be 1080');
    assert.equal(manifest.defaultConfig.resolution.height, 1920, 'Manifest height must be 1920');
    assert.equal(manifest.defaultConfig.resolution.aspectRatio, '9:16', 'Aspect ratio must be 9:16');

    // 2. Verify public/overlay.html defines viewport and explicit 1080x1920 Canvas element
    const htmlSource = readFileSync('public/overlay.html', 'utf8');
    assert.match(
      htmlSource,
      /<canvas\s+id=["']templeCanvas["']\s+width=["']1080["']\s+height=["']1920["']\s*><\/canvas>/,
      'HTML must declare templeCanvas with native 1080x1920 resolution'
    );
    assert.match(
      htmlSource,
      /<meta\s+name=["']viewport["']\s+content=["'][^"']*width=1080[^"']*height=1920[^"']*["']/,
      'HTML viewport meta must lock to 1080x1920 without scaling'
    );

    // 3. Verify public/css/overlay.css enforces 1080x1920 container and canvas bounds
    const cssSource = readFileSync('public/css/overlay.css', 'utf8');
    assert.match(cssSource, /width:\s*1080px;\s*height:\s*1920px;/, 'CSS must enforce 1080px by 1920px geometry');
    assert.match(cssSource, /#templeCanvas\s*\{[^}]*width:\s*1080px;[^}]*height:\s*1920px;/s, 'Canvas CSS dimensions must match 1080x1920');
  });
>>>>>>> AFTER
```

#### Target 4B: `test/tier3_cross_feature.test.mjs`
1. Add `import fs from 'node:fs';` at the top of `test/tier3_cross_feature.test.mjs`.
2. Replace TC-303 (Lines 149–177):

```javascript
<<<<<<< BEFORE (Lines 149–177)
  test('TC-303: TTS Announcement & Great Bell Ducking Concurrency - verifies concurrent broadcast and ducking contract', async () => {
    const control = await MockWsClient.connectControl(TEST_PORT);
    await control.waitForState();

    // 1. Admin triggers Great Bell and Emergency TTS Announcement simultaneously
    control.sendControl('bell', { isGreatBell: true });
    control.sendControl('say', { text: 'Kính mời chư vị Phật tử chuẩn bị vào khóa lễ.' });

    // 2. Receive Great Bell broadcast
    const bellMsg = await control.waitForMessage((m) => m.t === 'bell' && m.isGreatBell === true, 2000);
    assert.ok(bellMsg, 'Great bell broadcast must be dispatched');
    assert.equal(bellMsg.isGreatBell, true);

    // 3. Audio Ducking specification contract verification:
    // When Great Bell or TTS announcement is active, BGM must duck by -14dB (approx 20% gain)
    const DUCKING_SPEC = {
      standardBgmGain: 1.0,
      duckedBgmDb: -14,
      duckedGainFactor: Math.pow(10, -14 / 20), // approx 0.1995 (20%)
      duckRampTimeMs: 300
    };

    assert.ok(
      DUCKING_SPEC.duckedGainFactor >= 0.19 && DUCKING_SPEC.duckedGainFactor <= 0.21,
      'Ducking factor for -14dB must equal ~0.20'
    );

    control.close();
  });
=======
  test('TC-303: TTS Announcement & Great Bell Ducking Concurrency - verifies concurrent broadcast and ducking contract', async () => {
    const overlay = await MockWsClient.connectOverlay(TEST_PORT);
    const control = await MockWsClient.connectControl(TEST_PORT);
    await overlay.waitForState();
    await control.waitForState();

    // 1. Admin triggers Great Bell and Emergency TTS Announcement simultaneously
    const announcementText = 'Kính mời chư vị Phật tử chuẩn bị vào khóa lễ.';
    control.sendControl('bell', { isGreatBell: true });
    control.sendControl('say', { text: announcementText });

    // 2. Receive Great Bell broadcast on overlay and control clients concurrently
    const [bellMsgControl, bellMsgOverlay] = await Promise.all([
      control.waitForMessage((m) => m.t === 'bell' && m.isGreatBell === true, 2000),
      overlay.waitForMessage((m) => m.t === 'bell' && m.isGreatBell === true, 2000)
    ]);
    assert.ok(bellMsgControl, 'Control client must receive Great Bell broadcast');
    assert.equal(bellMsgControl.isGreatBell, true);
    assert.ok(bellMsgOverlay, 'Overlay client must receive Great Bell broadcast');
    assert.equal(bellMsgOverlay.isGreatBell, true);

    // 3. Verify server state manager enqueued emergency announcement into AudioPriorityQueue
    assert.ok(stateManager.audioQueue, 'State manager must have initialized AudioPriorityQueue');
    const isHandlingAnnouncement = stateManager.audioQueue.isProcessing ||
      stateManager.audioQueue.queue.some((item) => item.text === announcementText);
    assert.ok(isHandlingAnnouncement, 'Emergency TTS announcement must be enqueued or actively synthesized');

    // 4. Audio Ducking specification contract verification:
    // Verify WebAudioEngine.js and manifest.json implement parametric look-ahead -14dB ducking
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    assert.equal(manifest.defaultConfig.audio.bgmVolume, 0.55, 'Manifest normal BGM volume must be 0.55');

    const webAudioSource = fs.readFileSync('public/js/WebAudioEngine.js', 'utf8');
    assert.match(webAudioSource, /normalBgmVolume\s*=\s*0\.55/, 'WebAudioEngine must set normal BGM volume to 0.55');
    assert.match(webAudioSource, /duckedBgmVolume\s*=\s*0\.12/, 'WebAudioEngine must set ducked BGM volume to 0.12 (-14dB)');
    assert.match(webAudioSource, /linearRampToValueAtTime\(this\.duckedBgmVolume,\s*now\s*\+\s*0\.400\)/, 'Ducking must ramp to -14dB over 400ms');
    assert.match(webAudioSource, /this\.duckAudio\(8\.0\)/, 'Great bell trigger must duck audio for 8.0 seconds');

    overlay.close();
    control.close();
  });
>>>>>>> AFTER
```

---

## 5. VERIFICATION METHOD

To independently verify the implementation after applying the remediation:

1. **Verify Profanity Filter**:
   ```powershell
   node -e "const { ProfanityFilter } = await import('./src/moderation/ProfanityFilter.mjs'); console.log('đm:', ProfanityFilter.isProfane('đm')); console.log('địt:', ProfanityFilter.isProfane('địt')); console.log('đéo:', ProfanityFilter.isProfane('đéo')); console.log('đụ má:', ProfanityFilter.isProfane('đụ má')); console.log('âm vật:', ProfanityFilter.isProfane('âm vật')); console.log('đêm:', ProfanityFilter.isProfane('đêm'));"
   ```
   *Expected behavior*: Must print `true` for all profane words and `false` for `đêm`.

2. **Verify Watchdog Reconnection**:
   ```powershell
   node -e "const { TikTokLiveAdapter } = await import('./src/ingestion/TikTokLiveAdapter.mjs'); const adapter = new TikTokLiveAdapter({ uniqueId: 'test_chan', autoReconnect: true }); adapter.status = 'connected'; adapter.shouldStayConnected = true; adapter.connection = { disconnect: async () => {}, removeAllListeners: () => {} }; adapter.reconnection.onWatchdogTimeout().then(() => { console.log('shouldStayConnected:', adapter.shouldStayConnected); console.log('status:', adapter.status); console.log('reconnectTimeout scheduled:', adapter.reconnection.reconnectTimeout !== null); adapter.reconnection.cancelReconnect(); });"
   ```
   *Expected behavior*: Must print `shouldStayConnected: true`, `status: disconnected`, `reconnectTimeout scheduled: true`.

3. **Verify StateManager Unseated User `slotIndex`**:
   ```powershell
   node -e "const { StateManager } = await import('./src/state/StateManager.mjs'); const sm = new StateManager(); let lastChat = null; sm.broadcaster = { broadcast: (msg) => { if (msg.t === 'chat') lastChat = msg; } }; sm.handleCanonicalEvent({ type: 'chat', userId: 'unseated_123', nickname: 'Test', payload: { text: 'Hello' } }); console.log('unseated chat slotIndex:', lastChat.slotIndex);"
   ```
   *Expected behavior*: Must print `unseated chat slotIndex: -1`.

4. **Run Full Test Suite Post-Remediation**:
   ```powershell
   node --test test/unit_backend.test.mjs
   node test/run_all_e2e.mjs
   node scripts/verify_assets.mjs
   ```
   *Pass Criteria*: All unit tests, all 32 E2E test cases across 4 tiers, and asset verification must pass with 0 failures and 0 tautological assertions.
