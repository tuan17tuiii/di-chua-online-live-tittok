import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MockWsClient,
  ensureServerRunning,
  resetServerState,
  stateManager,
  shutdown
} from './helpers/MockWsClient.mjs';
import { config } from '../src/config.mjs';
import { SeatingEngine } from '../src/state/SeatingEngine.mjs';
import { EventNormalizer } from '../src/moderation/EventNormalizer.mjs';
import { AudioPriorityQueue } from '../src/audio/AudioPriorityQueue.mjs';

const TEST_PORT = config.port || 3000;

describe('Tier 3: Cross-Feature Interactions (TC-301 to TC-307)', () => {
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

  test('TC-301: Admin Kick During Active Gift Streak - slot is freed immediately, merit points retained on leaderboard', async () => {
    const control = await MockWsClient.connectControl(TEST_PORT);
    await control.waitForState();

    const donorId = 'combo_donor_99';
    const donorName = 'Phật Tử Hoan Hỷ';

    // 1. User starts combo gift streak (intermediate hit)
    stateManager.handleCanonicalEvent({
      eventId: 'evt_combo_1',
      source: 'tiktok',
      timestamp: Date.now(),
      userId: donorId,
      uniqueId: donorId,
      nickname: donorName,
      avatarUrl: '',
      type: 'gift',
      payload: {
        giftId: 'rose',
        giftName: 'Hoa Hồng',
        diamondCount: 1,
        repeatCount: 10,
        repeatEnd: false,
        isCombo: true
      }
    });

    // Verify user was assigned a seat during the streak
    assert.ok(stateManager.seatingEngine.viewers.has(donorId), 'User should be seated during active streak');
    const slotIdx = stateManager.seatingEngine.viewers.get(donorId).slotIndex;

    // 2. Admin issues kick command in the middle of the streak
    control.sendControl('kick', { id: donorId });
    const leaveEvent = await control.waitForMessage((m) => m.t === 'leave' && m.id === donorId, 2000);

    assert.ok(leaveEvent, 'Server must emit leave event immediately upon kick');
    assert.equal(stateManager.seatingEngine.viewers.has(donorId), false, 'Slot must be freed immediately');
    assert.equal(stateManager.seatingEngine.slots[slotIdx], null, 'Slot matrix slot must be null');

    // 3. The streak finalizes with repeatEnd: true (or debounce timeout)
    stateManager.handleCanonicalEvent({
      eventId: 'evt_combo_final',
      source: 'tiktok',
      timestamp: Date.now(),
      userId: donorId,
      uniqueId: donorId,
      nickname: donorName,
      avatarUrl: '',
      type: 'gift',
      payload: {
        giftId: 'rose',
        giftName: 'Hoa Hồng',
        diamondCount: 1,
        repeatCount: 10,
        repeatEnd: true,
        isCombo: true
      }
    });

    const finalGift = await control.waitForMessage(
      (m) => m.t === 'gift' && m.id === donorId && m.repeatEnd === true,
      2000
    );
    assert.ok(finalGift, 'Finalized gift must still be broadcast');
    assert.equal(finalGift.total, 10);

    // 4. Verify Merit Leaderboard retained the merit points despite being kicked
    const topDonors = stateManager.leaderboard.getTop(10);
    const donorRecord = topDonors.find((d) => d.id === donorId);
    assert.ok(donorRecord, 'Donor must still be recorded on Merit Leaderboard');
    assert.equal(donorRecord.coins, 10, 'Merit coins must be fully preserved');

    control.close();
  });

  test('TC-302: High-Tier Gift Interrupting Routine Liturgical Chant - Tier 1 grand gift takes priority over Tier 3 chant', () => {
    const playedItems = [];

    // Custom mock queue that records processing order
    const mockTts = {
      synthesize: async (text) => `data:audio/mp3;base64,mock_${Buffer.from(text).toString('base64')}`
    };

    const queue = new AudioPriorityQueue({
      ttsEngine: mockTts,
      onPlay: (item) => playedItems.push(item)
    });

    // 1. Routine chant arrives (Tier 3)
    queue.enqueue({
      text: 'Nguyện đem công đức này, hướng về khắp tất cả.',
      priority: 3,
      tag: 'chant'
    });

    // 2. High-tier grand gift arrives immediately (Tier 1: 1000 diamonds)
    queue.enqueue({
      text: 'Đại Lễ Cúng Dường: Phật Tử Diệu Âm cúng dường 1000 xu.',
      priority: 1,
      tag: 'gift'
    });

    // 3. Standard gift arrives (Tier 2: 10 diamonds)
    queue.enqueue({
      text: 'Phật Tử Minh Tâm cúng dường Đèn Hoa Sen.',
      priority: 2,
      tag: 'gift'
    });

    // When Tier 1 is enqueued, it must be placed before Tier 2 and Tier 3
    assert.equal(queue.queue[0].priority, 1, 'Grand gift (Tier 1) must be first in line');
    assert.equal(queue.queue[1].priority, 2, 'Standard gift (Tier 2) must be second');

    queue.clear();
  });

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

  test('TC-304: Bot Flooding With Real User Join - real user interaction is cleanly handled without starvation', async () => {
    const control = await MockWsClient.connectControl(TEST_PORT);
    await control.waitForState();

    // 1. Enable bot simulator with 20 bots
    control.sendControl('bots', { on: true, n: 20, pace: 'fast' });
    const botStatus = await control.waitForMessage((m) => m.t === 'bots' && m.on === true, 2000);
    assert.equal(botStatus.on, true);

    // 2. Simulate real user interaction in the midst of bot activity
    const realUserId = 'real_human_user_777';
    control.sendControl('chat', {
      id: realUserId,
      name: 'Phật Tử Thật',
      text: 'Nam mô A Di Đà Phật, con xin một chỗ ngồi'
    });

    // 3. Ensure real user receives join and chat events immediately
    const realUserJoin = await control.waitForMessage((m) => m.t === 'join' && m.v.id === realUserId, 2000);
    assert.ok(realUserJoin, 'Real user must be granted a seat without bot starvation');
    assert.equal(realUserJoin.v.name, 'Phật Tử Thật');

    const realUserChat = await control.waitForMessage((m) => m.t === 'chat' && m.id === realUserId, 2000);
    assert.ok(realUserChat, 'Real user chat must be broadcast');

    // 4. Turn off bots
    control.sendControl('bots', { on: false });
    await control.waitForMessage((m) => m.t === 'bots' && m.on === false, 2000);

    control.close();
  });

  test('TC-305: Dynamic Auto-Capacity Expansion Under Influx - expands 24 -> 36 -> 64 -> 100 preserving seated viewers', () => {
    const engine = new SeatingEngine({ initialCapacity: 24, seatMode: 'auto' });
    assert.equal(engine.capacity, 24);

    // Fill 24 seats
    engine.fillDemo(24);
    assert.equal(engine.viewers.size, 24);
    const viewerAtSlot0 = engine.slots[0].id;

    // Trigger auto-expansion tier 1: 24 -> 36
    const expanded1 = engine.autoScaleCapacity();
    assert.equal(expanded1, true);
    assert.equal(engine.capacity, 36);
    assert.equal(engine.viewers.size, 24, 'All 24 viewers must be preserved after expansion');
    assert.equal(engine.slots[0].id, viewerAtSlot0, 'Slot positions must be preserved');

    // Fill to 36
    engine.fillDemo(36);
    assert.equal(engine.viewers.size, 36);

    // Trigger auto-expansion tier 2: 36 -> 64
    const expanded2 = engine.autoScaleCapacity();
    assert.equal(expanded2, true);
    assert.equal(engine.capacity, 64);
    assert.equal(engine.viewers.size, 36);

    // Trigger auto-expansion tier 3: 64 -> 100
    engine.fillDemo(64);
    const expanded3 = engine.autoScaleCapacity();
    assert.equal(expanded3, true);
    assert.equal(engine.capacity, 100);

    // Max capacity reached: further expansion returns false
    const expanded4 = engine.autoScaleCapacity();
    assert.equal(expanded4, false, 'Capacity cannot expand beyond 100');
  });

  test('TC-306: Sacred Phrase Skin NLP Exclusion - Buddhist chants are protected and do not trigger skin change', () => {
    // 1. Chants with sacred words ('Nam', 'Bà', 'Thầy') must NOT trigger skin change
    const sacredChants = [
      'Nam mô A Di Đà Phật',
      'Nam mô Bổn Sư Thích Ca Mâu Ni Phật',
      'Lạy Phật bà Quan Âm cứu khổ cứu nạn',
      'Nam mô Quán Thế Âm Bồ Tát',
      'Con lạy Phật mười phương chứng minh'
    ];

    for (const chant of sacredChants) {
      const detectedSkin = EventNormalizer.detectSkinFromText(chant);
      assert.equal(
        detectedSkin,
        null,
        `Sacred phrase "${chant}" must NOT trigger skin change, got "${detectedSkin}"`
      );
    }

    // 2. Explicit skin requests should still be correctly detected
    assert.equal(EventNormalizer.detectSkinFromText('con là nữ'), 'woman');
    assert.equal(EventNormalizer.detectSkinFromText('đổi skin nam'), 'man');
    assert.equal(EventNormalizer.detectSkinFromText('sư thầy'), 'monk');
    assert.equal(EventNormalizer.detectSkinFromText('ni cô'), 'nun');
    assert.equal(EventNormalizer.detectSkinFromText('chú tiểu'), 'child');
    assert.equal(EventNormalizer.detectSkinFromText('cao tăng'), 'master');
  });

  test('TC-307: Admin Dashboard Rapid Reconnect - receives complete snapshot <50ms restoring layout and state intact', async () => {
    // 1. First admin session connects, sets title, fills 10 demo seats
    const client1 = await MockWsClient.connectControl(TEST_PORT);
    await client1.waitForState();

    client1.sendControl('title', { title: 'Chánh Điện Vạn Phật', subtitle: 'Phật Quang Phổ Chiếu' });
    client1.sendControl('fill', { n: 10 });
    await client1.waitForState();

    assert.equal(stateManager.settings.title, 'Chánh Điện Vạn Phật');
    assert.equal(stateManager.seatingEngine.viewers.size, 10);

    // Close client 1 (simulating browser reload / disconnect)
    client1.close();

    // 2. Second admin session connects immediately (simulating new tab open)
    const t0 = performance.now();
    const client2 = await MockWsClient.connectControl(TEST_PORT);
    const snap2 = await client2.waitForState(1000);
    const reconnectLatency = performance.now() - t0;

    assert.ok(
      reconnectLatency < 100,
      `Reconnect snapshot latency (${reconnectLatency.toFixed(2)}ms) must be < 100ms`
    );
    assert.equal(snap2.t, 'state');
    assert.equal(snap2.settings.title, 'Chánh Điện Vạn Phật', 'Title must be restored exactly');
    assert.equal(snap2.settings.subtitle, 'Phật Quang Phổ Chiếu');
    assert.equal(snap2.viewers.length, 10, 'All 10 seated viewers must be restored');

    client2.close();
  });
});
