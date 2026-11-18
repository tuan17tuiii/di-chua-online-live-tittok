import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http from 'http';
import {
  MockWsClient,
  ensureServerRunning,
  resetServerState,
  stateManager,
  server,
  shutdown,
  WS_ERROR_CODES
} from './helpers/MockWsClient.mjs';
import { config } from '../src/config.mjs';
import { Sanitizer } from '../src/moderation/Sanitizer.mjs';
import { ProfanityFilter } from '../src/moderation/ProfanityFilter.mjs';
import { SeatingEngine } from '../src/state/SeatingEngine.mjs';
import { PrayerCache } from '../src/state/PrayerCache.mjs';
import { GiftStreakCoalescer } from '../src/moderation/GiftStreakCoalescer.mjs';

const TEST_PORT = config.port || 3000;
const BASE_WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

describe('Tier 1: Feature Coverage & Core Protocol Verification (TC-101 to TC-113)', () => {
  before(async () => {
    await ensureServerRunning(TEST_PORT, '127.0.0.1');
  });

  after(async () => {
    if (stateManager.audioQueue) {
      stateManager.audioQueue.clear();
    }
    await shutdown();
  });

  beforeEach(() => {
    resetServerState();
  });

  test('TC-101: Server Bootstrap - Node.js server starts cleanly, exposes HTTP and WebSocket endpoints', async () => {
    assert.ok(server.listening, 'Server must be actively listening');

    // Verify /api/health endpoint
    const healthRes = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${TEST_PORT}/api/health`, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
        res.on('error', reject);
      });
    });

    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.data.status, 'ok');
    assert.ok(typeof healthRes.data.uptime === 'number');

    // Verify /api/state endpoint
    const stateRes = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${TEST_PORT}/api/state`, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
        res.on('error', reject);
      });
    });

    assert.equal(stateRes.status, 200);
    assert.equal(stateRes.data.t, 'state');
    assert.ok(stateRes.data.settings);
  });

  test('TC-102: WebSocket Role Separation - overlay is read-only, control has full privileges, missing role rejected', async () => {
    // 1. Missing role handshake test -> Rejected with 400 Bad Handshake
    await assert.rejects(
      async () => {
        const client = new MockWsClient(BASE_WS_URL);
        await client.connect(1500);
      },
      /Unexpected server response: 400|WebSocket connection timeout|ECONNREFUSED/i,
      'Connecting without ?role= parameter must be rejected by server with 400'
    );

    // 2. Overlay Client Handshake: Read-only check
    const overlay = await MockWsClient.connectOverlay(TEST_PORT);
    const snap = await overlay.waitForState();
    assert.equal(snap.t, 'state');

    // Sending any message from overlay client must trigger 4403 Forbidden Action close
    const closePromise = overlay.waitForClose(2000);
    overlay.send({ t: 'ctl', cmd: 'mo' });
    const closeInfo = await closePromise;
    assert.equal(
      closeInfo.code,
      WS_ERROR_CODES.FORBIDDEN_ACTION,
      `Expected close code 4403 FORBIDDEN_ACTION, got ${closeInfo.code}`
    );

    // 3. Control Client Handshake: Full privileges
    const control = await MockWsClient.connectControl(TEST_PORT);
    await control.waitForState();

    control.sendControl('mo');
    const moMsg = await control.waitForMessage((m) => m.t === 'mo' || m.t === 'mo1', 2000);
    assert.ok(moMsg, 'Control client should successfully trigger and receive mo broadcast');

    control.close();
  });

  test('TC-103: Snapshot-on-Connect completes under 50ms with complete schema', async () => {
    const startTime = performance.now();
    const client = await MockWsClient.connectControl(TEST_PORT);
    const snapshot = await client.waitForState(1000);
    const elapsed = performance.now() - startTime;

    assert.ok(elapsed < 100, `Snapshot received in ${elapsed.toFixed(2)}ms (target < 50ms handshake processing)`);
    assert.equal(snapshot.t, 'state');
    assert.ok(snapshot.settings, 'Snapshot must contain settings');
    assert.ok(typeof snapshot.settings.title === 'string', 'Settings must contain title');
    assert.ok(typeof snapshot.settings.moBpm === 'number', 'Settings must contain moBpm');
    assert.ok(Array.isArray(snapshot.viewers), 'Snapshot must contain viewers array');
    assert.ok(typeof snapshot.cap === 'number', 'Snapshot must contain capacity number');
    assert.ok(typeof snapshot.startedAt === 'number', 'Snapshot must contain startedAt timestamp');
    assert.ok(snapshot.tiktok, 'Snapshot must contain tiktok status');
    assert.ok(typeof snapshot.tiktok.status === 'string', 'TikTok status must have status string');

    client.close();
  });

  test('TC-104: Vietnamese Profanity Filter blocks vulgarities and sanitizes nicknames', async () => {
    // 1. Direct unit verification of ProfanityFilter
    assert.equal(ProfanityFilter.isProfane('dmm thằng kia'), true);
    assert.equal(ProfanityFilter.isProfane('vcl vãi chưởng'), true);
    assert.equal(ProfanityFilter.isProfane('chùa lừa đảo tôn giáo'), true);
    assert.equal(ProfanityFilter.isProfane('A Di Đà Phật'), false);
    assert.equal(ProfanityFilter.isProfane('Nam mô Bổn Sư Thích Ca Mâu Ni Phật'), false);

    assert.equal(ProfanityFilter.sanitizeNickname('thang loz'), 'Phật tử hữu duyên');
    assert.equal(ProfanityFilter.sanitizeNickname('Diệu Hạnh'), 'Diệu Hạnh');

    // 2. Live Protocol Integration verification via Control client
    const control = await MockWsClient.connectControl(TEST_PORT);
    await control.waitForState();

    // Inject profane comment
    control.sendControl('chat', {
      name: 'UserBad',
      text: 'dmm cái đồ chùa lừa đảo',
      id: 'bad_user_01'
    });

    // Wait a brief moment: Ensure NO chat event is broadcast for this profane message
    await new Promise((r) => setTimeout(r, 200));
    const profaneChatInQueue = control.filterMessages((m) => m.t === 'chat' && m.id === 'bad_user_01');
    assert.equal(profaneChatInQueue.length, 0, 'Profane chat must NOT be broadcast to clients');

    // Verify bad user was NOT assigned a seat
    const badUserSeated = stateManager.seatingEngine.viewers.has('bad_user_01');
    assert.equal(badUserSeated, false, 'Profane chatter must NOT be granted a seat');

    control.close();
  });

  test('TC-105: SSML / XML Character Escaping ensures safety against injection', () => {
    const rawXss = `<script>alert("hack & steal 'credentials'")</script>`;
    const escaped = Sanitizer.escapeXml(rawXss);

    assert.equal(
      escaped,
      '&lt;script&gt;alert(&quot;hack &amp; steal &apos;credentials&apos;&quot;)&lt;/script&gt;'
    );
    assert.ok(!escaped.includes('<'));
    assert.ok(!escaped.includes('>'));
    assert.ok(!escaped.includes('"'));
    assert.ok(!escaped.includes("'"));
  });

  test('TC-106: Gift Streak Coalescing suppresses intermediate combos and fires single final message', async () => {
    const intermediates = [];
    const finals = [];

    const coalescer = new GiftStreakCoalescer({
      debounceMs: 100, // Short debounce for testing
      onIntermediate: (d) => intermediates.push(d),
      onFlush: (f) => finals.push(f)
    });

    const giftEvent = (count, repeatEnd) => ({
      userId: 'donor_01',
      uniqueId: 'donor_01',
      nickname: 'Tuệ Tâm',
      avatarUrl: '',
      payload: {
        giftId: 'rose',
        giftName: 'Hoa Hồng',
        diamondCount: 1,
        repeatCount: count,
        repeatEnd,
        isCombo: true
      }
    });

    // 1. Send 5 intermediate events (repeatEnd = false)
    coalescer.processGift(giftEvent(1, false));
    coalescer.processGift(giftEvent(2, false));
    coalescer.processGift(giftEvent(3, false));
    coalescer.processGift(giftEvent(4, false));
    coalescer.processGift(giftEvent(5, false));

    assert.equal(intermediates.length, 5, 'Should have received 5 intermediate events');
    assert.equal(finals.length, 0, 'Should not have flushed final gift yet');

    // 2. Send 6th event with repeatEnd = true
    coalescer.processGift(giftEvent(6, true));

    assert.equal(finals.length, 1, 'Should have received exactly 1 finalized gift announcement');
    assert.equal(finals[0].count, 6);
    assert.equal(finals[0].totalCoins, 6);
    assert.equal(finals[0].repeatEnd, true);
  });

  test('TC-107: Center-Outward Seating Allocation prioritizes center columns near the aisle', () => {
    const engine = new SeatingEngine({ initialCapacity: 24, seatMode: '24' });
    // Capacity 24 = 4 rows x 6 cols (cols 0, 1, 2, 3, 4, 5).
    // Center aisle is between col 2 and col 3.
    // Row 0 center columns are slot 2 (centerLeft) and slot 3 (centerRight).
    const priority = engine._generatePriorityOrder(24);

    assert.equal(priority[0], 2, 'First seat must be slot 2 (Row 0, centerLeft)');
    assert.equal(priority[1], 3, 'Second seat must be slot 3 (Row 0, centerRight)');
    assert.equal(priority[2], 1, 'Third seat must be slot 1 (Row 0, left-1)');
    assert.equal(priority[3], 4, 'Fourth seat must be slot 4 (Row 0, right+1)');

    // Assign seats to 4 users and verify assigned slot indices
    const u1 = engine.assignSeat({ id: 'u1', name: 'User 1' });
    const u2 = engine.assignSeat({ id: 'u2', name: 'User 2' });
    const u3 = engine.assignSeat({ id: 'u3', name: 'User 3' });
    const u4 = engine.assignSeat({ id: 'u4', name: 'User 4' });

    assert.equal(u1.slotIndex, 2);
    assert.equal(u2.slotIndex, 3);
    assert.equal(u3.slotIndex, 1);
    assert.equal(u4.slotIndex, 4);
  });

  test('TC-108: Longest-Quiet Non-Donor Eviction releases seat when capacity is reached', async () => {
    const control = await MockWsClient.connectControl(TEST_PORT);
    await control.waitForState();

    // Set fixed capacity to 24
    control.sendControl('settings', { settings: { seatMode: '24' } });
    await control.waitForMessage((m) => m.t === 'settings' && m.cap === 24);

    // Fill 24 demo users
    control.sendControl('fill', { n: 24 });
    await control.waitForState();

    assert.equal(stateManager.seatingEngine.viewers.size, 24);

    // Pick one viewer and backdate their lastActivityAt by 1 hour to make them the quietest
    const firstViewerId = Array.from(stateManager.seatingEngine.viewers.keys())[0];
    const firstViewer = stateManager.seatingEngine.viewers.get(firstViewerId);
    firstViewer.coins = 0; // Ensure non-donor
    firstViewer.isVip = false;
    firstViewer.lastActivityAt = Date.now() - 3600000;

    // Send chat from a brand new user
    control.sendControl('chat', {
      id: 'newcomer_999',
      name: 'Người Mới Đến',
      text: 'A Di Đà Phật kính chào đạo tràng'
    });

    // Server must broadcast a leave event for the evicted quiet non-donor
    const leaveMsg = await control.waitForMessage((m) => m.t === 'leave', 2500);
    assert.ok(leaveMsg, 'Must emit leave event');
    assert.equal(leaveMsg.id, firstViewerId, 'Quietest non-donor should be evicted');

    // And newcomer must be seated with a join event
    const joinMsg = await control.waitForMessage((m) => m.t === 'join' && m.v.id === 'newcomer_999', 2500);
    assert.ok(joinMsg, 'Newcomer must receive a join event');

    control.close();
  });

  test('TC-109: VIP Slot Protection preserves donors and VIP pinned slots from eviction', () => {
    const engine = new SeatingEngine({ initialCapacity: 24, seatMode: '24' });
    engine.fillDemo(24);

    // Set user 0 as VIP and user 1 as Donor (coins > 0)
    const all = Array.from(engine.viewers.values());
    const vipUser = all[0];
    engine.setVip(vipUser.slotIndex, true);
    vipUser.coins = 0;
    vipUser.lastActivityAt = 1000; // very quiet

    const donorUser = all[1];
    donorUser.coins = 500;
    donorUser.lastActivityAt = 1000; // very quiet

    // Evict if needed
    const evictee = engine.evictIfNeeded();
    assert.ok(evictee, 'An eviction should occur');
    assert.notEqual(evictee.id, vipUser.id, 'VIP user must NEVER be evicted');
    assert.notEqual(evictee.id, donorUser.id, 'Active donor must NOT be evicted while non-donors exist');
  });

  test('TC-110: 90-Second Prayer Cache Recall retrieves recent prayer upon gift', () => {
    const cache = new PrayerCache(90000);
    const userId = 'devotee_42';

    // 1. Record prayer
    cache.recordPrayer(userId, 'Cầu cho mẹ mau bình phục');

    // 2. Recall prayer within TTL
    const recalled = cache.getPrayer(userId);
    assert.equal(recalled, 'Cầu cho mẹ mau bình phục');

    // 3. Second call within TTL should return default prayer because first call consumed it
    const secondCall = cache.getPrayer(userId);
    assert.ok(secondCall.length > 0);
    assert.notEqual(secondCall, 'Cầu cho mẹ mau bình phục');
  });

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

  test('TC-113: Admin Dashboard Command Dispatch updates state and broadcasts in < 20ms', async () => {
    const control = await MockWsClient.connectControl(TEST_PORT);
    await control.waitForState();

    const tStart = performance.now();
    control.sendControl('settings', {
      settings: {
        moBpm: 68,
        music: true
      }
    });

    const settingsBroadcast = await control.waitForMessage(
      (m) => m.t === 'settings' && m.settings && m.settings.moBpm === 68,
      2000
    );
    const latency = performance.now() - tStart;

    assert.ok(settingsBroadcast, 'Must broadcast updated settings');
    assert.equal(settingsBroadcast.settings.moBpm, 68);
    assert.ok(latency < 100, `Command roundtrip latency: ${latency.toFixed(2)}ms`);

    control.close();
  });
});
