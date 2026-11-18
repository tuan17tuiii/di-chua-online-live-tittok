import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { WebSocket } from 'ws';

import { Sanitizer } from '../src/moderation/Sanitizer.mjs';
import { ProfanityFilter } from '../src/moderation/ProfanityFilter.mjs';
import { EventNormalizer } from '../src/moderation/EventNormalizer.mjs';
import { GiftStreakCoalescer } from '../src/moderation/GiftStreakCoalescer.mjs';
import { PrayerCache } from '../src/state/PrayerCache.mjs';
import { MeritLeaderboard } from '../src/state/MeritLeaderboard.mjs';
import { SeatingEngine } from '../src/state/SeatingEngine.mjs';
import { LiturgicalScheduler } from '../src/state/LiturgicalScheduler.mjs';
import { TtsEngine } from '../src/audio/TtsEngine.mjs';
import { AudioPriorityQueue } from '../src/audio/AudioPriorityQueue.mjs';
import { ReconnectionEngine } from '../src/ingestion/ReconnectionEngine.mjs';
import { MockBotSimulator } from '../src/ingestion/MockBotSimulator.mjs';
import { AdminManualAdapter } from '../src/ingestion/AdminManualAdapter.mjs';
import { Broadcaster } from '../src/broadcaster/Broadcaster.mjs';
import { WS_ERROR_CODES, validateClientCommand } from '../src/broadcaster/MessageSchemas.mjs';
import { StateManager } from '../src/state/StateManager.mjs';

// ==========================================
// 1. MODERATION TESTS
// ==========================================
describe('Moderation: Sanitizer', () => {
  it('escapes XML and SSML characters', () => {
    const raw = '<speak>Nam & "Mô" \'A\' > Di Đà</speak>';
    const escaped = Sanitizer.escapeXml(raw);
    assert.strictEqual(
      escaped,
      '&lt;speak&gt;Nam &amp; &quot;Mô&quot; &apos;A&apos; &gt; Di Đà&lt;/speak&gt;'
    );
  });

  it('cleans non-printable control characters and enforces maxLength', () => {
    const rawWithControlChars = 'Nam Mô\u0000\u0007\u001F A Di Đà Phật       ';
    const cleaned = Sanitizer.cleanString(rawWithControlChars, 15);
    assert.strictEqual(cleaned, 'Nam Mô A Di Đà');
  });
});

describe('Moderation: ProfanityFilter', () => {
  it('detects Vietnamese profanity and blasphemous phrases', () => {
    assert.strictEqual(ProfanityFilter.isProfane('Thằng chó chết này đm'), true);
    assert.strictEqual(ProfanityFilter.isProfane('Bọn chùa lừa đảo'), true);
    assert.strictEqual(ProfanityFilter.isProfane('Nam mô A Di Đà Phật'), false);
    assert.strictEqual(ProfanityFilter.isProfane('Cầu cho cha mẹ bình an'), false);
    assert.strictEqual(ProfanityFilter.isProfane('đm'), true, 'Must detect standalone đm');
    assert.strictEqual(ProfanityFilter.isProfane('địt con mẹ'), true, 'Must detect standalone địt');
    assert.strictEqual(ProfanityFilter.isProfane('đéo'), true, 'Must detect standalone đéo');
    assert.strictEqual(ProfanityFilter.isProfane('đụ má'), true, 'Must detect standalone đụ má');
    assert.strictEqual(ProfanityFilter.isProfane('âm vật'), true, 'Must detect standalone âm vật');
    assert.strictEqual(ProfanityFilter.isProfane('đêm'), false, 'Harmless word starting with đ must not be flagged');
  });

  it('sanitizes profane nicknames to "Phật tử hữu duyên"', () => {
    assert.strictEqual(ProfanityFilter.sanitizeNickname('thang_dmm_123'), 'Phật tử hữu duyên');
    assert.strictEqual(ProfanityFilter.sanitizeNickname('Diệu Tâm'), 'Diệu Tâm');
  });

  it('rejects profane comments in filterComment', () => {
    const profaneRes = ProfanityFilter.filterComment('đồ con buồi thô tục');
    assert.strictEqual(profaneRes.allowed, false);

    const cleanRes = ProfanityFilter.filterComment('Kính lễ chư Phật mười phương');
    assert.strictEqual(cleanRes.allowed, true);
    assert.strictEqual(cleanRes.cleanedText, 'Kính lễ chư Phật mười phương');
  });
});

describe('Moderation: EventNormalizer & Skin NLP', () => {
  const normalizer = new EventNormalizer();

  it('detects character skins accurately from text', () => {
    assert.strictEqual(EventNormalizer.detectSkinFromText('Con là cư sĩ nam'), 'man');
    assert.strictEqual(EventNormalizer.detectSkinFromText('đổi nữ'), 'woman');
    assert.strictEqual(EventNormalizer.detectSkinFromText('chú tiểu ngây thơ'), 'child');
    assert.strictEqual(EventNormalizer.detectSkinFromText('kính chào sư thầy'), 'monk');
    assert.strictEqual(EventNormalizer.detectSkinFromText('bạch sư cô'), 'nun');
    assert.strictEqual(EventNormalizer.detectSkinFromText('kính bạch cao tăng hòa thượng'), 'master');
  });

  it('protects sacred chants from false skin detection', () => {
    // "Nam" in "Nam mô", "Bà" in "Phật bà" must NOT trigger skin change
    assert.strictEqual(EventNormalizer.detectSkinFromText('Nam mô A Di Đà Phật'), null);
    assert.strictEqual(EventNormalizer.detectSkinFromText('Con kính lạy Phật bà Quan Âm'), null);
    assert.strictEqual(EventNormalizer.detectSkinFromText('Nam mô Bổn Sư Thích Ca'), null);
  });

  it('enforces per-user chat rate limiting (3s cooldown)', () => {
    const userId = 'user_flood_123';
    assert.strictEqual(normalizer.checkChatRateLimit(userId), true);
    assert.strictEqual(normalizer.checkChatRateLimit(userId), false); // Rejected immediately
  });

  it('normalizes TikTok raw chat and gift payloads', () => {
    const rawChat = {
      msgId: 'msg_999',
      userId: '718294',
      nickname: 'Tuệ Minh',
      comment: 'Nam mô A Di Đà Phật',
      createTime: Date.now()
    };
    const canonicalChat = normalizer.normalizeTikTokChat(rawChat);
    assert.strictEqual(canonicalChat.type, 'chat');
    assert.strictEqual(canonicalChat.userId, '718294');
    assert.strictEqual(canonicalChat.nickname, 'Tuệ Minh');
    assert.strictEqual(canonicalChat.payload.text, 'Nam mô A Di Đà Phật');

    const rawGift = {
      msgId: 'gift_111',
      userId: '718294',
      nickname: 'Tuệ Minh',
      giftId: '5820',
      giftName: 'Đèn Hoa Sen',
      diamondCount: 30,
      repeatCount: 1,
      repeatEnd: true
    };
    const canonicalGift = normalizer.normalizeTikTokGift(rawGift);
    assert.strictEqual(canonicalGift.type, 'gift');
    assert.strictEqual(canonicalGift.payload.diamondCount, 30);
    assert.strictEqual(canonicalGift.payload.giftName, 'Đèn Hoa Sen');
  });
});

describe('Moderation: GiftStreakCoalescer', () => {
  it('coalesces intermediate combo gifts and flushes single finalized announcement', async () => {
    let intermediateCount = 0;
    let finalizedGift = null;

    const coalescer = new GiftStreakCoalescer({
      debounceMs: 100, // fast for testing
      onIntermediate: () => intermediateCount++,
      onFlush: (g) => {
        finalizedGift = g;
      }
    });

    const baseEvent = {
      userId: 'donor_01',
      uniqueId: 'donor_01',
      nickname: 'Minh Tâm',
      avatarUrl: '',
      payload: {
        giftId: '1001',
        giftName: 'Hoa Sen',
        diamondCount: 1,
        repeatCount: 1,
        repeatEnd: false
      }
    };

    // Send 3 combo hits with repeatEnd: false
    coalescer.processGift({ ...baseEvent, payload: { ...baseEvent.payload, repeatCount: 1, repeatEnd: false } });
    coalescer.processGift({ ...baseEvent, payload: { ...baseEvent.payload, repeatCount: 2, repeatEnd: false } });
    coalescer.processGift({ ...baseEvent, payload: { ...baseEvent.payload, repeatCount: 5, repeatEnd: false } });

    assert.strictEqual(intermediateCount, 3);
    assert.strictEqual(finalizedGift, null);

    // Send final hit with repeatEnd: true
    coalescer.processGift({ ...baseEvent, payload: { ...baseEvent.payload, repeatCount: 5, repeatEnd: true } });

    assert.notStrictEqual(finalizedGift, null);
    assert.strictEqual(finalizedGift.count, 5);
    assert.strictEqual(finalizedGift.totalCoins, 5);
    assert.strictEqual(finalizedGift.repeatEnd, true);
    assert.strictEqual(finalizedGift.tier, 1);
  });
});

// ==========================================
// 2. STATE SUB-ENGINE TESTS
// ==========================================
describe('State: PrayerCache', () => {
  it('records, consumes within TTL, and falls back to default blessings', () => {
    const cache = new PrayerCache(500); // 500ms TTL for test
    const userId = 'user_prayer_test';

    cache.recordPrayer(userId, 'Cầu cho gia đình bình an');
    const firstGet = cache.getPrayer(userId);
    assert.strictEqual(firstGet, 'Cầu cho gia đình bình an');

    // Second get immediately after should be one-time consumed -> fallback
    const secondGet = cache.getPrayer(userId);
    assert.ok(PrayerCache.DEFAULT_PRAYERS.includes(secondGet));
  });
});

describe('State: MeritLeaderboard', () => {
  it('accumulates donor coins, ranks top donors descending, and flags rank changes', () => {
    const lb = new MeritLeaderboard();

    const d1 = lb.recordDonation({ id: 'u1', name: 'User 1', avatar: '' }, 50);
    assert.strictEqual(d1.newRank, 1);
    assert.strictEqual(d1.totalCoins, 50);
    assert.strictEqual(d1.isTopChange, true);

    const d2 = lb.recordDonation({ id: 'u2', name: 'User 2', avatar: '' }, 100);
    assert.strictEqual(d2.newRank, 1);
    assert.strictEqual(d2.totalCoins, 100);
    assert.strictEqual(d2.isTopChange, true);

    const top = lb.getTop(10);
    assert.strictEqual(top[0].id, 'u2');
    assert.strictEqual(top[1].id, 'u1');
  });
});

describe('State: SeatingEngine', () => {
  it('generates center-outward front-to-back priority order', () => {
    const engine = new SeatingEngine({ seatMode: '24', initialCapacity: 24 });
    // 24 capacity: rows=4, cols=6. Center columns are 2 and 3.
    // Row 0 first priority slots: 2, 3, 1, 4, 0, 5
    assert.strictEqual(engine.priorityOrder[0], 2);
    assert.strictEqual(engine.priorityOrder[1], 3);
    assert.strictEqual(engine.priorityOrder[2], 1);
    assert.strictEqual(engine.priorityOrder[3], 4);
    assert.strictEqual(engine.priorityOrder[4], 0);
    assert.strictEqual(engine.priorityOrder[5], 5);
  });

  it('allocates seats and auto-scales capacity from 24 to 36 when full', () => {
    const engine = new SeatingEngine({ seatMode: 'auto', initialCapacity: 24 });
    assert.strictEqual(engine.capacity, 24);

    // Fill 24 seats
    for (let i = 0; i < 24; i++) {
      engine.assignSeat({ id: `user_${i}`, name: `User ${i}` });
    }
    assert.strictEqual(engine.viewers.size, 24);

    // 25th user should trigger auto-scale to 36 without eviction
    const { slotIndex, evicted } = engine.assignSeat({ id: 'user_25', name: 'User 25' });
    assert.strictEqual(evicted, null);
    assert.strictEqual(engine.capacity, 36);
    assert.strictEqual(slotIndex !== -1, true);
  });

  it('evicts longest-quiet non-donor (coins === 0) when fixed capacity is full', () => {
    const engine = new SeatingEngine({ seatMode: '24', initialCapacity: 24 });

    // Fill 24 seats with non-donors
    for (let i = 0; i < 24; i++) {
      engine.assignSeat({ id: `non_donor_${i}`, name: `Non Donor ${i}`, coins: 0 });
    }

    // Mark user_0 as the quietest (oldest lastActivityAt)
    const user0 = engine.viewers.get('non_donor_0');
    user0.lastActivityAt = Date.now() - 100000;

    // Mark user_1 as recent
    const user1 = engine.viewers.get('non_donor_1');
    user1.lastActivityAt = Date.now();

    // 25th user enters
    const { evicted } = engine.assignSeat({ id: 'new_donor', name: 'New Donor', coins: 10 });
    assert.notStrictEqual(evicted, null);
    assert.strictEqual(evicted.id, 'non_donor_0');
    assert.strictEqual(evicted.reason, 'evicted_quiet_non_donor');
  });

  it('resolves 100% donor saturation deadlock by evicting inactive donor (>15m idle)', () => {
    const engine = new SeatingEngine({ seatMode: '24', initialCapacity: 24 });

    // Fill all 24 seats with donors (coins > 0)
    for (let i = 0; i < 24; i++) {
      engine.assignSeat({ id: `donor_${i}`, name: `Donor ${i}`, coins: 50 });
    }

    // Make donor_5 inactive for 20 minutes with 5 coins (lowest coins)
    const inactiveDonor = engine.viewers.get('donor_5');
    inactiveDonor.coins = 5;
    inactiveDonor.lastActivityAt = Date.now() - (20 * 60 * 1000);

    const { evicted } = engine.assignSeat({ id: 'vip_guest', name: 'VIP Guest', coins: 100 });
    assert.notStrictEqual(evicted, null);
    assert.strictEqual(evicted.id, 'donor_5');
    assert.strictEqual(evicted.reason, 'evicted_inactive_donor');
  });

  it('protects VIP slots from eviction', () => {
    const engine = new SeatingEngine({ seatMode: '24', initialCapacity: 24 });

    for (let i = 0; i < 24; i++) {
      engine.assignSeat({ id: `donor_${i}`, name: `Donor ${i}`, coins: 10 });
    }

    // Make donor_0 idle for 30 minutes BUT pin as VIP
    const donor0 = engine.viewers.get('donor_0');
    donor0.lastActivityAt = Date.now() - (30 * 60 * 1000);
    donor0.isVip = true;

    // Make donor_1 idle for 20 minutes (not VIP)
    const donor1 = engine.viewers.get('donor_1');
    donor1.lastActivityAt = Date.now() - (20 * 60 * 1000);
    donor1.isVip = false;

    const { evicted } = engine.assignSeat({ id: 'new_comer', name: 'New Comer', coins: 20 });
    assert.strictEqual(evicted.id, 'donor_1');
    assert.notStrictEqual(evicted.id, 'donor_0'); // donor_0 protected!
  });
});

describe('State: LiturgicalScheduler', () => {
  it('manages BPM clamping and manual mõ cadence reset', () => {
    let moStrikes = 0;
    const scheduler = new LiturgicalScheduler({
      moBpm: 60,
      onMoTick: () => moStrikes++
    });

    scheduler.setMoBpm(150); // Clamped to 120
    assert.strictEqual(scheduler.moBpm, 120);

    scheduler.setMoBpm(10); // Clamped to 20
    assert.strictEqual(scheduler.moBpm, 20);

    // Manual strike advances roundRobinIndex 1 -> 2 -> 3 -> 1
    const idx1 = scheduler.triggerMoManual();
    assert.strictEqual(idx1, 2);
    const idx2 = scheduler.triggerMoManual();
    assert.strictEqual(idx2, 3);
    const idx3 = scheduler.triggerMoManual();
    assert.strictEqual(idx3, 1);
    assert.strictEqual(moStrikes, 3);

    scheduler.stop();
  });
});

// ==========================================
// 3. AUDIO & TTS PIPELINE TESTS
// ==========================================
describe('Audio: TtsEngine & Cache', () => {
  it('hashes cache key and handles empty or cached text instantly', async () => {
    const tts = new TtsEngine();
    const key = tts.getCacheKey('Nam mô A Di Đà Phật', 'vi-VN-NamMinhNeural', '-18Hz', '-20%');
    assert.strictEqual(typeof key, 'string');
    assert.strictEqual(key.length, 32); // MD5 hex length

    // Empty text returns null
    const emptyRes = await tts.synthesize('');
    assert.strictEqual(emptyRes, null);

    // Pre-populate cache to test 0ms cache hit
    const dummyUri = 'data:audio/mp3;base64,SUQzBAAAAAAA';
    tts.cache.set(key, dummyUri);

    const cachedRes = await tts.synthesize('Nam mô A Di Đà Phật');
    assert.strictEqual(cachedRes, dummyUri);
  });
});

describe('Audio: AudioPriorityQueue', () => {
  it('enforces 3-tier priority ordering and 10-item safety cap', () => {
    const fakeTtsEngine = {
      synthesize: async () => 'data:audio/mp3;base64,fake_audio'
    };
    const queue = new AudioPriorityQueue({
      ttsEngine: fakeTtsEngine,
      maxQueueSize: 5 // small for testing
    });

    // Enqueue without starting auto loop by intercepting isProcessing
    queue.isProcessing = true;

    queue.enqueue({ text: 'Tier 2 standard gift', priority: 2 });
    queue.enqueue({ text: 'Tier 3 auto chant', priority: 3 });
    queue.enqueue({ text: 'Tier 1 emergency 999 coins', priority: 1 });

    assert.strictEqual(queue.queue[0].text, 'Tier 1 emergency 999 coins');
    assert.strictEqual(queue.queue[1].text, 'Tier 2 standard gift');
    assert.strictEqual(queue.queue[2].text, 'Tier 3 auto chant');

    // Test safety cap
    for (let i = 0; i < 10; i++) {
      queue.enqueue({ text: `Flood item ${i}`, priority: 2 });
    }
    assert.strictEqual(queue.queue.length <= 5, true);
    queue.clear();
  });
});

// ==========================================
// 4. INGESTION & RESILIENCE TESTS
// ==========================================
describe('Ingestion: ReconnectionEngine', () => {
  it('calculates exponential delay with jitter bounded by maxDelay', () => {
    const engine = new ReconnectionEngine({
      baseDelay: 1000,
      maxDelay: 5000
    });

    for (let attempt = 0; attempt < 10; attempt++) {
      engine.attempt = attempt;
      const delay = engine.getNextDelay();
      assert.strictEqual(delay >= 500, true);
      assert.strictEqual(delay <= 5000, true);
    }
  });

  it('triggers watchdog callback on inactivity', (t, done) => {
    const engine = new ReconnectionEngine({
      watchdogInterval: 50,
      inactivityTimeout: 100,
      onWatchdogTimeout: () => {
        engine.stopWatchdog();
        done();
      }
    });

    engine.startWatchdog();
    // Simulate inactivity past 100ms
    engine.lastEventTimestamp = Date.now() - 200;
  });
});

describe('Ingestion: MockBotSimulator & AdminManualAdapter', () => {
  it('generates simulated events within distribution and delivers them', () => {
    const events = [];
    const bot = new MockBotSimulator({
      on: false,
      count: 5,
      onEvent: (e) => events.push(e)
    });

    // Trigger explicit event generation
    bot._generateRandomEvent();
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].source, 'bot');
    assert.ok(['chat', 'like', 'gift'].includes(events[0].type));

    // Admin manual adapter
    const admin = new AdminManualAdapter({
      onEvent: (e) => events.push(e)
    });
    admin.injectChat('Nam mô A Di Đà Phật', 'Phật Tử Ẩn Danh');
    admin.injectGift(199, 'Minh Đức', 'Chuông Vàng', 1, 'Cầu bình an');
    admin.injectLike(25);

    assert.strictEqual(events.length, 4);
    assert.strictEqual(events[1].type, 'chat');
    assert.strictEqual(events[2].type, 'gift');
    assert.strictEqual(events[3].type, 'like');
  });
});

// ==========================================
// 5. WEBSOCKET PROTOCOL & BROADCASTER TESTS
// ==========================================
describe('Broadcaster: Protocol & Role Segregation', () => {
  let server;
  let broadcaster;
  let stateManager;
  let testPort = 3999;

  before(async () => {
    stateManager = new StateManager();
    broadcaster = new Broadcaster({
      stateManager
    });
    stateManager.setBroadcaster(broadcaster);

    server = http.createServer();
    server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/ws') {
        broadcaster.handleUpgrade(req, socket, head);
      } else {
        socket.destroy();
      }
    });

    await new Promise((resolve) => server.listen(testPort, '127.0.0.1', resolve));
  });

  after(async () => {
    broadcaster.close();
    await stateManager.destroy();
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  it('validates client command schemas correctly', () => {
    assert.strictEqual(validateClientCommand({ t: 'ctl', cmd: 'mo' }).valid, true);
    assert.strictEqual(validateClientCommand({ t: 'bad', cmd: 'mo' }).valid, false);
    assert.strictEqual(validateClientCommand({ t: 'ctl', cmd: 'hacked_command' }).valid, false);
  });

  it('sends initial state snapshot to overlay client within 50ms upon connection', (t, done) => {
    const startTime = Date.now();
    const ws = new WebSocket(`ws://127.0.0.1:${testPort}/ws?role=overlay`);

    ws.on('message', (data) => {
      const elapsed = Date.now() - startTime;
      const msg = JSON.parse(data.toString());
      assert.strictEqual(msg.t, 'state');
      assert.strictEqual(typeof msg.settings, 'object');
      assert.strictEqual(Array.isArray(msg.viewers), true);
      assert.strictEqual(elapsed < 50, true, `Snapshot received in ${elapsed}ms (expected < 50ms)`);
      ws.terminate();
      done();
    });
  });

  it('strictly protects role=overlay by closing with 4403 if it sends any message', (t, done) => {
    const ws = new WebSocket(`ws://127.0.0.1:${testPort}/ws?role=overlay`);

    ws.on('open', () => {
      // Inbound forbidden message from overlay
      ws.send(JSON.stringify({ t: 'ctl', cmd: 'bell' }));
    });

    ws.on('close', (code) => {
      assert.strictEqual(code, WS_ERROR_CODES.FORBIDDEN_ACTION); // 4403
      ws.terminate();
      done();
    });
  });

  it('allows role=control to execute valid commands and enforce rate limiting', (t, done) => {
    const ws = new WebSocket(`ws://127.0.0.1:${testPort}/ws?role=control`);

    ws.on('open', () => {
      // Send 15 commands rapidly (rate limit is 10/s)
      for (let i = 0; i < 15; i++) {
        ws.send(JSON.stringify({ t: 'ctl', cmd: 'mo' }));
      }
    });

    ws.on('close', (code) => {
      assert.strictEqual(code, WS_ERROR_CODES.RATE_LIMITED); // 4429
      ws.terminate();
      done();
    });
  });
});

// ==========================================
// 6. END-TO-END STATE MANAGER INTEGRATION
// ==========================================
describe('StateManager: End-to-End Event Coordination', () => {
  it('ingests canonical chat and gift, updates seating and triggers broadcasts', async () => {
    const broadcastEvents = [];
    const state = new StateManager();
    state.setBroadcaster({
      broadcast: (msg) => broadcastEvents.push(msg),
      broadcastOverlayOnly: (msg) => broadcastEvents.push(msg),
      broadcastControlOnly: () => {}
    });

    // 1. Ingest Chat from a new user
    state.handleCanonicalEvent({
      eventId: 'chat_1',
      source: 'tiktok',
      timestamp: Date.now(),
      userId: 'phat_tu_1',
      uniqueId: 'phat_tu_1',
      nickname: 'Diệu Hạnh',
      avatarUrl: '/c_woman.png',
      type: 'chat',
      payload: {
        text: 'Cầu cho cha mẹ vạn sự an khang'
      }
    });

    // Verify user was assigned a seat and join + chat were broadcast
    assert.strictEqual(state.seatingEngine.viewers.has('phat_tu_1'), true);
    assert.ok(broadcastEvents.some((e) => e.t === 'join' && e.v.id === 'phat_tu_1'));
    assert.ok(broadcastEvents.some((e) => e.t === 'chat' && e.id === 'phat_tu_1'));

    // 2. Ingest Gift from same user
    state.handleCanonicalEvent({
      eventId: 'gift_1',
      source: 'tiktok',
      timestamp: Date.now(),
      userId: 'phat_tu_1',
      uniqueId: 'phat_tu_1',
      nickname: 'Diệu Hạnh',
      avatarUrl: '/c_woman.png',
      type: 'gift',
      payload: {
        giftId: '5820',
        giftName: 'Đèn Hoa Sen',
        diamondCount: 30,
        repeatCount: 1,
        repeatEnd: true
      }
    });

    // Verify gift broadcast with prayer extracted from cache
    const giftBroadcast = broadcastEvents.find((e) => e.t === 'gift' && e.repeatEnd === true);
    assert.notStrictEqual(giftBroadcast, undefined);
    assert.strictEqual(giftBroadcast.coins, 30);
    assert.strictEqual(giftBroadcast.total, 30);
    assert.strictEqual(giftBroadcast.prayer, 'Cầu cho cha mẹ vạn sự an khang');

    // 3. Verify leaderboard updated
    const top = state.leaderboard.getTop(5);
    assert.strictEqual(top[0].id, 'phat_tu_1');
    assert.strictEqual(top[0].coins, 30);

    await state.destroy();
  });
});
